import {
  DIFFICULTIES,
  MODE_METADATA,
  getDifficulty,
  idealRounds,
  type DifficultyId,
  type GameMode,
} from "@/constants/gameConfig";
import type {
  DailyChallengeRecord,
  GameHistoryRecord,
  GameResult,
  PersonalBests,
  PlayerStats,
  PostGameAnalysis,
} from "../../types/game";

export class AnalyticsService {
  /**
   * Compiles Personal Bests across all game modes, difficulties, and overall milestones.
   */
  static calculatePersonalBests(
    history: GameHistoryRecord[],
    stats: PlayerStats,
  ): PersonalBests {
    let overallFastest: number | null = stats.fastestWinMs ?? null;
    let overallHighest = stats.bestScore ?? 0;
    let overallLowest: number | null = stats.bestRounds ?? null;

    let bestSurvivalRounds = 0;
    let bestSurvivalScore = 0;
    let bestBlitzScore = 0;
    let bestBlitzSolved = 0;

    const byMode: PersonalBests["byMode"] = {};
    const byDifficulty: PersonalBests["byDifficulty"] = {};

    // Initialize mode maps
    for (const m of MODE_METADATA) {
      byMode[m.id] = {
        gamesPlayed: 0,
        gamesWon: 0,
        highestScore: 0,
        fastestWinMs: null,
        lowestGuesses: null,
        avgRounds: 0,
      };
    }

    // Initialize difficulty maps
    for (const d of DIFFICULTIES) {
      byDifficulty[d.id] = {
        gamesPlayed: 0,
        gamesWon: 0,
        highestScore: 0,
        fastestWinMs: null,
        lowestGuesses: null,
        avgRounds: 0,
      };
    }

    const totalRoundsByMode: Record<string, number> = {};
    const totalRoundsByDiff: Record<string, number> = {};

    // Aggregate from persistent history
    for (const rec of history) {
      // Overall bests
      overallHighest = Math.max(overallHighest, rec.score);
      if (rec.won) {
        if (rec.elapsedMs > 0) {
          overallFastest =
            overallFastest == null
              ? rec.elapsedMs
              : Math.min(overallFastest, rec.elapsedMs);
        }
        overallLowest =
          overallLowest == null ? rec.rounds : Math.min(overallLowest, rec.rounds);
      }

      // Mode-specific milestones
      if (rec.mode === "survival") {
        bestSurvivalRounds = Math.max(bestSurvivalRounds, rec.rounds);
        bestSurvivalScore = Math.max(bestSurvivalScore, rec.score);
      } else if (rec.mode === "blitz") {
        bestBlitzScore = Math.max(bestBlitzScore, rec.score);
        bestBlitzSolved = Math.max(bestBlitzSolved, rec.rounds);
      }

      // Mode stats
      const mStat = byMode[rec.mode];
      if (mStat) {
        mStat.gamesPlayed += 1;
        if (rec.won) mStat.gamesWon += 1;
        mStat.highestScore = Math.max(mStat.highestScore, rec.score);
        if (rec.won) {
          if (rec.elapsedMs > 0) {
            mStat.fastestWinMs =
              mStat.fastestWinMs == null
                ? rec.elapsedMs
                : Math.min(mStat.fastestWinMs, rec.elapsedMs);
          }
          mStat.lowestGuesses =
            mStat.lowestGuesses == null
              ? rec.rounds
              : Math.min(mStat.lowestGuesses, rec.rounds);
        }
        totalRoundsByMode[rec.mode] =
          (totalRoundsByMode[rec.mode] ?? 0) + rec.rounds;
      }

      // Difficulty stats
      const dStat = byDifficulty[rec.difficulty];
      if (dStat) {
        dStat.gamesPlayed += 1;
        if (rec.won) dStat.gamesWon += 1;
        dStat.highestScore = Math.max(dStat.highestScore, rec.score);
        if (rec.won) {
          if (rec.elapsedMs > 0) {
            dStat.fastestWinMs =
              dStat.fastestWinMs == null
                ? rec.elapsedMs
                : Math.min(dStat.fastestWinMs, rec.elapsedMs);
          }
          dStat.lowestGuesses =
            dStat.lowestGuesses == null
              ? rec.rounds
              : Math.min(dStat.lowestGuesses, rec.rounds);
        }
        totalRoundsByDiff[rec.difficulty] =
          (totalRoundsByDiff[rec.difficulty] ?? 0) + rec.rounds;
      }
    }

    // Compute averages
    for (const m of MODE_METADATA) {
      const st = byMode[m.id];
      if (st && st.gamesPlayed > 0) {
        st.avgRounds = +(totalRoundsByMode[m.id] / st.gamesPlayed).toFixed(1);
      }
    }
    for (const d of DIFFICULTIES) {
      const st = byDifficulty[d.id];
      if (st && st.gamesPlayed > 0) {
        st.avgRounds = +(totalRoundsByDiff[d.id] / st.gamesPlayed).toFixed(1);
      }
    }

    // Merge fallback bestScores from stats for backward compatibility
    for (const [key, sc] of Object.entries(stats.bestScores)) {
      const [m, d] = key.split("-") as [GameMode, DifficultyId];
      if (byMode[m] && (sc ?? 0) > byMode[m]!.highestScore) {
        byMode[m]!.highestScore = sc ?? 0;
      }
      if (byDifficulty[d] && (sc ?? 0) > byDifficulty[d]!.highestScore) {
        byDifficulty[d]!.highestScore = sc ?? 0;
      }
    }

    return {
      fastestWinMs: overallFastest,
      highestScore: overallHighest,
      lowestGuesses: overallLowest,
      bestSurvivalRounds,
      bestSurvivalScore,
      bestBlitzScore,
      bestBlitzSolved,
      byMode,
      byDifficulty,
    };
  }

