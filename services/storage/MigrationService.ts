import {
  DEFAULT_COSMETICS,
  DEFAULT_PROFILE,
  DEFAULT_PROGRESSION,
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  DEFAULT_STATE_V2,
  type AppStateV2,
  type BestScores,
  type CosmeticsState,
  type DailyChallengeRecord,
  type GameHistoryRecord,
  type MissionProgress,
  type PlayerProfile,
  type PlayerProgression,
  type PlayerStats,
  type Settings,
} from "../../types/game";

export function safeNumber(val: unknown, fallback: number): number {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

export function safeBoolean(val: unknown, fallback: boolean): boolean {
  if (typeof val === "boolean") return val;
  return fallback;
}

export function safeString(val: unknown, fallback: string): string {
  if (typeof val === "string" && val.trim().length > 0) return val;
  return fallback;
}

export function validateAndMergeStats(raw: unknown): PlayerStats {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATS };
  const r = raw as Record<string, unknown>;

  const unlockedAchievements = Array.isArray(r.unlockedAchievements)
    ? r.unlockedAchievements.filter((id): id is string => typeof id === "string")
    : DEFAULT_STATS.unlockedAchievements;

  const bestScores: BestScores = {};
  if (r.bestScores && typeof r.bestScores === "object") {
    for (const [key, val] of Object.entries(r.bestScores as Record<string, unknown>)) {
      if (typeof val === "number" && !isNaN(val)) {
        bestScores[key as keyof BestScores] = val;
      }
    }
  }

  return {
    gamesPlayed: safeNumber(r.gamesPlayed, DEFAULT_STATS.gamesPlayed),
    gamesWon: safeNumber(r.gamesWon, DEFAULT_STATS.gamesWon),
    totalRounds: safeNumber(r.totalRounds, DEFAULT_STATS.totalRounds),
    totalScore: safeNumber(r.totalScore, DEFAULT_STATS.totalScore),
    bestScore: safeNumber(r.bestScore, DEFAULT_STATS.bestScore),
    currentStreak: safeNumber(r.currentStreak, DEFAULT_STATS.currentStreak),
    bestStreak: safeNumber(r.bestStreak, DEFAULT_STATS.bestStreak),
    fastestWinMs:
      r.fastestWinMs == null
        ? null
        : safeNumber(r.fastestWinMs, DEFAULT_STATS.fastestWinMs ?? 0),
    bestRounds:
      r.bestRounds == null
        ? null
        : safeNumber(r.bestRounds, DEFAULT_STATS.bestRounds ?? 0),
    dailyCompletions: safeNumber(
      r.dailyCompletions,
      DEFAULT_STATS.dailyCompletions,
    ),
    lastDailyDate:
      typeof r.lastDailyDate === "string" ? r.lastDailyDate : null,
    unlockedAchievements,
    bestScores,
  };
}

