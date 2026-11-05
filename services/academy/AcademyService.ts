// ==============================================================================
// Service: AcademyService.ts
// Description: Core mathematical strategy evaluation, curriculum catalog,
//              practice challenge generator, deterministic daily brain training,
//              and progress persistence for Group 09 - Number Academy.
// ==============================================================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import type {
  AcademyLesson,
  AcademyMasteryRank,
  AcademyModule,
  AcademyProgressState,
  DailyBrainPuzzle,
  GuessEvaluation,
  GuessOptimality,
  PracticeChallenge,
} from "@/types/academy";

const ACADEMY_STORAGE_KEY = "@gmn/academy_progress_v1";

export const DEFAULT_ACADEMY_PROGRESS: AcademyProgressState = {
  completedLessons: [],
  lessonStars: {},
  completedChallenges: [],
  challengeBests: {},
  dailyHistory: {},
  totalGuessesEvaluated: 0,
  optimalGuessesCount: 0,
  suboptimalGuessesCount: 0,
  mistakesCount: 0,
  learningScore: 0,
  lastUpdated: new Date().toISOString(),
};

export const MASTERY_RANKS: AcademyMasteryRank[] = [
  { key: "novice", title: "Academy Recruit", minLearningScore: 0, color: "#94A3B8", badge: "school-outline" },
  { key: "analyst", title: "Range Analyst", minLearningScore: 250, color: "#00D2B4", badge: "calculator-outline" },
  { key: "tactician", title: "Interval Tactician", minLearningScore: 600, color: "#3B82F6", badge: "compass-outline" },
  { key: "strategist", title: "Binary Strategist", minLearningScore: 1200, color: "#F59E0B", badge: "medal-outline" },
  { key: "grandmaster", title: "Grand Strategist", minLearningScore: 2000, color: "#A855F7", badge: "trophy" },
];