  /**
   * Calculates win rate trend over the last N groups of games.
   */
  static calculateWinRateTrend(
    history: GameHistoryRecord[],
    bucketSize = 5,
  ): { label: string; winRate: number; total: number }[] {
    if (history.length === 0) return [];

    const chronological = [...history].reverse();
    const buckets: { label: string; winRate: number; total: number }[] = [];

    for (let i = 0; i < chronological.length; i += bucketSize) {
      const slice = chronological.slice(i, i + bucketSize);
      const wins = slice.filter((r) => r.won).length;
      const rate = Math.round((wins / slice.length) * 100);
      const startIdx = i + 1;
      const endIdx = i + slice.length;
      buckets.push({
        label: `G${startIdx}-${endIdx}`,
        winRate: rate,
        total: slice.length,
      });
    }

    return buckets.slice(-6); // Keep up to last 6 buckets
  }

  /**
   * Calculates games played per week over the last 4 weeks.
   */
  static calculateWeeklyActivity(
    history: GameHistoryRecord[],
  ): { label: string; count: number }[] {
    const oneDay = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const weeks: { label: string; count: number }[] = [
      { label: "3w ago", count: 0 },
      { label: "2w ago", count: 0 },
      { label: "Last wk", count: 0 },
      { label: "This wk", count: 0 },
    ];

    for (const rec of history) {
      const daysAgo = Math.floor((now - rec.timestamp) / oneDay);
      if (daysAgo < 7) {
        weeks[3].count += 1;
      } else if (daysAgo < 14) {
        weeks[2].count += 1;
      } else if (daysAgo < 21) {
        weeks[1].count += 1;
      } else if (daysAgo < 28) {
        weeks[0].count += 1;
      }
    }

    return weeks;
  }

  /**
   * Calculates games played by day of the week (Mon-Sun).
   */
  static calculateDayOfWeekActivity(
    history: GameHistoryRecord[],
  ): { day: string; count: number }[] {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = [0, 0, 0, 0, 0, 0, 0];

    for (const rec of history) {
      const d = new Date(rec.timestamp).getDay();
      counts[d] += 1;
    }

    // Rearrange starting from Monday
    const orderedIndices = [1, 2, 3, 4, 5, 6, 0];
    return orderedIndices.map((idx) => ({
      day: days[idx],
      count: counts[idx],
    }));
  }

  /**
   * Calculates recent score history for trend charting.
   */
  static calculateRecentScores(
    history: GameHistoryRecord[],
    limit = 10,
  ): { label: string; score: number; won: boolean }[] {
    const recent = history.slice(0, limit).reverse();
    return recent.map((r, i) => ({
      label: `#${i + 1}`,
      score: r.score,
      won: r.won,
    }));
  }