export function validateAndMergeSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  const r = raw as Record<string, unknown>;
  const intensity =
    r.hapticIntensity === "light" ||
    r.hapticIntensity === "medium" ||
    r.hapticIntensity === "heavy"
      ? r.hapticIntensity
      : DEFAULT_SETTINGS.hapticIntensity;

  const rawVol = typeof r.soundVolume === "number" ? r.soundVolume : DEFAULT_SETTINGS.soundVolume;
  const soundVolume = Math.max(0, Math.min(1, rawVol));

  const themeId =
    r.themeId === "midnight" ||
    r.themeId === "ocean" ||
    r.themeId === "emerald" ||
    r.themeId === "sunset"
      ? r.themeId
      : DEFAULT_SETTINGS.themeId;

  const numberStyle =
    r.numberStyle === "arcade_glow" ||
    r.numberStyle === "holographic_glass" ||
    r.numberStyle === "retro_pixel" ||
    r.numberStyle === "minimal_clean" ||
    r.numberStyle === "cyber_matrix"
      ? r.numberStyle
      : DEFAULT_SETTINGS.numberStyle;

  const numberAnimation =
    r.numberAnimation === "pulse" ||
    r.numberAnimation === "flicker" ||
    r.numberAnimation === "bounce" ||
    r.numberAnimation === "none"
      ? r.numberAnimation
      : DEFAULT_SETTINGS.numberAnimation;

  const textSize =
    r.textSize === "normal" ||
    r.textSize === "large" ||
    r.textSize === "extraLarge"
      ? r.textSize
      : DEFAULT_SETTINGS.textSize;

  const colorBlindMode =
    r.colorBlindMode === "none" ||
    r.colorBlindMode === "protanopia" ||
    r.colorBlindMode === "deuteranopia" ||
    r.colorBlindMode === "tritanopia"
      ? r.colorBlindMode
      : DEFAULT_SETTINGS.colorBlindMode;

  const language = DEFAULT_SETTINGS.language;
  const digitFormat = DEFAULT_SETTINGS.digitFormat;

  const rawNotifs = (r.notifications && typeof r.notifications === "object"
    ? r.notifications
    : {}) as Record<string, unknown>;

  const notifications = {
    dailyReminder: safeBoolean(
      rawNotifs.dailyReminder,
      DEFAULT_SETTINGS.notifications.dailyReminder,
    ),
    dailyReminderTime: safeString(
      rawNotifs.dailyReminderTime,
      DEFAULT_SETTINGS.notifications.dailyReminderTime,
    ),
    missionReminder: safeBoolean(
      rawNotifs.missionReminder,
      DEFAULT_SETTINGS.notifications.missionReminder,
    ),
    streakReminder: safeBoolean(
      rawNotifs.streakReminder,
      DEFAULT_SETTINGS.notifications.streakReminder,
    ),
    eventReminder: safeBoolean(
      rawNotifs.eventReminder,
      DEFAULT_SETTINGS.notifications.eventReminder,
    ),
    permissionGranted: safeBoolean(
      rawNotifs.permissionGranted,
      DEFAULT_SETTINGS.notifications.permissionGranted,
    ),
  };

  return {
    haptics: safeBoolean(r.haptics, DEFAULT_SETTINGS.haptics),
    hapticIntensity: intensity,
    soundEnabled: safeBoolean(r.soundEnabled, DEFAULT_SETTINGS.soundEnabled),
    soundVolume,
    showProximity: safeBoolean(r.showProximity, DEFAULT_SETTINGS.showProximity),
    showTimer: safeBoolean(r.showTimer, DEFAULT_SETTINGS.showTimer),
    showRangeBar: safeBoolean(r.showRangeBar, DEFAULT_SETTINGS.showRangeBar),
    tutorialCompleted: safeBoolean(
      r.tutorialCompleted,
      DEFAULT_SETTINGS.tutorialCompleted,
    ),
    themeId,
    numberStyle,
    numberAnimation,
    textSize,
    highContrast: safeBoolean(r.highContrast, DEFAULT_SETTINGS.highContrast),
    colorBlindMode,
    reducedMotion: safeBoolean(r.reducedMotion, DEFAULT_SETTINGS.reducedMotion),
    leftHandedControls: safeBoolean(
      r.leftHandedControls,
      DEFAULT_SETTINGS.leftHandedControls,
    ),
    language,
    digitFormat,
    notifications,
  };
}

export function validateAndMergeProfile(raw: unknown): PlayerProfile {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PROFILE };
  const r = raw as Record<string, unknown>;
  const showcaseAchievements = Array.isArray(r.showcaseAchievements)
    ? r.showcaseAchievements.filter((id): id is string => typeof id === "string")
    : [];

  return {
    id: safeString(r.id, DEFAULT_PROFILE.id),
    displayName: safeString(r.displayName, DEFAULT_PROFILE.displayName),
    avatarId: safeString(r.avatarId, DEFAULT_PROFILE.avatarId),
    titleId: typeof r.titleId === "string" ? r.titleId : DEFAULT_PROFILE.titleId,
    showcaseAchievements,
    createdAt: safeNumber(r.createdAt, Date.now()),
    updatedAt: safeNumber(r.updatedAt, Date.now()),
  };
}

