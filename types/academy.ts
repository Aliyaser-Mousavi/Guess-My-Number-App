// ==============================================================================
// Types: academy.ts
// Description: Type definitions for Group 09 - Number Academy
// ==============================================================================

export type AcademyDifficultyTier = "beginner" | "intermediate" | "advanced";

export type GuessOptimality = "optimal" | "suboptimal" | "mistake";

export interface GuessEvaluation {
  guess: number;
  lowBound: number;
  highBound: number;
  optimalMidpoint: number;
  optimality: GuessOptimality;
  eliminatedPercentage: number;
  reason: string;
}

export interface LessonSandboxStep {
  id: string;
  instruction: string;
  targetRange: { min: number; max: number };
  secretNumber: number;
  maxGuesses?: number;
  clues?: string[];
  explanation: string;
}

export interface AcademyLesson {
  id: string;
  moduleId: string;
  tier: AcademyDifficultyTier;
  title: string;
  subtitle: string;
  summary: string;
  mathConcept: string;
  formulaDisplay?: string;
  sandbox: LessonSandboxStep;
  rewardXp: number;
  order: number;
}

export interface AcademyModule {
  id: string;
  tier: AcademyDifficultyTier;
  title: string;
  description: string;
  icon: string;
  lessons: AcademyLesson[];
}

export interface PracticeChallenge {
  id: string;
  tier: AcademyDifficultyTier;
  title: string;
  description: string;
  category: "minimal_attempts" | "binary_drill" | "constrained_logic";
  range: { min: number; max: number };
  maxAttempts: number;
  timeLimitSeconds?: number;
  constraints?: {
    type: "parity" | "divisibility" | "digit_sum";
    description: string;
    ruleValue: number | string;
  }[];
  rewardXp: number;
}

export interface DailyBrainPuzzle {
  dateStr: string; // YYYY-MM-DD
  title: string;
  description: string;
  range: { min: number; max: number };
  secretNumber: number;
  maxAttempts: number;
  theoreticalMinAttempts: number;
  constraints?: string[];
  rewardXp: number;
}

export interface AcademyProgressState {
  completedLessons: string[]; // lesson IDs
  lessonStars: Record<string, number>; // lessonId -> stars (1-3)
  completedChallenges: string[]; // challenge IDs
  challengeBests: Record<string, { attempts: number; score: number }>;
  dailyHistory: Record<string, { dateStr: string; completed: boolean; score: number; optimalRatio: number }>;
  totalGuessesEvaluated: number;
  optimalGuessesCount: number;
  suboptimalGuessesCount: number;
  mistakesCount: number;
  learningScore: number;
  lastUpdated: string;
}

export interface AcademyMasteryRank {
  key: "novice" | "analyst" | "tactician" | "strategist" | "grandmaster";
  title: string;
  minLearningScore: number;
  color: string;
  badge: string;
}