export const ACADEMY_MODULES: AcademyModule[] = [
  {
    id: "module_beginner",
    tier: "beginner",
    title: "1. Interval Elimination Fundamentals",
    description: "Understand number ranges, boundary shrinking, and eliminate redundant guesses.",
    icon: "book-outline",
    lessons: [
      {
        id: "lesson_bounds_101",
        moduleId: "module_beginner",
        tier: "beginner",
        order: 1,
        title: "Understanding Search Intervals",
        subtitle: "How boundaries establish certainty",
        summary: "Every higher/lower feedback eliminates an entire half or slice of possibilities. A number outside [Low, High] yields 0 new information.",
        mathConcept: "If the target is in [L, H] and guess G is LOW, the new interval is strictly [G + 1, H]. If HIGH, it is [L, G - 1].",
        formulaDisplay: "New Range = [G + 1, H] (if Low) or [L, G - 1] (if High)",
        rewardXp: 150,
        sandbox: {
          id: "step_bounds_1",
          instruction: "Find secret target 37 in the range [1, 50]. Narrow the boundaries without guessing outside known limits.",
          targetRange: { min: 1, max: 50 },
          secretNumber: 37,
          maxGuesses: 6,
          explanation: "Observe how each guess halves or truncates the possible integer set.",
        },
      },
      {
        id: "lesson_avoid_waste",
        moduleId: "module_beginner",
        tier: "beginner",
        order: 2,
        title: "Eliminating Wasteful Guesses",
        subtitle: "Never test already eliminated candidates",
        summary: "Guessing a number below your established Low bound or above High is a mathematical mistake that costs a life without learning anything.",
        mathConcept: "For any guess G: if G < L or G > H, Information Gain = 0 bits.",
        formulaDisplay: "Valid Guess: L <= G <= H",
        rewardXp: 180,
        sandbox: {
          id: "step_waste_1",
          instruction: "Narrow down secret target 14 in [1, 30]. Keep all guesses strictly inside the active boundary.",
          targetRange: { min: 1, max: 30 },
          secretNumber: 14,
          maxGuesses: 5,
          explanation: "Maintain strict range discipline to protect your limited lives.",
        },
      },
    ],
  },
  {
    id: "module_intermediate",
    tier: "intermediate",
    title: "2. The Bisection Method & Logarithms",
    description: "Master midpoint calculation, range halving, and theoretical attempt efficiency.",
    icon: "git-commit-outline",
    lessons: [
      {
        id: "lesson_bisection_midpoint",
        moduleId: "module_intermediate",
        tier: "intermediate",
        order: 3,
        title: "Optimal Midpoint Calculation",
        subtitle: "Maximal entropy elimination",
        summary: "Choosing the exact mathematical midpoint cuts the remaining search space in half regardless of whether the feedback is higher or lower.",
        mathConcept: "The optimal pivot is M = floor((Low + High) / 2). This guarantees the remaining range is at most floor((H - L) / 2).",
        formulaDisplay: "M = floor((L + H) / 2)",
        rewardXp: 220,
        sandbox: {
          id: "step_midpoint_1",
          instruction: "Use exact midpoint calculations to find secret 73 in [1, 100]. Check your guess vs. floor((L + H) / 2).",
          targetRange: { min: 1, max: 100 },
          secretNumber: 73,
          maxGuesses: 7,
          explanation: "Notice how [1, 100] -> [51, 100] -> [76, 100] -> [51, 74] narrows with lightning speed.",
        },
      },
      {
        id: "lesson_log2_limits",
        moduleId: "module_intermediate",
        tier: "intermediate",
        order: 4,
        title: "Theoretical Guarantees: ceil(log2 N)",
        subtitle: "Worst-case attempt bounds",
        summary: "With binary bisection, any integer in range [1, N] can be discovered in at most ceil(log2 N) attempts.",
        mathConcept: "For N = 100, ceil(log2(100)) = 7 attempts maximum. For N = 1000, exactly 10 attempts.",
        formulaDisplay: "Max Attempts = ceil(log2(N))",
        rewardXp: 250,
        sandbox: {
          id: "step_log_1",
          instruction: "Solve secret 118 in range [1, 128] in 7 or fewer attempts (since log2(128) = 7).",
          targetRange: { min: 1, max: 128 },
          secretNumber: 118,
          maxGuesses: 7,
          explanation: "Every single bisection halves the remaining possibilities: 128 -> 64 -> 32 -> 16 -> 8 -> 4 -> 2 -> 1.",
        },
      },
    ],
  },
  {
    id: "module_advanced",
    tier: "advanced",
    title: "3. Advanced Binary Search & Number Properties",
    description: "Parity pruning, divisibility constraints, and probabilistic pivot optimization.",
    icon: "flash-outline",
    lessons: [
      {
        id: "lesson_parity_pruning",
        moduleId: "module_advanced",
        tier: "advanced",
        order: 5,
        title: "Parity & Divisibility Constraints",
        subtitle: "Filtering candidates before bisecting",
        summary: "When a target is known to be even or a multiple of 3, only evaluate candidates in the filtered subset when choosing your pivot.",
        mathConcept: "Candidate Set S = { x in [L, H] | x mod k == 0 }. Optimal pivot is the median of S.",
        formulaDisplay: "P* = Median({ x in [L, H] | satisfies(x) })",
        rewardXp: 300,
        sandbox: {
          id: "step_parity_1",
          instruction: "Secret target 42 is an EVEN number in range [1, 50]. Bisect only even candidates to solve it efficiently.",
          targetRange: { min: 1, max: 50 },
          secretNumber: 42,
          clues: ["Target is an EVEN number (divisible by 2)"],
          maxGuesses: 5,
          explanation: "Because odd numbers are impossible, the effective candidate size is 25 instead of 50, reducing needed attempts.",
        },
      },
    ],
  },
];

export const PRACTICE_CHALLENGES: PracticeChallenge[] = [
  {
    id: "practice_minimal_64",
    tier: "beginner",
    title: "Perfect Log Bisection (1-64)",
    description: "Find the secret number in [1, 64] in at most 6 attempts (ceil(log2(64)) = 6).",
    category: "minimal_attempts",
    range: { min: 1, max: 64 },
    maxAttempts: 6,
    rewardXp: 120,
  },
  {
    id: "practice_drill_100",
    tier: "intermediate",
    title: "Centurion Speed Drill (1-100)",
    description: "Solve [1, 100] within 7 attempts under a 30-second time drill.",
    category: "binary_drill",
    range: { min: 1, max: 100 },
    maxAttempts: 7,
    timeLimitSeconds: 30,
    rewardXp: 200,
  },
  {
    id: "practice_even_200",
    tier: "advanced",
    title: "Even Cipher Infiltration (1-200)",
    description: "Solve an even-constrained target in [1, 200] in at most 7 attempts.",
    category: "constrained_logic",
    range: { min: 1, max: 200 },
    maxAttempts: 7,
    constraints: [
      { type: "parity", description: "Target is strictly EVEN", ruleValue: 2 },
    ],
    rewardXp: 300,
  },
];