export function validateAndMergeProgression(
  raw: unknown,
  existingStats?: PlayerStats,
): PlayerProgression {
  if (!raw || typeof raw !== "object") {
    // If progression didn't exist before, seed it fairly from player's existing stats
    if (existingStats && existingStats.totalScore > 0) {
      const totalXp = Math.floor(existingStats.totalScore + existingStats.gamesWon * 100);
      const level = Math.max(1, Math.floor(Math.sqrt(totalXp / 250)) + 1);
      const nextLevelXp = level * level * 250;
      const currentXp = Math.max(0, totalXp - (level - 1) * (level - 1) * 250);
      return {
        level,
        currentXp,
        nextLevelXp,
        totalXp,
        rankTitle: getTitleForLevel(level),
      };
    }
    return { ...DEFAULT_PROGRESSION };
  }

  const r = raw as Record<string, unknown>;
  const level = safeNumber(r.level, DEFAULT_PROGRESSION.level);
  return {
    level,
    currentXp: safeNumber(r.currentXp, DEFAULT_PROGRESSION.currentXp),
    nextLevelXp: safeNumber(r.nextLevelXp, DEFAULT_PROGRESSION.nextLevelXp),
    totalXp: safeNumber(r.totalXp, DEFAULT_PROGRESSION.totalXp),
    rankTitle: safeString(r.rankTitle, getTitleForLevel(level)),
  };
}

export function validateAndMergeCosmetics(raw: unknown): CosmeticsState {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_COSMETICS };
  const r = raw as Record<string, unknown>;

  const unlockedAvatars = Array.isArray(r.unlockedAvatars)
    ? r.unlockedAvatars.filter((x): x is string => typeof x === "string")
    : DEFAULT_COSMETICS.unlockedAvatars;

  const unlockedThemes = Array.isArray(r.unlockedThemes)
    ? r.unlockedThemes.filter((x): x is string => typeof x === "string")
    : DEFAULT_COSMETICS.unlockedThemes;

  const unlockedNumberStyles = Array.isArray(r.unlockedNumberStyles)
    ? r.unlockedNumberStyles.filter((x): x is string => typeof x === "string")
    : DEFAULT_COSMETICS.unlockedNumberStyles;

  return {
    unlockedAvatars: unlockedAvatars.length ? unlockedAvatars : DEFAULT_COSMETICS.unlockedAvatars,
    unlockedThemes: unlockedThemes.length ? unlockedThemes : DEFAULT_COSMETICS.unlockedThemes,
    unlockedNumberStyles: unlockedNumberStyles.length
      ? unlockedNumberStyles
      : DEFAULT_COSMETICS.unlockedNumberStyles,
    activeAvatar: safeString(r.activeAvatar, DEFAULT_COSMETICS.activeAvatar),
    activeTheme: safeString(r.activeTheme, DEFAULT_COSMETICS.activeTheme),
    activeNumberStyle: safeString(
      r.activeNumberStyle,
      DEFAULT_COSMETICS.activeNumberStyle,
    ),
  };
}

