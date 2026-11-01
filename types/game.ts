import type { DifficultyId, GameMode } from "@/constants/gameConfig";

export type AppScreen =
  | "home"
  | "setup"
  | "playing"
  | "gameOver"
  | "stats"
  | "achievements"
  | "settings"
  | "howToPlay";

export type GameResult = {
  won: boolean;
  rounds: number;
  userNumber: number;
  secretNumber?: number;
  score: number;
  elapsedMs: number;
  mode: GameMode;
  difficulty: DifficultyId;
  hintsUsed: number;
  isDaily: boolean;
  guesses: number[];
};

export type BestScores = Partial<Record<`${GameMode}-${DifficultyId}`, number>>;

export type PlayerStats = {
  gamesPlayed: number;
  gamesWon: number;
  totalRounds: number;
  totalScore: number;
  bestScore: number;
  currentStreak: number;
  bestStreak: number;
  fastestWinMs: number | null;
  bestRounds: number | null;
  dailyCompletions: number;
  lastDailyDate: string | null;
  unlockedAchievements: string[];
  bestScores: BestScores;
};

export type Settings = {
  haptics: boolean;
  showTimer: boolean;
  showRangeBar: boolean;
};

export const DEFAULT_STATS: PlayerStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  totalRounds: 0,
  totalScore: 0,
  bestScore: 0,
  currentStreak: 0,
  bestStreak: 0,
  fastestWinMs: null,
  bestRounds: null,
  dailyCompletions: 0,
  lastDailyDate: null,
  unlockedAchievements: [],
  bestScores: {},
};

export const DEFAULT_SETTINGS: Settings = {
  haptics: true,
  showTimer: true,
  showRangeBar: true,
};
