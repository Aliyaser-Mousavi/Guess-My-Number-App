// ==============================================================================
// Service: CoachEngine.ts
// Description: Core mathematical Strategy Coach Engine, analyzing historical games,
//              generating grounded personalized diagnostics, and synthesizing
//              tailored practice drills and intelligent daily logic challenges.
// ==============================================================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import type { DifficultyId, GameMode, GameHistoryRecord } from "@/types/game";
import type {
  CoachEvaluationReport,
  IntelligentDailyChallenge,
  PersonalizedRecommendation,
  StrategyStrengthKey,
  StrategyWeaknessKey,
  TacticalMetricBreakdown,
  TailoredPracticeChallenge,
} from "@/types/coach";

const COACH_STORAGE_KEY = "@gmn/coach_evaluation_v1";

export class CoachEngine {
  /**
   * Analyzes an array of historical games and generates a comprehensive tactical report.
   */
  static evaluateGameplayHistory(history: GameHistoryRecord[]): CoachEvaluationReport {
    const validGames = (history || []).filter(
      (g) => g && g.guesses && g.guesses.length > 0,
    );

    if (validGames.length === 0) {
      return this.getDefaultReport();
    }

    let totalGuesses = 0;
    let suboptimalGuesses = 0;
    let boundaryWasteGuesses = 0;
    let redundantGuesses = 0;
    let totalElapsedSeconds = 0;
    let totalHintsUsed = 0;

    const diffStats: Record<DifficultyId, { played: number; won: number }> = {
      easy: { played: 0, won: 0 },
      medium: { played: 0, won: 0 },
      hard: { played: 0, won: 0 },
      expert: { played: 0, won: 0 },
    };

    const modeStats: Partial<Record<GameMode, { played: number; won: number }>> = {};

    // Analyze individual games
    for (const game of validGames) {
      const guesses = game.guesses;
      totalGuesses += guesses.length;
      totalHintsUsed += game.hintsUsed || 0;
      totalElapsedSeconds += (game.elapsedMs || 0) / 1000;

      // Track difficulty winrates
      const diff = (game.difficulty as DifficultyId) || "medium";
      if (diffStats[diff]) {
        diffStats[diff].played += 1;
        if (game.won) diffStats[diff].won += 1;
      }

      // Track mode winrates
      const mode = game.mode || "player";
      if (!modeStats[mode]) {
        modeStats[mode] = { played: 0, won: 0 };
      }
      modeStats[mode]!.played += 1;
      if (game.won) modeStats[mode]!.won += 1;

      // Bound analysis simulation per game
      const min = game.minRange ?? 1;
      const max = game.maxRange ?? (diff === "easy" ? 50 : diff === "hard" ? 500 : diff === "expert" ? 1000 : 100);
      const secret = game.secretNumber ?? game.userNumber;

      let currentLow = min;
      let currentHigh = max;
      const seenGuesses = new Set<number>();

      for (const g of guesses) {
        if (seenGuesses.has(g)) {
          redundantGuesses += 1;
        }
        seenGuesses.add(g);

        // Boundary violation check
        if (g < currentLow || g > currentHigh) {
          boundaryWasteGuesses += 1;
        }

        // Suboptimal bisection check: midpoint vs guessed
        const midpoint = Math.floor((currentLow + currentHigh) / 2);
        const rangeSpan = Math.max(1, currentHigh - currentLow + 1);
        const deviationRatio = Math.abs(g - midpoint) / (rangeSpan / 2);

        // If deviation from optimal midpoint exceeds 40% of the active interval half
        if (deviationRatio > 0.40 && g !== secret) {
          suboptimalGuesses += 1;
        }

        // Shrink bounds for subsequent simulation
        if (secret != null) {
          if (g < secret) {
            currentLow = Math.max(currentLow, g + 1);
          } else if (g > secret) {
            currentHigh = Math.min(currentHigh, g - 1);
          }
        }
      }
    }

    const suboptimalGuessRate =
      totalGuesses > 0 ? (suboptimalGuesses / totalGuesses) * 100 : 0;
    const boundaryWasteRate =
      totalGuesses > 0 ? (boundaryWasteGuesses / totalGuesses) * 100 : 0;
    const averageSecondsPerGuess =
      totalGuesses > 0 ? totalElapsedSeconds / totalGuesses : 0;
    const hintRelianceRatio =
      validGames.length > 0 ? totalHintsUsed / validGames.length : 0;

    // Difficulty win rates
    const winRateByDifficulty: Record<DifficultyId, number> = {
      easy: diffStats.easy.played ? Math.round((diffStats.easy.won / diffStats.easy.played) * 100) : 100,
      medium: diffStats.medium.played ? Math.round((diffStats.medium.won / diffStats.medium.played) * 100) : 100,
      hard: diffStats.hard.played ? Math.round((diffStats.hard.won / diffStats.hard.played) * 100) : 80,
      expert: diffStats.expert.played ? Math.round((diffStats.expert.won / diffStats.expert.played) * 100) : 60,
    };

    const winRateByMode: Partial<Record<GameMode, number>> = {};
    for (const [m, stat] of Object.entries(modeStats)) {
      if (stat && stat.played > 0) {
        winRateByMode[m as GameMode] = Math.round((stat.won / stat.played) * 100);
      }
    }

    const lowTierWinRate = (winRateByDifficulty.easy + winRateByDifficulty.medium) / 2;
    const highTierWinRate = (winRateByDifficulty.hard + winRateByDifficulty.expert) / 2;
    const difficultyDropOffRate = Math.max(0, Math.round(lowTierWinRate - highTierWinRate));

    // Compute Overall Efficiency Score (0 - 100)
    // Formula: Base 100 - penalties for suboptimal, boundary waste, excessive hints, and difficulty choke
    let efficiencyScore = 100;
    efficiencyScore -= suboptimalGuessRate * 0.45; // Max -45
    efficiencyScore -= boundaryWasteRate * 0.60; // Max -60
    efficiencyScore -= Math.min(20, hintRelianceRatio * 10); // Max -20
    efficiencyScore -= Math.min(15, difficultyDropOffRate * 0.25); // Max -15
    efficiencyScore = Math.max(10, Math.min(100, Math.round(efficiencyScore)));

    // Calculate historical trend by comparing last 5 games vs earlier games
    let historicalEfficiencyTrend = 0;
    if (validGames.length >= 6) {
      const recentSlice = validGames.slice(-5);
      const recentReport = this.evaluateGameplayHistory(recentSlice);
      historicalEfficiencyTrend = recentReport.efficiencyScore - efficiencyScore;
    }

    const metrics: TacticalMetricBreakdown = {
      totalAnalyzedGames: validGames.length,
      totalAnalyzedGuesses: totalGuesses,
      overallEfficiencyScore: efficiencyScore,
      historicalEfficiencyTrend,
      suboptimalGuessRate: Math.round(suboptimalGuessRate),
      boundaryWasteRate: Math.round(boundaryWasteRate),
      redundantGuessCount: redundantGuesses,
      averageSecondsPerGuess: Math.round(averageSecondsPerGuess * 10) / 10,
      hintRelianceRatio: Math.round(hintRelianceRatio * 10) / 10,
      winRateByDifficulty,
      winRateByMode,
      difficultyDropOffRate,
    };

    // Synthesize Strengths, Weaknesses & Grounded Recommendations
    const strengths: CoachEvaluationReport["strengths"] = [];
    const weaknesses: CoachEvaluationReport["weaknesses"] = [];
    const recommendations: PersonalizedRecommendation[] = [];

    // 1. Bisection Evaluation
    if (metrics.suboptimalGuessRate > 35) {
      weaknesses.push({
        key: "bisection_deviation",
        title: "Suboptimal Interval Halving",
        description: `${metrics.suboptimalGuessRate}% of your attempts deviate from the optimal binary midpoint, increasing round count.`,
      });
      recommendations.push({
        id: "rec_bisection",
        category: "bisection",
        severity: "critical",
        title: "Calibrate Midpoint Bisection",
        diagnosis: `You frequently guess near edges rather than bisecting the active interval. This yields as low as 10-20% information gain instead of a clean 50% split.`,
        tacticalPrescription: `Calculate floor((L + H) / 2) before submitting. Every guess must split the unknown candidates in half.`,
        recommendedAcademyModuleId: "module_intermediate",
        recommendedAcademyLessonId: "lesson_binary_intro",
      });
    } else {
      strengths.push({
        key: "binary_search_mastery",
        title: "Binary Search Discipline",
        description: `Over ${100 - metrics.suboptimalGuessRate}% of your guesses strictly adhere to the mathematical midpoint.`,
      });
    }

    // 2. Boundary Waste Evaluation
    if (metrics.boundaryWasteRate > 10 || metrics.redundantGuessCount > 1) {
      weaknesses.push({
        key: "boundary_waste",
        title: "Wasted Boundary Attempts",
        description: `${metrics.boundaryWasteRate}% of your guesses were outside known bounds or repeated already tested numbers.`,
      });
      recommendations.push({
        id: "rec_boundary",
        category: "boundaries",
        severity: "critical",
        title: "Enforce Boundary Discipline",
        diagnosis: `Submitting numbers outside [Low, High] wastes turns and guarantees zero information gain.`,
        tacticalPrescription: `Confirm that Low ≤ Guess ≤ High before tapping submit. Let earlier feedback eliminate bounds permanently.`,
        recommendedAcademyModuleId: "module_beginner",
        recommendedAcademyLessonId: "lesson_bounds_101",
      });
    } else {
      strengths.push({
        key: "flawless_boundaries",
        title: "Impenetrable Interval Tracking",
        description: `Virtually zero attempts wasted outside known bounds or repeated.`,
      });
    }

    // 3. Hint Usage Evaluation
    if (metrics.hintRelianceRatio > 1.2) {
      weaknesses.push({
        key: "hint_overreliance",
        title: "Hint Over-reliance",
        description: `Averaging ${metrics.hintRelianceRatio} hints per game reduces autonomous deduction accuracy.`,
      });
      recommendations.push({
        id: "rec_hints",
        category: "hints",
        severity: "warning",
        title: "Wean Off Clue Crutches",
        diagnosis: `Hints yield high certainty but mask fundamental bisection inefficiencies.`,
        tacticalPrescription: `Reserve hints only when at ≤2 lives remaining. Train yourself to narrow intervals using pure parity logic first.`,
        recommendedAcademyModuleId: "module_advanced",
        recommendedAcademyLessonId: "lesson_parity_clues",
      });
    } else {
      strengths.push({
        key: "clue_independence",
        title: "Pure Analytical Independence",
        description: `Excellent self-reliance with minimal or zero hint crutches during high-stakes games.`,
      });
    }

    // 4. Tempo / Time Allocation
    if (metrics.averageSecondsPerGuess > 0 && metrics.averageSecondsPerGuess < 1.8) {
      weaknesses.push({
        key: "rushed_execution",
        title: "Rushed Execution",
        description: `Averaging ${metrics.averageSecondsPerGuess}s per guess indicates impulse submission over deliberate calculation.`,
      });
      recommendations.push({
        id: "rec_tempo",
        category: "tempo",
        severity: "warning",
        title: "Adopt 3-Second Verification Pause",
        diagnosis: `Rushing causes accidental duplicate guesses and off-by-one boundary slips.`,
        tacticalPrescription: `Take 3 seconds to mental-check the arithmetic before committing any guess in ranked matches.`,
      });
    } else if (metrics.averageSecondsPerGuess > 10.0) {
      weaknesses.push({
        key: "analysis_paralysis",
        title: "Analysis Hesitation",
        description: `Averaging ${metrics.averageSecondsPerGuess}s per guess risks timeouts in blitz and multiplayer 1v1.`,
      });
      recommendations.push({
        id: "rec_speed",
        category: "tempo",
        severity: "warning",
        title: "Drill Rapid Bisection Arithmetic",
        diagnosis: `Hesitation in dividing numbers slows down your tempo under pressure.`,
        tacticalPrescription: `Practice speed midpoint drills in the Academy Practice Lab to make halving second nature.`,
        recommendedAcademyModuleId: "module_intermediate",
        recommendedAcademyLessonId: "lesson_binary_intro",
      });
    } else {
      strengths.push({
        key: "calm_tempo",
        title: "Measured Analytical Tempo",
        description: `Balanced pacing averaging ${metrics.averageSecondsPerGuess}s per decision.`,
      });
    }

    // 5. Difficulty Asymmetry Evaluation
    if (metrics.difficultyDropOffRate > 30) {
      weaknesses.push({
        key: "high_difficulty_choke",
        title: "Large-Range Performance Gap",
        description: `Win rate drops by ${metrics.difficultyDropOffRate}% when transitioning from Easy/Medium to Hard/Expert.`,
      });
      recommendations.push({
        id: "rec_difficulty",
        category: "difficulty",
        severity: "warning",
        title: "Scale to Large-Domain Intervals",
        diagnosis: `Larger domains (1–500 or 1–1000) require logarithmic scaling rather than linear estimation.`,
        tacticalPrescription: `Master log2(1000) ≈ 10 step boundaries. Hard difficulty simply requires 2 more cuts than Easy.`,
        recommendedAcademyModuleId: "module_advanced",
        recommendedAcademyLessonId: "lesson_information_entropy",
      });
    }

    const efficiencyRankTitle = this.getEfficiencyRankTitle(efficiencyScore);
    const coachingSummary = this.synthesizeSummary(metrics, efficiencyScore, efficiencyRankTitle);

    return {
      generatedAt: new Date().toISOString(),
      efficiencyScore,
      efficiencyRankTitle,
      metrics,
      strengths,
      weaknesses,
      recommendations,
      coachingSummary,
    };
  }

