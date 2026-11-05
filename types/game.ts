import type { DifficultyId, GameMode } from "@/constants/gameConfig";
export type { DifficultyId, GameMode };

export type AppScreen =
  | "home"
  | "setup"
  | "playing"
  | "gameOver"
  | "stats"
  | "achievements"
  | "progression"
  | "profile"
  | "settings"
  | "howToPlay"
  | "leaderboard"
  | "multiplayerLobby"
  | "multiplayerGame"
  | "tournaments"
  | "seasons"
  | "academy";

// ==========================================
// 1. Core Gameplay Results
// ==========================================
export type CustomGameConfig = {
  min: number;
  max: number;
  lives: number | null; // null = unlimited
  timerSeconds: number | null; // null = no timer
  hints: number;
  subMode: "player" | "opponent";
};

export type SetupConfig = {
  mode: GameMode;
  difficultyId: DifficultyId;
  userNumber?: number;
  isDaily: boolean;
  dailyDateStr?: string;
  timeLimitSeconds?: number;
  customConfig?: CustomGameConfig;
  player1Name?: string;
  player2Name?: string;
  isRanked?: boolean;
  serverSessionId?: string;
  tournamentId?: string;
};

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
  sessionId?: string;
  isRanked?: boolean;
  isServerVerified?: boolean;
  ratingDelta?: number;
  newRating?: number;
  newTier?: string;
};

export type BestScores = Partial<Record<`${GameMode}-${DifficultyId}`, number>>;

// ==========================================
// 2. Individual Guess Model
// ==========================================
export type GuessFeedback = "low" | "high" | "correct" | "oracle";

export type IndividualGuess = {
  round: number;
  guess: number;
  timestamp: number;
  feedback?: GuessFeedback;
};

// ==========================================
// 3. Game Session Lifecycle Model
// ==========================================
export type SessionStatus = "active" | "completed" | "abandoned";

export type GameSession = {
  sessionId: string;
  status: SessionStatus;
  mode: GameMode;
  difficulty: DifficultyId;
  isDaily: boolean;
  targetNumber?: number;
  guesses: IndividualGuess[];
  startedAt: number;
  endedAt?: number;
  elapsedMs: number;
  hintsUsed: number;
  livesRemaining?: number;
  result?: GameResult;
};

// ==========================================
// 4. Game History & Replay Models
// ==========================================
export type GameReplayEvent = {
  step: number;
  type: "guess" | "hint";
  guess?: number;
  feedback?: GuessFeedback;
  minAfter?: number;
  maxAfter?: number;
  hintDescription?: string;
  timestamp?: number;
};

export type GameHistoryRecord = {
  id: string;
  sessionId: string;
  timestamp: number;
  won: boolean;
  rounds: number;
  score: number;
  elapsedMs: number;
  mode: GameMode;
  difficulty: DifficultyId;
  hintsUsed: number;
  isDaily: boolean;
  guesses: number[];
  secretNumber?: number;
  userNumber: number;
  minRange?: number;
  maxRange?: number;
  targetNumber?: number;
  customConfig?: CustomGameConfig;
  player1Name?: string;
  player2Name?: string;
  timeline?: GameReplayEvent[];
};

export type PersonalBests = {
  fastestWinMs: number | null;
  highestScore: number;
  lowestGuesses: number | null;
  bestSurvivalRounds: number;
  bestSurvivalScore: number;
  bestBlitzScore: number;
  bestBlitzSolved: number;
  byMode: Partial<
    Record<
      GameMode,
      {
        gamesPlayed: number;
        gamesWon: number;
        highestScore: number;
        fastestWinMs: number | null;
        lowestGuesses: number | null;
        avgRounds: number;
      }
    >
  >;
  byDifficulty: Partial<
    Record<
      DifficultyId,
      {
        gamesPlayed: number;
        gamesWon: number;
        highestScore: number;
        fastestWinMs: number | null;
        lowestGuesses: number | null;
        avgRounds: number;
      }
    >
  >;
};