export class AcademyService {
  /**
   * Generates a target for a challenge respecting constraints (parity, divisibility).
   */
  static generateChallengeTarget(
    min: number,
    max: number,
    constraints?: PracticeChallenge["constraints"],
  ): number {
    const candidates: number[] = [];
    for (let n = min; n <= max; n++) {
      let valid = true;
      if (constraints && constraints.length > 0) {
        for (const c of constraints) {
          if (c.type === "parity") {
            const isEven = n % 2 === 0;
            if (c.ruleValue === 2 && !isEven) valid = false;
            if (c.ruleValue === 1 && isEven) valid = false;
          } else if (c.type === "divisibility") {
            const div = Number(c.ruleValue);
            if (!isNaN(div) && div > 0 && n % div !== 0) valid = false;
          }
        }
      }
      if (valid) candidates.push(n);
    }

    if (candidates.length === 0) {
      return min + Math.floor(Math.random() * (max - min + 1));
    }
    const idx = Math.floor(Math.random() * candidates.length);
    return candidates[idx];
  }

  /**
   * Mathematically evaluates a guess against current bounds and theoretical midpoint,
   * accounting for mathematical constraints (parity, divisibility).
   */
  static evaluateGuess(
    guess: number,
    low: number,
    high: number,
    constraints?: PracticeChallenge["constraints"] | string[],
  ): GuessEvaluation {
    const totalRange = Math.max(1, high - low + 1);

    // 1. Mistake check (outside active boundaries)
    if (guess < low || guess > high) {
      return {
        guess,
        lowBound: low,
        highBound: high,
        optimalMidpoint: Math.floor((low + high) / 2),
        optimality: "mistake",
        eliminatedPercentage: 0,
        reason: `Guess ${guess} is outside the active range [${low}, ${high}]. It eliminates 0 possibilities and wastes an attempt.`,
      };
    }

    // 2. Mistake check (violates known constraints)
    if (constraints && constraints.length > 0) {
      for (const c of constraints) {
        if (typeof c === "string") {
          const lower = c.toLowerCase();
          if (lower.includes("even") && guess % 2 !== 0) {
            return {
              guess,
              lowBound: low,
              highBound: high,
              optimalMidpoint: Math.floor((low + high) / 2),
              optimality: "mistake",
              eliminatedPercentage: 0,
              reason: `Guess ${guess} is ODD, which violates the established mathematical clue (Target is strictly EVEN).`,
            };
          }
          if (lower.includes("odd") && guess % 2 === 0) {
            return {
              guess,
              lowBound: low,
              highBound: high,
              optimalMidpoint: Math.floor((low + high) / 2),
              optimality: "mistake",
              eliminatedPercentage: 0,
              reason: `Guess ${guess} is EVEN, which violates the established mathematical clue (Target is strictly ODD).`,
            };
          }
        } else if (c.type === "parity") {
          if (c.ruleValue === 2 && guess % 2 !== 0) {
            return {
              guess,
              lowBound: low,
              highBound: high,
              optimalMidpoint: Math.floor((low + high) / 2),
              optimality: "mistake",
              eliminatedPercentage: 0,
              reason: `Guess ${guess} is ODD, violating the required parity constraint (${c.description}).`,
            };
          }
          if (c.ruleValue === 1 && guess % 2 === 0) {
            return {
              guess,
              lowBound: low,
              highBound: high,
              optimalMidpoint: Math.floor((low + high) / 2),
              optimality: "mistake",
              eliminatedPercentage: 0,
              reason: `Guess ${guess} is EVEN, violating the required parity constraint (${c.description}).`,
            };
          }
        } else if (c.type === "divisibility") {
          const div = Number(c.ruleValue);
          if (!isNaN(div) && div > 0 && guess % div !== 0) {
            return {
              guess,
              lowBound: low,
              highBound: high,
              optimalMidpoint: Math.floor((low + high) / 2),
              optimality: "mistake",
              eliminatedPercentage: 0,
              reason: `Guess ${guess} is not divisible by ${div}, violating the constraint (${c.description}).`,
            };
          }
        }
      }
    }

    // 3. Compute optimal constrained pivot
    // Find all valid candidate integers in [low, high]
    const validCandidates: number[] = [];
    for (let n = low; n <= high; n++) {
      let ok = true;
      if (constraints && constraints.length > 0) {
        for (const c of constraints) {
          if (typeof c === "string") {
            const lower = c.toLowerCase();
            if (lower.includes("even") && n % 2 !== 0) ok = false;
            if (lower.includes("odd") && n % 2 === 0) ok = false;
          } else if (c.type === "parity") {
            if (c.ruleValue === 2 && n % 2 !== 0) ok = false;
            if (c.ruleValue === 1 && n % 2 === 0) ok = false;
          } else if (c.type === "divisibility") {
            const div = Number(c.ruleValue);
            if (!isNaN(div) && div > 0 && n % div !== 0) ok = false;
          }
        }
      }
      if (ok) validCandidates.push(n);
    }

    let optimalMidpoint = Math.floor((low + high) / 2);
    if (validCandidates.length > 0) {
      const midIdx = Math.floor(validCandidates.length / 2);
      optimalMidpoint = validCandidates[midIdx];
    }

    const delta = Math.abs(guess - optimalMidpoint);
    // Allow nearest valid candidate tolerance
    const isOptimal = delta <= 2;

    let eliminatedCount = 0;
    if (guess === optimalMidpoint) {
      eliminatedCount = Math.floor(totalRange / 2);
    } else if (guess < optimalMidpoint) {
      eliminatedCount = guess - low;
    } else {
      eliminatedCount = high - guess;
    }
    const eliminatedPercentage = Math.round((eliminatedCount / totalRange) * 100);

    if (isOptimal) {
      return {
        guess,
        lowBound: low,
        highBound: high,
        optimalMidpoint,
        optimality: "optimal",
        eliminatedPercentage: Math.max(45, Math.min(55, eliminatedPercentage || 50)),
        reason: `Optimal bisection! Guessing ${guess} (near optimal median pivot ${optimalMidpoint}) bisects valid possibilities.`,
      };
    }

    return {
      guess,
      lowBound: low,
      highBound: high,
      optimalMidpoint,
      optimality: "suboptimal",
      eliminatedPercentage,
      reason: `Suboptimal guess. ${guess} leaves an asymmetric candidate interval compared to median pivot ${optimalMidpoint}.`,
    };
  }