  /**
   * Generates tailored drills targeting the player's primary identified weakness.
   */
  static generateTailoredChallenges(report: CoachEvaluationReport): TailoredPracticeChallenge[] {
    const primaryWeakness = report.weaknesses[0]?.key || "bisection_deviation";

    const drills: TailoredPracticeChallenge[] = [];

    // Drill 1: Targeted at primary weakness
    if (primaryWeakness === "bisection_deviation") {
      drills.push({
        id: "drill_bisection_focus",
        title: "Bisection Focus: Strict Centurion",
        description: "Find a target in [1, 100] using at most 7 attempts. Every guess must fall strictly within the exact midpoint ±2.",
        targetedWeakness: "bisection_deviation",
        range: { min: 1, max: 100 },
        secretNumber: 68,
        maxAttempts: 7,
        rewardXp: 300,
        tacticalBrief: "Focus on dividing the active interval in half on every attempt: 50 -> 75 -> 62 -> 68.",
      });
    } else if (primaryWeakness === "boundary_waste") {
      drills.push({
        id: "drill_boundary_lock",
        title: "Zero Waste Boundary Lock",
        description: "Solve in [1, 250] in 8 attempts. Any guess outside the active boundaries results in immediate failure.",
        targetedWeakness: "boundary_waste",
        range: { min: 1, max: 250 },
        secretNumber: 142,
        maxAttempts: 8,
        rewardXp: 350,
        tacticalBrief: "Maintain strict bounds. Never guess outside the highest LOW or lowest HIGH.",
      });
    } else if (primaryWeakness === "hint_overreliance") {
      drills.push({
        id: "drill_no_hints_allowed",
        title: "Dark Oracle: Pure Deduction",
        description: "Solve [1, 150] in 8 attempts with ZERO hints permitted.",
        targetedWeakness: "hint_overreliance",
        range: { min: 1, max: 150 },
        secretNumber: 97,
        maxAttempts: 8,
        rewardXp: 400,
        tacticalBrief: "No clues or safety nets. Trust your mathematical bisection algorithm.",
      });
    } else if (primaryWeakness === "rushed_execution") {
      drills.push({
        id: "drill_deliberate_tactician",
        title: "Deliberate Tactician: Controlled Pacing",
        description: "Solve [1, 200] in 8 attempts. Take your time to calculate exact medians.",
        targetedWeakness: "rushed_execution",
        range: { min: 1, max: 200 },
        secretNumber: 123,
        maxAttempts: 8,
        rewardXp: 300,
        tacticalBrief: "Slow is smooth, smooth is fast. Verify intervals before tapping confirm.",
      });
    } else {
      drills.push({
        id: "drill_large_domain",
        title: "Domain Mastery: Millennial Bisection",
        description: "Solve in [1, 1000] in at most 10 attempts. Perfect log2 scaling.",
        targetedWeakness: "high_difficulty_choke",
        range: { min: 1, max: 1000 },
        secretNumber: 742,
        maxAttempts: 10,
        rewardXp: 500,
        tacticalBrief: "1000 candidates requires only 10 cuts: 500, 750, 625, 688, 719, 735, 743, 739, 741, 742.",
      });
    }

    // Drill 2: Constrained Parity Drill
    drills.push({
      id: "drill_constrained_parity",
      title: "Parity Infiltration Protocol",
      description: "Solve an EVEN target in [1, 300] within 8 attempts. Odd guesses yield 0 progress.",
      targetedWeakness: "bisection_deviation",
      range: { min: 1, max: 300 },
      secretNumber: 184,
      maxAttempts: 8,
      constraints: [
        { type: "parity", description: "Target is strictly EVEN", ruleValue: 2 },
      ],
      rewardXp: 400,
      tacticalBrief: "When the midpoint is odd, round to the nearest even number.",
    });

    // Drill 3: Blitz Tempo Drill
    drills.push({
      id: "drill_speed_bisection",
      title: "Rapid Response: 25-Second Blitz",
      description: "Solve [1, 100] in at most 7 attempts under a strict 25-second countdown timer.",
      targetedWeakness: "analysis_paralysis",
      range: { min: 1, max: 100 },
      secretNumber: 39,
      maxAttempts: 7,
      timeLimitSeconds: 25,
      rewardXp: 450,
      tacticalBrief: "Fast arithmetic without sacrificing interval halving.",
    });

    return drills;
  }