  /**
   * Calculates streak calendar metadata from persistent history.
   */
  static calculateStreakCalendarData(
    history: GameHistoryRecord[],
    dailyHistory: Record<string, DailyChallengeRecord>,
  ) {
    const activeDates = new Set<string>();
    const dailyCompletedDates = new Set<string>();

    for (const rec of history) {
      const d = new Date(rec.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      activeDates.add(key);
    }

    for (const [dateStr, rec] of Object.entries(dailyHistory)) {
      if (rec.completed) {
        // Format as YYYY-MM-DD
        const parts = dateStr.split("-");
        if (parts.length === 3) {
          const key = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
          dailyCompletedDates.add(key);
        }
      }
    }

    // Calculate streaks
    const sortedDates = Array.from(activeDates).sort();
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    const todayStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();

    const yesterdayStr = (() => {
      const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();

    // Evaluate consecutive dates
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prev = new Date(sortedDates[i - 1]).getTime();
        const curr = new Date(sortedDates[i]).getTime();
        const diffDays = Math.round((curr - prev) / (24 * 60 * 60 * 1000));
        if (diffDays === 1) {
          tempStreak += 1;
        } else {
          tempStreak = 1;
        }
      }
      bestStreak = Math.max(bestStreak, tempStreak);
    }

    // If played today or yesterday, streak is currently active
    if (activeDates.has(todayStr) || activeDates.has(yesterdayStr)) {
      currentStreak = tempStreak;
    } else {
      currentStreak = 0;
    }

    return {
      activeDates,
      dailyCompletedDates,
      currentStreak,
      bestStreak,
      totalActiveDays: activeDates.size,
    };
  }

  /**
   * Generates a rigorous post-game mathematical analysis based strictly on actual game data.
   */
  static analyzePostGame(result: GameResult): PostGameAnalysis {
    const diff = getDifficulty(result.difficulty);
    const optimal = idealRounds(diff.min, diff.max);
    const actual = Math.max(result.rounds, 1);

    // Calculate binary search efficiency
    // Optimal = 100%, each extra round scales efficiency down smoothly
    const rawEfficiency = (optimal / actual) * 100;
    const hintPenalty = result.hintsUsed * 6;
    const efficiencyScore = Math.min(
      100,
      Math.max(15, Math.round(rawEfficiency - hintPenalty)),
    );

    let efficiencyLabel = "Wild Guesser";
    if (efficiencyScore >= 90) efficiencyLabel = "Binary Search Master";
    else if (efficiencyScore >= 75) efficiencyLabel = "Sharp Strategist";
    else if (efficiencyScore >= 60) efficiencyLabel = "Calculated Deduction";
    else if (efficiencyScore >= 40) efficiencyLabel = "Intuitive Explorer";

    const highlights: string[] = [];
    const suggestions: string[] = [];

    // Derive genuine data-driven highlights
    if (result.won) {
      if (actual <= optimal) {
        highlights.push(
          `Matched or beat theoretical optimal of ${optimal} rounds!`,
        );
      } else {
        highlights.push(`Successfully narrowed down the number in ${actual} attempts.`);
      }

      if (result.hintsUsed === 0) {
        highlights.push("Flawless run: Zero hints used for full score multiplier!");
      }

      if (result.elapsedMs > 0 && result.elapsedMs < 20000) {
        highlights.push(
          `Lightning response: completed in ${(result.elapsedMs / 1000).toFixed(1)}s!`,
        );
      }

      if (result.score >= 1000) {
        highlights.push(`High-tier score achieved: ${result.score.toLocaleString()} points.`);
      }
    } else {
      highlights.push(`Narrowed search across ${actual} rounds of data.`);
    }

    // Derive actionable suggestions
    if (actual > optimal + 2) {
      suggestions.push(
        "Try the binary bisection technique: always pick the exact midpoint between the lowest and highest boundaries to cut possibilities by 50%.",
      );
    }

    if (result.hintsUsed > 2) {
      suggestions.push(
        "Save hints for late-game ties when only a handful of numbers remain to maximize your score multiplier.",
      );
    }

    if (result.elapsedMs > 60000) {
      suggestions.push(
        "Submitting guesses faster yields substantial speed-bonus multipliers.",
      );
    }

    if (suggestions.length === 0) {
      suggestions.push(
        "Outstanding performance! Try advancing to the next difficulty level to test your skills.",
      );
    }

    return {
      efficiencyScore,
      efficiencyLabel,
      actualRounds: actual,
      optimalRounds: optimal,
      hintsUsed: result.hintsUsed,
      elapsedMs: result.elapsedMs,
      highlights,
      suggestions,
    };
  }
}