export type PostGameAnalysis = {
  efficiencyScore: number; // 0 - 100
  efficiencyLabel: string;
  actualRounds: number;
  optimalRounds: number;
  hintsUsed: number;
  elapsedMs: number;
  highlights: string[];
  suggestions: string[];
};

// ==========================================
// 5. Player Profile Model
// ==========================================
export type PlayerProfile = {
  id: string;
  displayName: string;
  avatarId: string;
  titleId?: string;
  showcaseAchievements?: string[];
  createdAt: number;
  updatedAt: number;
};

// ==========================================
// 6. XP and Progression Model
// ==========================================
export type PlayerProgression = {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  totalXp: number;
  rankTitle: string;
};

// ==========================================
// 6B. Competitive Ranks Model
// ==========================================
export type CompetitiveRankTier =
  | "beginner"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "master"
  | "grandmaster";

export type CompetitiveRank = {
  tier: CompetitiveRankTier;
  label: string;
  rating: number; // Competitive Rating (CR / MMR)
  minRating: number;
  nextTierRating: number;
  tierColor: string;
  tierIcon: string;
  division: string; // e.g. "II", "I"
  progressPercent: number;
};

// ==========================================
// 7. Missions and Rewards Model
// ==========================================
export type MissionCategory = "daily" | "weekly";

export type MissionType =
  | "play_games"
  | "win_games"
  | "streak"
  | "daily_challenge"
  | "speed_win"
  | "score_points"
  | "hard_expert_win"
  | "hintless_win"
  | "survival_round"
  | "blitz_solve"
  | "logic_puzzle";

export type MissionReward = {
  xp: number;
  badgeId?: string;
  cosmeticId?: string;
  titleId?: string;
};

export type MissionProgress = {
  id: string;
  title: string;
  description: string;
  category: MissionCategory;
  type: MissionType;
  target: number;
  current: number;
  completed: boolean;
  claimed: boolean;
  expiresAt: number;
  reward: MissionReward;
  icon?: string;
};

// ==========================================
// 8. Cosmetics & Customization Model
// ==========================================
export type CosmeticType = "avatar" | "theme" | "numberStyle" | "title";

export type CosmeticItem = {
  id: string;
  name: string;
  description: string;
  type: CosmeticType;
  icon: string;
  previewColor?: string;
  requiredLevel?: number;
  requiredRankTier?: CompetitiveRankTier;
  requiredAchievementId?: string;
  isUnlocked?: boolean;
  isEquipped?: boolean;
};

export type CosmeticsState = {
  unlockedAvatars: string[];
  unlockedThemes: string[];
  unlockedNumberStyles: string[];
  unlockedTitles?: string[];
  activeAvatar: string;
  activeTheme: string;
  activeNumberStyle: string;
  activeTitle?: string;
};

// ==========================================
// 8B. Advanced Achievements Model
// ==========================================
export type AchievementTier = "common" | "rare" | "epic" | "legendary";

export type AdvancedAchievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  category: "general" | "mastery" | "speed" | "endurance" | "secret";
  isSecret?: boolean;
  secretHint?: string;
  maxProgress?: number;
  rewardXp: number;
  rewardTitle?: string;
  rewardCosmeticId?: string;
  stage?: number;
  maxStage?: number;
};

// ==========================================
// 9. Daily Challenge Record Model
// ==========================================
export type DailyChallengeRecord = {
  date: string; // YYYY-MM-DD
  completed: boolean;
  score?: number;
  rounds?: number;
  elapsedMs?: number;
};

// ==========================================
// 10. Player Statistics Model (Backward-Compatible)
// ==========================================
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

// ==========================================
// 11. Settings & Preferences Model
// ==========================================
export type HapticIntensity = "light" | "medium" | "heavy";

export type ThemeId = "midnight" | "ocean" | "emerald" | "sunset";

export type NumberDisplayStyle =
  | "arcade_glow"
  | "holographic_glass"
  | "retro_pixel"
  | "minimal_clean"
  | "cyber_matrix";

export type NumberAnimationOption = "pulse" | "flicker" | "bounce" | "none";