  /**
   * Generates a deterministic Intelligent Daily Logic Challenge based on UTC date seed.
   */
  static getIntelligentDailyChallenge(dateOverride?: string): IntelligentDailyChallenge {
    const todayStr = dateOverride || new Date().toISOString().split("T")[0];
    const seed = this.hashDateString(todayStr);

    const min = 1;
    const max = 200 + (seed % 100); // 200 - 300 range

    // Deterministic secret within range
    const isEvenRule = seed % 2 === 0;
    let secret = min + (seed % (max - min));
    if (isEvenRule && secret % 2 !== 0) {
      secret += 1;
      if (secret > max) secret -= 2;
    }

    const specialRules: string[] = [];
    const constraints: IntelligentDailyChallenge["constraints"] = [];

    if (isEvenRule) {
      specialRules.push("Target is strictly an EVEN integer.");
      constraints.push({
        type: "parity",
        description: "Target is strictly EVEN",
        ruleValue: 2,
      });
    } else {
      specialRules.push("Target is strictly an ODD integer.");
      constraints.push({
        type: "parity",
        description: "Target is strictly ODD",
        ruleValue: 1,
      });
    }

    if (seed % 3 === 0) {
      specialRules.push("Zero hints permitted (Dark Oracle mode).");
    } else {
      specialRules.push("Strict budget of 1 tactical hint.");
    }

    return {
      dateStr: todayStr,
      title: `Intelligent Challenge #${todayStr.replace(/-/g, "")}`,
      description: `Today's algorithmic puzzle tests bounded logic across [${min}, ${max}] with verified rule constraints.`,
      range: { min, max },
      secretNumber: secret,
      maxAttempts: 8,
      timeLimitSeconds: 60,
      specialRules,
      constraints,
      hintBudget: seed % 3 === 0 ? 0 : 1,
      rewardXp: 350,
    };
  }