export function validateAndMergeHistory(raw: unknown): GameHistoryRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      id: safeString(item.id, `hist_${Date.now()}`),
      sessionId: safeString(item.sessionId, ""),
      timestamp: safeNumber(item.timestamp, Date.now()),
      won: safeBoolean(item.won, false),
      rounds: safeNumber(item.rounds, 1),
      score: safeNumber(item.score, 0),
      elapsedMs: safeNumber(item.elapsedMs, 0),
      mode:
        item.mode === "player" ||
        item.mode === "opponent" ||
        item.mode === "timeAttack" ||
        item.mode === "survival" ||
        item.mode === "blitz" ||
        item.mode === "custom" ||
        item.mode === "passAndPlay" ||
        item.mode === "logicPuzzle"
          ? item.mode
          : "player",
      difficulty:
        item.difficulty === "easy" ||
        item.difficulty === "medium" ||
        item.difficulty === "hard" ||
        item.difficulty === "expert"
          ? item.difficulty
          : "medium",
      hintsUsed: safeNumber(item.hintsUsed, 0),
      isDaily: safeBoolean(item.isDaily, false),
      guesses: Array.isArray(item.guesses)
        ? item.guesses.filter((g): g is number => typeof g === "number")
        : [],
      secretNumber:
        typeof item.secretNumber === "number" ? item.secretNumber : undefined,
      userNumber: safeNumber(item.userNumber, 0),
    }));
}

export function validateAndMergeDailyHistory(
  raw: unknown,
): Record<string, DailyChallengeRecord> {
  if (!raw || typeof raw !== "object") return {};
  const result: Record<string, DailyChallengeRecord> = {};
  for (const [date, val] of Object.entries(raw as Record<string, unknown>)) {
    if (val && typeof val === "object") {
      const r = val as Record<string, unknown>;
      result[date] = {
        date,
        completed: safeBoolean(r.completed, true),
        score: typeof r.score === "number" ? r.score : undefined,
        rounds: typeof r.rounds === "number" ? r.rounds : undefined,
        elapsedMs: typeof r.elapsedMs === "number" ? r.elapsedMs : undefined,
      };
    }
  }
  return result;
}

export function validateAndMergeMissions(raw: unknown): MissionProgress[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is MissionProgress => {
    return (
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>).id === "string" &&
      typeof (item as Record<string, unknown>).title === "string"
    );
  });
}

export function validateAndMergeStateV2(raw: unknown): AppStateV2 {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE_V2 };
  const r = raw as Record<string, unknown>;

  const stats = validateAndMergeStats(r.stats);
  const settings = validateAndMergeSettings(r.settings);
  const profile = validateAndMergeProfile(r.profile);
  const progression = validateAndMergeProgression(r.progression, stats);
  const cosmetics = validateAndMergeCosmetics(r.cosmetics);
  const history = validateAndMergeHistory(r.history);
  const dailyHistory = validateAndMergeDailyHistory(r.dailyHistory);
  const missions = validateAndMergeMissions(r.missions);

  return {
    version: 2,
    profile,
    progression,
    stats,
    history,
    settings,
    missions,
    cosmetics,
    activeSession: null,
    dailyHistory,
    lastSavedAt: safeNumber(r.lastSavedAt, Date.now()),
  };
}

export function migrateV1ToV2(
  rawStats: unknown,
  rawSettings: unknown,
): AppStateV2 {
  const stats = validateAndMergeStats(rawStats);
  const settings = validateAndMergeSettings(rawSettings);
  const profile = {
    ...DEFAULT_PROFILE,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const progression = validateAndMergeProgression(null, stats);

  const dailyHistory: Record<string, DailyChallengeRecord> = {};
  if (stats.lastDailyDate) {
    dailyHistory[stats.lastDailyDate] = {
      date: stats.lastDailyDate,
      completed: true,
    };
  }

  return {
    version: 2,
    profile,
    progression,
    stats,
    history: [],
    settings,
    missions: [],
    cosmetics: { ...DEFAULT_COSMETICS },
    activeSession: null,
    dailyHistory,
    lastSavedAt: Date.now(),
  };
}

function getTitleForLevel(level: number): string {
  if (level >= 30) return "Grand Oracle Master";
  if (level >= 25) return "Arcade Legend";
  if (level >= 20) return "Master Mind";
  if (level >= 15) return "Oracle Whisperer";
  if (level >= 10) return "Intuition Expert";
  if (level >= 5) return "Skilled Guesser";
  if (level >= 2) return "Number Seeker";
  return "Apprentice Hunter";
}