export type TextSizeOption = "normal" | "large" | "extraLarge";

export type ColorBlindOption =
  | "none"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia";

export type LanguageOption = "en" | "fa";

export type DigitFormatOption = "latin" | "persian";

export type NotificationPreferences = {
  dailyReminder: boolean;
  dailyReminderTime: string; // "HH:MM" e.g. "09:00"
  missionReminder: boolean;
  streakReminder: boolean;
  eventReminder: boolean;
  permissionGranted: boolean;
};

export type Settings = {
  haptics: boolean;
  hapticIntensity: HapticIntensity;
  soundEnabled: boolean;
  soundVolume: number; // 0 to 1
  showProximity: boolean;
  showTimer: boolean;
  showRangeBar: boolean;
  tutorialCompleted: boolean;

  // Group 06 Personalization & Accessibility
  themeId: ThemeId;
  numberStyle: NumberDisplayStyle;
  numberAnimation: NumberAnimationOption;
  textSize: TextSizeOption;
  highContrast: boolean;
  colorBlindMode: ColorBlindOption;
  reducedMotion: boolean;
  leftHandedControls: boolean;
  language: LanguageOption;
  digitFormat: DigitFormatOption;
  notifications: NotificationPreferences;
};

// ==========================================
// 12. Root Versioned App State (Version 2)
// ==========================================
export type AppStateV2 = {
  version: 2;
  profile: PlayerProfile;
  progression: PlayerProgression;
  stats: PlayerStats;
  history: GameHistoryRecord[];
  settings: Settings;
  missions: MissionProgress[];
  cosmetics: CosmeticsState;
  activeSession: GameSession | null;
  dailyHistory: Record<string, DailyChallengeRecord>;
  lastSavedAt: number;
};

// ==========================================
// Default Values
// ==========================================
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

export const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  dailyReminder: false,
  dailyReminderTime: "09:00",
  missionReminder: false,
  streakReminder: false,
  eventReminder: false,
  permissionGranted: false,
};

export const DEFAULT_SETTINGS: Settings = {
  haptics: true,
  hapticIntensity: "medium",
  soundEnabled: true,
  soundVolume: 0.8,
  showProximity: true,
  showTimer: true,
  showRangeBar: true,
  tutorialCompleted: false,

  themeId: "midnight",
  numberStyle: "arcade_glow",
  numberAnimation: "pulse",
  textSize: "normal",
  highContrast: false,
  colorBlindMode: "none",
  reducedMotion: false,
  leftHandedControls: false,
  language: "en",
  digitFormat: "latin",
  notifications: DEFAULT_NOTIFICATIONS,
};

export const DEFAULT_PROFILE: PlayerProfile = {
  id: "player_default",
  displayName: "Number Hunter",
  avatarId: "oracle_orb",
  titleId: "apprentice_hunter",
  showcaseAchievements: [],
  createdAt: 0,
  updatedAt: 0,
};

export const DEFAULT_PROGRESSION: PlayerProgression = {
  level: 1,
  currentXp: 0,
  nextLevelXp: 500,
  totalXp: 0,
  rankTitle: "Apprentice Hunter",
};

export const DEFAULT_COSMETICS: CosmeticsState = {
  unlockedAvatars: ["oracle_orb", "neon_spark", "cipher_cube"],
  unlockedThemes: ["midnight_arcade"],
  unlockedNumberStyles: ["space_grotesk"],
  activeAvatar: "oracle_orb",
  activeTheme: "midnight_arcade",
  activeNumberStyle: "space_grotesk",
};

export const DEFAULT_STATE_V2: AppStateV2 = {
  version: 2,
  profile: DEFAULT_PROFILE,
  progression: DEFAULT_PROGRESSION,
  stats: DEFAULT_STATS,
  history: [],
  settings: DEFAULT_SETTINGS,
  missions: [],
  cosmetics: DEFAULT_COSMETICS,
  activeSession: null,
  dailyHistory: {},
  lastSavedAt: 0,
};