  /**
   * Persists coach evaluation report to local storage and attempts cloud sync.
   */
  static async saveReport(report: CoachEvaluationReport): Promise<void> {
    try {
      await AsyncStorage.setItem(COACH_STORAGE_KEY, JSON.stringify(report));

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("coach_evaluations").insert({
          user_id: user.id,
          efficiency_score: report.efficiencyScore,
          suboptimal_guess_rate: report.metrics.suboptimalGuessRate,
          boundary_waste_rate: report.metrics.boundaryWasteRate,
          average_seconds_per_guess: report.metrics.averageSecondsPerGuess,
          hint_reliance_ratio: report.metrics.hintRelianceRatio,
          recommendations_json: report.recommendations,
          coaching_summary: report.coachingSummary,
        });
      }
    } catch {
      // Offline fallback: silent catch
    }
  }

  /**
   * Loads saved coach evaluation report from local storage.
   */
  static async loadSavedReport(): Promise<CoachEvaluationReport | null> {
    try {
      const raw = await AsyncStorage.getItem(COACH_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------

  private static getEfficiencyRankTitle(score: number): string {
    if (score >= 90) return "Master Strategist";
    if (score >= 78) return "Tactical Analyst";
    if (score >= 65) return "Adaptive Guesser";
    if (score >= 50) return "Developing Tactician";
    return "Intuitive Guesser";
  }

  private static synthesizeSummary(
    metrics: TacticalMetricBreakdown,
    score: number,
    rank: string,
  ): string {
    if (metrics.totalAnalyzedGames === 0) {
      return "Complete your first few matches to generate actionable strategy telemetry.";
    }

    return `Evaluated across ${metrics.totalAnalyzedGames} game(s) and ${metrics.totalAnalyzedGuesses} guess(es). Current standing is "${rank}" (${score}/100 efficiency). Primary efficiency drag: ${
      metrics.boundaryWasteRate > 10
        ? "out-of-bounds guesses"
        : metrics.suboptimalGuessRate > 30
        ? "interval bisection deviation"
        : metrics.hintRelianceRatio > 1.5
        ? "hint dependency"
        : "large-domain variance"
    }.`;
  }

  private static getDefaultReport(): CoachEvaluationReport {
    return {
      generatedAt: new Date().toISOString(),
      efficiencyScore: 80,
      efficiencyRankTitle: "Developing Tactician",
      metrics: {
        totalAnalyzedGames: 0,
        totalAnalyzedGuesses: 0,
        overallEfficiencyScore: 80,
        historicalEfficiencyTrend: 0,
        suboptimalGuessRate: 15,
        boundaryWasteRate: 0,
        redundantGuessCount: 0,
        averageSecondsPerGuess: 3.2,
        hintRelianceRatio: 0.5,
        winRateByDifficulty: { easy: 100, medium: 90, hard: 75, expert: 50 },
        winRateByMode: { player: 100 },
        difficultyDropOffRate: 20,
      },
      strengths: [
        {
          key: "flawless_boundaries",
          title: "Clean Boundary Awareness",
          description: "No historical record of out-of-interval waste.",
        },
      ],
      weaknesses: [
        {
          key: "bisection_deviation",
          title: "Bisection Calibration",
          description: "Sharpen interval halving on domains larger than 100.",
        },
      ],
      recommendations: [
        {
          id: "rec_starter",
          category: "bisection",
          severity: "warning",
          title: "Play Academy Curriculum Module 2",
          diagnosis: "Bisection efficiency is the single greatest predictor of competitive rank.",
          tacticalPrescription: "Practice interval halving in Number Academy to cement logarithmic reasoning.",
          recommendedAcademyModuleId: "module_intermediate",
          recommendedAcademyLessonId: "lesson_binary_intro",
        },
      ],
      coachingSummary:
        "Play a few standard or ranked matches to unlock customized, deep tactical analytics.",
    };
  }

  private static hashDateString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