  /**
   * Generates today's deterministic Daily Brain Puzzle based on UTC date string (YYYY-MM-DD).
   */
  static getDailyBrainPuzzle(dateStr: string = new Date().toISOString().slice(0, 10)): DailyBrainPuzzle {
    // Deterministic hash of date string
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash * 31 + dateStr.charCodeAt(i)) & 0xffffffff;
    }
    const seed = Math.abs(hash);

    const min = 1;
    const max = 100 + (seed % 101); // 100 to 200
    const secretNumber = min + (seed % (max - min + 1));
    const theoreticalMinAttempts = Math.ceil(Math.log2(max - min + 1));
    const maxAttempts = theoreticalMinAttempts + 1;

    const isEven = secretNumber % 2 === 0;

    return {
      dateStr,
      title: `Daily Binary Protocol — ${dateStr}`,
      description: `Mathematically deduce the target in [${min}, ${max}] in at most ${maxAttempts} attempts.`,
      range: { min, max },
      secretNumber,
      maxAttempts,
      theoreticalMinAttempts,
      constraints: isEven ? ["Target is an EVEN number"] : ["Target is an ODD number"],
      rewardXp: 350,
    };
  }

  /**
   * Loads progress state from AsyncStorage (with fallback sync).
   */
  static async loadProgress(): Promise<AcademyProgressState> {
    try {
      const raw = await AsyncStorage.getItem(ACADEMY_STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_ACADEMY_PROGRESS, ...JSON.parse(raw) };
      }
    } catch {
      // safe fallback
    }
    return DEFAULT_ACADEMY_PROGRESS;
  }

  /**
   * Saves progress state locally and safely syncs with backend if authenticated.
   */
  static async saveProgress(patch: Partial<AcademyProgressState>): Promise<AcademyProgressState> {
    const current = await this.loadProgress();
    const updated: AcademyProgressState = {
      ...current,
      ...patch,
      lastUpdated: new Date().toISOString(),
    };

    // Calculate learning score based on accuracy and completed modules
    const total = updated.totalGuessesEvaluated;
    const optRate = total > 0 ? updated.optimalGuessesCount / total : 0;
    const lessonPoints = updated.completedLessons.length * 100;
    const challengePoints = updated.completedChallenges.length * 150;
    const accuracyPoints = Math.round(optRate * 800);
    updated.learningScore = lessonPoints + challengePoints + accuracyPoints;

    try {
      await AsyncStorage.setItem(ACADEMY_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // local save failed safely
    }

    // Try cloud sync if authenticated
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (user) {
        await supabase.from("academy_progress").upsert(
          {
            user_id: user.id,
            completed_lessons: updated.completedLessons,
            completed_challenges: updated.completedChallenges,
            learning_score: updated.learningScore,
            optimal_guesses: updated.optimalGuessesCount,
            total_guesses: updated.totalGuessesEvaluated,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      }
    } catch {
      // cloud sync non-blocking
    }

    return updated;
  }

  /**
   * Evaluates and records a series of guesses from an exercise or daily puzzle.
   */
  static async recordExerciseResults(params: {
    evaluations: GuessEvaluation[];
    lessonId?: string;
    challengeId?: string;
    dailyDateStr?: string;
    starsAwarded?: number;
    score?: number;
  }): Promise<{ updatedState: AcademyProgressState; xpEarned: number }> {
    const current = await this.loadProgress();

    let optimalAdd = 0;
    let suboptimalAdd = 0;
    let mistakesAdd = 0;

    params.evaluations.forEach((ev) => {
      if (ev.optimality === "optimal") optimalAdd++;
      else if (ev.optimality === "suboptimal") suboptimalAdd++;
      else if (ev.optimality === "mistake") mistakesAdd++;
    });

    const nextCompletedLessons = [...current.completedLessons];
    let isNewLesson = false;
    if (params.lessonId && !nextCompletedLessons.includes(params.lessonId)) {
      nextCompletedLessons.push(params.lessonId);
      isNewLesson = true;
    }

    const nextCompletedChallenges = [...current.completedChallenges];
    let isNewChallenge = false;
    if (params.challengeId && !nextCompletedChallenges.includes(params.challengeId)) {
      nextCompletedChallenges.push(params.challengeId);
      isNewChallenge = true;
    }

    const nextDailyHistory = { ...current.dailyHistory };
    let isNewDaily = false;
    if (params.dailyDateStr && !nextDailyHistory[params.dailyDateStr]?.completed) {
      const totalEval = params.evaluations.length;
      nextDailyHistory[params.dailyDateStr] = {
        dateStr: params.dailyDateStr,
        completed: true,
        score: params.score || 1000,
        optimalRatio: totalEval > 0 ? optimalAdd / totalEval : 1,
      };
      isNewDaily = true;
    }

    // Determine XP reward strictly idempotently (no farming duplicate XP on repeat)
    let xpEarned = 0;
    if (isNewLesson) xpEarned += 200;
    if (isNewChallenge) xpEarned += 250;
    if (isNewDaily) xpEarned += 350;

    const nextLessonStars = { ...current.lessonStars };
    if (params.lessonId && params.starsAwarded) {
      nextLessonStars[params.lessonId] = Math.max(
        nextLessonStars[params.lessonId] || 0,
        params.starsAwarded,
      );
    }

    const updatedState = await this.saveProgress({
      completedLessons: nextCompletedLessons,
      completedChallenges: nextCompletedChallenges,
      dailyHistory: nextDailyHistory,
      lessonStars: nextLessonStars,
      totalGuessesEvaluated: current.totalGuessesEvaluated + params.evaluations.length,
      optimalGuessesCount: current.optimalGuessesCount + optimalAdd,
      suboptimalGuessesCount: current.suboptimalGuessesCount + suboptimalAdd,
      mistakesCount: current.mistakesCount + mistakesAdd,
    });

    return { updatedState, xpEarned };
  }

  /**
   * Resolves the player's current Academy Mastery Rank based on learning score.
   */
  static getMasteryRank(learningScore: number): AcademyMasteryRank {
    for (let i = MASTERY_RANKS.length - 1; i >= 0; i--) {
      if (learningScore >= MASTERY_RANKS[i].minLearningScore) {
        return MASTERY_RANKS[i];
      }
    }
    return MASTERY_RANKS[0];
  }
}

