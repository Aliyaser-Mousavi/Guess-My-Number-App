// ==============================================================================
// Types: coach.ts
// Description: Type definitions for Group 10 - AI Strategy Coach & Intelligent Challenges
// ==============================================================================

import type { DifficultyId, GameMode } from "@/constants/gameConfig";

export type StrategyWeaknessKey =
  | "bisection_deviation"
  | "boundary_waste"
  | "hint_overreliance"
  | "rushed_execution"
  | "analysis_paralysis"
  | "high_difficulty_choke";

export type StrategyStrengthKey =
  | "binary_search_mastery"
  | "flawless_boundaries"
  | "clue_independence"
  | "calm_tempo"
  | "clutch_solver";

export interface TacticalMetricBreakdown {
  totalAnalyzedGames: number;
  totalAnalyzedGuesses: number;
  overallEfficiencyScore: number; // 0 - 100
  historicalEfficiencyTrend: number; // e.g. +4 or -2 compared to prior window

  // Specific Analytics
  suboptimalGuessRate: number; // Percentage (0-100) of guesses far from midpoint
  boundaryWasteRate: number; // Percentage (0-100) of guesses out of current [L, H] bounds
  redundantGuessCount: number; // Count of identical repeated guesses or violating clues
  averageSecondsPerGuess: number; // Elapsed seconds per guess step
  hintRelianceRatio: number; // Hints used per game average

  // Mode & Difficulty Asymmetries
  winRateByDifficulty: Record<DifficultyId, number>; // 0 - 100
  winRateByMode: Partial<Record<GameMode, number>>; // 0 - 100
  difficultyDropOffRate: number; // Easy/Medium winrate minus Hard/Expert winrate
}

export interface PersonalizedRecommendation {
  id: string;
  category: "bisection" | "boundaries" | "hints" | "tempo" | "difficulty";
  severity: "critical" | "warning" | "positive";
  title: string;
  diagnosis: string;
  tacticalPrescription: string;
  recommendedAcademyModuleId?: string;
  recommendedAcademyLessonId?: string;
}

export interface CoachEvaluationReport {
  generatedAt: string;
  efficiencyScore: number; // 0 - 100
  efficiencyRankTitle: string; // e.g. "Oracle Precision", "Intuitive Guesser", etc.
  metrics: TacticalMetricBreakdown;
  strengths: {
    key: StrategyStrengthKey;
    title: string;
    description: string;
  }[];
  weaknesses: {
    key: StrategyWeaknessKey;
    title: string;
    description: string;
  }[];
  recommendations: PersonalizedRecommendation[];
  coachingSummary: string;
}

export interface TailoredPracticeChallenge {
  id: string;
  title: string;
  description: string;
  targetedWeakness: StrategyWeaknessKey;
  range: { min: number; max: number };
  secretNumber: number;
  maxAttempts: number;
  timeLimitSeconds?: number;
  constraints?: {
    type: "parity" | "divisibility" | "digit_sum";
    description: string;
    ruleValue: number | string;
  }[];
  rewardXp: number;
  tacticalBrief: string;
}

export interface IntelligentDailyChallenge {
  dateStr: string; // YYYY-MM-DD
  title: string;
  description: string;
  range: { min: number; max: number };
  secretNumber: number;
  maxAttempts: number;
  timeLimitSeconds?: number;
  specialRules: string[];
  constraints?: {
    type: "parity" | "divisibility" | "digit_sum";
    description: string;
    ruleValue: number | string;
  }[];
  hintBudget: number;
  rewardXp: number;
}

