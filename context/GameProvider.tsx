import {
  calculateScore,
  getDailySeed,
  getDifficulty,
  type DifficultyId,
  type GameMode,
} from "@/constants/gameConfig";
import { useAuth } from "@/context/AuthProvider";
import {
  GameSessionManager,
  HistoryService,
  ProgressionService,
  StorageService,
  SoundService,
  type SoundEffect,
  AdaptiveDifficultyService,
  AnalyticsService,
  AchievementService,
  CosmeticsService,
  MissionService,
  CloudSyncService,
  SyncQueueService,
  SettingsSyncManager,
  EXPANDED_ACHIEVEMENTS,
  type DifficultyRecommendation,
  type CreateSessionParams,
} from "@/services";
import {
  LocalizationService,
  type TranslationKey,
} from "@/services/localization/LocalizationService";
import { NotificationService } from "@/services/notifications/NotificationService";
import {
  ThemeService,
  type ThemeColors,
  type ThemeDefinition,
} from "@/services/theme/ThemeService";
import {
  DEFAULT_STATE_V2,
  type AppStateV2,
  type CompetitiveRank,
  type CosmeticItem,
  type CosmeticsState,
  type CustomGameConfig,
  type DailyChallengeRecord,
  type GameHistoryRecord,
  type GameResult,
  type GameSession,
  type GuessFeedback,
  type MissionProgress,
  type PersonalBests,
  type PlayerProfile,
  type PlayerProgression,
  type PlayerStats,
  type Settings,
  type ThemeId,
} from "@/types/game";
import * as Haptics from "expo-haptics";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type GameContextValue = {
  // Existing Interface (100% Backward-Compatible)
  stats: PlayerStats;
  settings: Settings;
  ready: boolean;
  newlyUnlocked: string[];
  clearNewlyUnlocked: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetStats: () => void;
  recordGame: (
    result: Omit<GameResult, "score"> & {
      score?: number;
      sessionId?: string;
      minRange?: number;
      maxRange?: number;
      customConfig?: CustomGameConfig;
      player1Name?: string;
      player2Name?: string;
    },
  ) => GameResult;
  buzz: (style?: "light" | "medium" | "heavy" | "success" | "error") => void;
  playSound: (effect: SoundEffect) => void;
  computeScore: (input: {
    rounds: number;
    elapsedMs: number;
    difficultyId: DifficultyId;
    hintsUsed: number;
    won: boolean;
    mode: GameMode;
  }) => number;
  isDailyDoneToday: boolean;
  recommendation: DifficultyRecommendation | null;

  // New Extensible Foundation API
  profile: PlayerProfile;
  progression: PlayerProgression;
  competitiveRank: CompetitiveRank;
  missions: MissionProgress[];
  cosmetics: CosmeticsState;
  history: GameHistoryRecord[];
  dailyHistory: Record<string, DailyChallengeRecord>;
  personalBests: PersonalBests;
  activeSession: GameSession | null;
  levelUpEvent: { newLevel: number; levelsGained: number } | null;
  clearLevelUpEvent: () => void;
  claimMission: (missionId: string) => void;
  equipCosmetic: (item: CosmeticItem) => void;
  startSession: (params: CreateSessionParams) => GameSession;
  recordSessionGuess: (guess: number, feedback?: GuessFeedback) => void;
  recordSessionHint: () => void;
  abandonSession: () => void;

  // Group 06 Additions
  updateProfile: (patch: Partial<PlayerProfile>) => void;
  setTheme: (themeId: ThemeId) => void;
  theme: ThemeDefinition;
  themeColors: ThemeColors;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  formatNumber: (val: number | string | null | undefined) => string;
  formatDate: (val: number | Date) => string;
  isRTL: boolean;

  // Group 07B Additions (Cloud Sync)
  appState: AppStateV2;
  applyCloudSync: (patch: {
    settings?: Settings;
    achievements?: string[];
    cosmetics?: CosmeticsState;
    cloudProfile?: {
      level: number;
      xp: number;
      rank: string;
    };
    cloudHistory?: GameHistoryRecord[];
  }) => void;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [appState, setAppState] = useState<AppStateV2>(DEFAULT_STATE_V2);
  const [ready, setReady] = useState(false);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const [levelUpEvent, setLevelUpEvent] = useState<{
    newLevel: number;
    levelsGained: number;
  } | null>(null);

  const userIdRef = useRef<string | null>(user?.id ?? null);
  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  // Initialize and migrate storage on startup
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const loadedState = await StorageService.loadState();
        if (isMounted) {
          const refreshedMissions = MissionService.generateMissions(
            loadedState.missions ?? [],
          );
          const stateWithMissions: AppStateV2 = {
            ...loadedState,
            missions: refreshedMissions,
          };
          setAppState(stateWithMissions);
          SoundService.setEnabled(loadedState.settings.soundEnabled);
          SoundService.setVolume(loadedState.settings.soundVolume);
          NotificationService.syncAllReminders(loadedState.settings.notifications).catch(() => {});
        }
      } catch (err) {
        console.error("[GameProvider] Error loading state:", err);
      } finally {
        if (isMounted) {
          setReady(true);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update Settings with persistence and dirty-field tracking (SEC-05)
  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      SettingsSyncManager.markDirty(patch, userIdRef.current).catch(() => {});
      setAppState((prev) => {
        const nextSettings: Settings = { ...prev.settings, ...patch };
        if (patch.soundEnabled !== undefined) {
          SoundService.setEnabled(patch.soundEnabled);
        }
        if (patch.soundVolume !== undefined) {
          SoundService.setVolume(patch.soundVolume);
        }
        const nextState: AppStateV2 = {
          ...prev,
          settings: nextSettings,
        };
        StorageService.saveState(nextState).catch(() => {});
        return nextState;
      });
    },
    [],
  );

  // Sound playback
  const playSound = useCallback(
    (effect: SoundEffect) => {
      if (!appState.settings.soundEnabled) return;
      SoundService.play(effect).catch(() => {});
    },
    [appState.settings.soundEnabled],
  );

  // Reset Progress with persistence
  const resetStats = useCallback(() => {
    (async () => {
      try {
        const cleared = await StorageService.resetPlayerProgress(appState);
        setAppState(cleared);
        setNewlyUnlocked([]);
        setActiveSession(null);
      } catch (err) {
        console.error("[GameProvider] Reset error:", err);
      }
    })();
  }, [appState]);

  // Haptic feedback with intensity customization
  const buzz = useCallback(
    (
      style: "light" | "medium" | "heavy" | "success" | "error" = "light",
    ) => {
      if (!appState.settings.haptics) return;
      const intensity = appState.settings.hapticIntensity;

      try {
        if (style === "success") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
        }
        if (style === "error") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }

        // Apply intensity scaling
        if (intensity === "light") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (intensity === "heavy") {
          if (style === "light") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }
        } else {
          // Medium standard
          if (style === "heavy") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          } else if (style === "medium") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      } catch {
        // web or unsupported device
      }
    },
    [appState.settings.haptics, appState.settings.hapticIntensity],
  );

  // Score computation
  const computeScore = useCallback(
    (input: {
      rounds: number;
      elapsedMs: number;
      difficultyId: DifficultyId;
      hintsUsed: number;
      won: boolean;
      mode: GameMode;
    }) =>
      calculateScore({
        rounds: input.rounds,
        elapsedMs: input.elapsedMs,
        difficulty: getDifficulty(input.difficultyId),
        hintsUsed: input.hintsUsed,
        won: input.won,
        mode: input.mode,
      }),
    [],
  );

  // Session lifecycle: Start
  const startSession = useCallback(
    (params: CreateSessionParams): GameSession => {
      const session = GameSessionManager.createSession(params);
      setActiveSession(session);
      return session;
    },
    [],
  );

  // Session lifecycle: Guess
  const recordSessionGuess = useCallback(
    (guess: number, feedback?: GuessFeedback) => {
      setActiveSession((current) => {
        if (!current) return null;
        return GameSessionManager.addGuess(current, guess, feedback);
      });
    },
    [],
  );

  // Session lifecycle: Hint
  const recordSessionHint = useCallback(() => {
    setActiveSession((current) => {
      if (!current) return null;
      return GameSessionManager.recordHintUsage(current);
    });
  }, []);

  // Session lifecycle: Abandon
  const abandonSession = useCallback(() => {
    setActiveSession((current) => {
      if (!current) return null;
      return GameSessionManager.abandonSession(current);
    });
  }, []);

  // Server-authoritative Cloud Sync applicator
  const applyCloudSync = useCallback(
    (patch: {
      settings?: Settings;
      achievements?: string[];
      cosmetics?: CosmeticsState;
      cloudProfile?: {
        level: number;
        xp: number;
        rank: string;
      };
      cloudHistory?: GameHistoryRecord[];
    }) => {
      setAppState((prev) => {
        let changed = false;
        let nextSettings = prev.settings;
        if (patch.settings) {
          nextSettings = patch.settings;
          changed = true;
        }

        let nextStats = prev.stats;
        if (patch.achievements && patch.achievements.length > 0) {
          const mergedAch = Array.from(
            new Set([...prev.stats.unlockedAchievements, ...patch.achievements]),
          );
          if (mergedAch.length !== prev.stats.unlockedAchievements.length) {
            nextStats = { ...prev.stats, unlockedAchievements: mergedAch };
            changed = true;
          }
        }

        let nextCosmetics = prev.cosmetics;
        if (patch.cosmetics) {
          nextCosmetics = patch.cosmetics;
          changed = true;
        }

        let nextProgression = prev.progression;
        let nextProfile = prev.profile;
        if (patch.cloudProfile) {
          // Progression monotonically advances; never regress local progress from unverified lower cloud state
          const isHigher =
            patch.cloudProfile.level > prev.progression.level ||
            (patch.cloudProfile.level === prev.progression.level &&
              patch.cloudProfile.xp > prev.progression.totalXp);
          if (isHigher) {
            nextProgression = ProgressionService.fromLevelAndXp(
              patch.cloudProfile.level,
              patch.cloudProfile.xp,
              patch.cloudProfile.rank || prev.progression.rankTitle,
            );
            changed = true;
          }
        }

        let nextHistory = prev.history;
        if (patch.cloudHistory && patch.cloudHistory.length > 0) {
          const existingIds = new Set(
            prev.history.map((h) => h.sessionId || h.id),
          );
          const newItems = patch.cloudHistory.filter(
            (h) => !existingIds.has(h.sessionId || h.id),
          );
          if (newItems.length > 0) {
            nextHistory = [...newItems, ...prev.history].sort(
              (a, b) => b.timestamp - a.timestamp,
            );
            changed = true;
          }
        }

        if (!changed) return prev;

        const nextState: AppStateV2 = {
          ...prev,
          settings: nextSettings,
          stats: nextStats,
          cosmetics: nextCosmetics,
          progression: nextProgression,
          profile: nextProfile,
          history: nextHistory,
        };

        StorageService.saveState(nextState).catch(() => {});
        return nextState;
      });
    },
    [],
  );

  // Record completed game with duplicate guard, progression XP, and history logging
  const recordGame = useCallback(
    (
      partial: Omit<GameResult, "score"> & {
        score?: number;
        sessionId?: string;
        minRange?: number;
        maxRange?: number;
        customConfig?: CustomGameConfig;
        player1Name?: string;
        player2Name?: string;
      },
    ): GameResult => {
      const score =
        partial.score ??
        computeScore({
          rounds: partial.rounds,
          elapsedMs: partial.elapsedMs,
          difficultyId: partial.difficulty,
          hintsUsed: partial.hintsUsed,
          won: partial.won,
          mode: partial.mode,
        });

      // Complete active session and prevent duplicate registration
      let finalResult: GameResult;
      if (activeSession) {
        const completion = GameSessionManager.completeSession(activeSession, {
          sessionId: partial.sessionId,
          won: partial.won,
          rounds: partial.rounds,
          score,
          elapsedMs: partial.elapsedMs,
          secretNumber: partial.secretNumber,
          userNumber: partial.userNumber,
          isRanked: partial.isRanked,
          isServerVerified: partial.isServerVerified,
          ratingDelta: partial.ratingDelta,
          newRating: partial.newRating,
          newTier: partial.newTier,
        });

        if (completion.isDuplicate) {
          return completion.result;
        }
        finalResult = completion.result;
        setActiveSession(null);
      } else {
        finalResult = { ...partial, score };
      }

      // Evaluate Achievements using expanded achievement service
      const freshAchievements = AchievementService.evaluateNewUnlocks(
        appState.stats,
        finalResult,
        appState.history,
      );

      const key = `${finalResult.mode}-${finalResult.difficulty}` as const;
      const prevBest = appState.stats.bestScores[key] ?? 0;

      // Update Player Stats
      const nextStats: PlayerStats = {
        ...appState.stats,
        gamesPlayed: appState.stats.gamesPlayed + 1,
        gamesWon: appState.stats.gamesWon + (finalResult.won ? 1 : 0),
        totalRounds: appState.stats.totalRounds + finalResult.rounds,
        totalScore: appState.stats.totalScore + score,
        bestScore: Math.max(appState.stats.bestScore, score),
        currentStreak: finalResult.won ? appState.stats.currentStreak + 1 : 0,
        bestStreak: finalResult.won
          ? Math.max(appState.stats.bestStreak, appState.stats.currentStreak + 1)
          : appState.stats.bestStreak,
        fastestWinMs:
          finalResult.won && finalResult.elapsedMs > 0
            ? appState.stats.fastestWinMs == null
              ? finalResult.elapsedMs
              : Math.min(appState.stats.fastestWinMs, finalResult.elapsedMs)
            : appState.stats.fastestWinMs,
        bestRounds:
          finalResult.won
            ? appState.stats.bestRounds == null
              ? finalResult.rounds
              : Math.min(appState.stats.bestRounds, finalResult.rounds)
            : appState.stats.bestRounds,
        dailyCompletions:
          appState.stats.dailyCompletions +
          (finalResult.isDaily && finalResult.won ? 1 : 0),
        lastDailyDate:
          finalResult.isDaily && finalResult.won
            ? getDailySeed()
            : appState.stats.lastDailyDate,
        unlockedAchievements: [
          ...appState.stats.unlockedAchievements,
          ...freshAchievements.filter(
            (id) => !appState.stats.unlockedAchievements.includes(id),
          ),
        ],
        bestScores: {
          ...appState.stats.bestScores,
          [key]: Math.max(prevBest, score),
        },
      };

      // Update Missions
      const { updatedMissions } = MissionService.evaluateMissionProgress(
        appState.missions,
        finalResult,
        nextStats,
      );

      // Award Progression XP (Match XP + Achievement bonus XP)
      const baseMatchXp = ProgressionService.calculateXpGained(finalResult);
      let achievementXp = 0;
      for (const achId of freshAchievements) {
        const found = EXPANDED_ACHIEVEMENTS.find((a) => a.id === achId);
        if (found) achievementXp += found.rewardXp;
      }
      const totalXpAwarded = baseMatchXp + achievementXp;

      const { next: nextProgression, didLevelUp, levelsGained } =
        ProgressionService.applyXp(appState.progression, totalXpAwarded);

      if (didLevelUp) {
        setLevelUpEvent({
          newLevel: nextProgression.level,
          levelsGained,
        });
      }

      // Append to Match History
      const historyRecord = HistoryService.createRecord(finalResult, {
        minRange: partial.minRange,
        maxRange: partial.maxRange,
        customConfig: partial.customConfig,
        player1Name: partial.player1Name,
        player2Name: partial.player2Name,
      });
      const nextHistory = HistoryService.appendRecord(
        appState.history,
        historyRecord,
      );

      // Update Daily History if applicable
      const nextDailyHistory = { ...appState.dailyHistory };
      if (finalResult.isDaily && finalResult.won) {
        const seed = getDailySeed();
        nextDailyHistory[seed] = {
          date: seed,
          completed: true,
          score,
          rounds: finalResult.rounds,
          elapsedMs: finalResult.elapsedMs,
        };
      }

      // Persist state atomically
      const nextAppState: AppStateV2 = {
        ...appState,
        stats: nextStats,
        progression: nextProgression,
        missions: updatedMissions,
        history: nextHistory,
        dailyHistory: nextDailyHistory,
        activeSession: null,
      };

      setAppState(nextAppState);
      StorageService.saveState(nextAppState).catch((err) => {
        console.error("[GameProvider] Error saving state:", err);
      });

      // Server-authoritative Cloud Sync & Offline Queue (SEC-01, SEC-03, SEC-06)
      // Skip client upload if session is already server-verified to prevent duplicate records
      if (user?.id && !finalResult.isServerVerified) {
        CloudSyncService.uploadSession(historyRecord, user.id)
          .then((res) => {
            if (!res.success) {
              SyncQueueService.enqueue("session", historyRecord, user.id).catch(
                () => {},
              );
            }
          })
          .catch(() => {
            SyncQueueService.enqueue("session", historyRecord, user.id).catch(
              () => {},
            );
          });
      }

      if (freshAchievements.length > 0) {
        setNewlyUnlocked(freshAchievements);
        playSound("achievement");
      }

      if (finalResult.won) {
        playSound("victory");
      } else {
        playSound("defeat");
      }

      return finalResult;
    },
    [activeSession, appState, computeScore, playSound, user],
  );

  const isDailyDoneToday = appState.stats.lastDailyDate === getDailySeed();

  const recommendation = useMemo(
    () =>
      AdaptiveDifficultyService.getRecommendation(
        appState.history,
        appState.stats,
      ),
    [appState.history, appState.stats],
  );

  const personalBests = useMemo(
    () =>
      AnalyticsService.calculatePersonalBests(
        appState.history,
        appState.stats,
      ),
    [appState.history, appState.stats],
  );

  const competitiveRank = useMemo(
    () =>
      ProgressionService.calculateCompetitiveRank(
        appState.stats,
        appState.history,
      ),
    [appState.stats, appState.history],
  );

  const claimMission = useCallback((missionId: string) => {
    setAppState((prev) => {
      const { updatedMissions, reward } = MissionService.claimMissionReward(
        prev.missions,
        missionId,
      );
      if (!reward) return prev;

      const { next: nextProgression, didLevelUp, levelsGained } =
        ProgressionService.applyXp(prev.progression, reward.xp);

      if (didLevelUp) {
        setLevelUpEvent({
          newLevel: nextProgression.level,
          levelsGained,
        });
      }

      const nextCosmetics = { ...prev.cosmetics };
      if (
        reward.cosmeticId &&
        !nextCosmetics.unlockedAvatars.includes(reward.cosmeticId)
      ) {
        nextCosmetics.unlockedAvatars = [
          ...nextCosmetics.unlockedAvatars,
          reward.cosmeticId,
        ];
      }
      if (
        reward.titleId &&
        !(nextCosmetics.unlockedTitles ?? []).includes(reward.titleId)
      ) {
        nextCosmetics.unlockedTitles = [
          ...(nextCosmetics.unlockedTitles ?? []),
          reward.titleId,
        ];
      }

      const nextState: AppStateV2 = {
        ...prev,
        missions: updatedMissions,
        progression: nextProgression,
        cosmetics: nextCosmetics,
      };

      StorageService.saveState(nextState).catch(() => {});
      return nextState;
    });
  }, []);

  const equipCosmetic = useCallback((item: CosmeticItem) => {
    setAppState((prev) => {
      const { nextCosmetics, nextProfile } = CosmeticsService.equip(
        item,
        prev.cosmetics,
        prev.profile,
      );
      const nextState: AppStateV2 = {
        ...prev,
        cosmetics: nextCosmetics,
        profile: nextProfile,
      };
      StorageService.saveState(nextState).catch(() => {});
      return nextState;
    });
  }, []);

  const updateProfile = useCallback((patch: Partial<PlayerProfile>) => {
    setAppState((prev) => {
      const nextProfile: PlayerProfile = {
        ...prev.profile,
        ...patch,
        updatedAt: Date.now(),
      };
      const nextState: AppStateV2 = {
        ...prev,
        profile: nextProfile,
      };
      StorageService.saveState(nextState).catch(() => {});
      return nextState;
    });
  }, []);

  const setTheme = useCallback(
    (themeId: ThemeId) => {
      updateSettings({ themeId });
    },
    [updateSettings],
  );

  const theme = useMemo(
    () => ThemeService.getTheme(appState.settings.themeId),
    [appState.settings.themeId],
  );

  const themeColors = useMemo(
    () =>
      ThemeService.resolveColors(appState.settings.themeId, {
        highContrast: appState.settings.highContrast,
        colorBlindMode: appState.settings.colorBlindMode,
      }),
    [
      appState.settings.themeId,
      appState.settings.highContrast,
      appState.settings.colorBlindMode,
    ],
  );

  const isRTL = useMemo(
    () => LocalizationService.isRTL(appState.settings.language),
    [appState.settings.language],
  );

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      LocalizationService.t(key, appState.settings.language, params),
    [appState.settings.language],
  );

  const formatNumber = useCallback(
    (val: number | string | null | undefined) =>
      LocalizationService.formatNumber(val, appState.settings.digitFormat),
    [appState.settings.digitFormat],
  );

  const formatDate = useCallback(
    (val: number | Date) =>
      LocalizationService.formatDate(val, appState.settings.language),
    [appState.settings.language],
  );

  const value = useMemo(
    () => ({
      stats: appState.stats,
      settings: appState.settings,
      profile: appState.profile,
      progression: appState.progression,
      competitiveRank,
      missions: appState.missions,
      cosmetics: appState.cosmetics,
      history: appState.history,
      dailyHistory: appState.dailyHistory,
      personalBests,
      activeSession,
      levelUpEvent,
      clearLevelUpEvent: () => setLevelUpEvent(null),
      ready,
      newlyUnlocked,
      clearNewlyUnlocked: () => setNewlyUnlocked([]),
      updateSettings,
      resetStats,
      recordGame,
      buzz,
      playSound,
      recommendation,
      computeScore,
      isDailyDoneToday,
      claimMission,
      equipCosmetic,
      startSession,
      recordSessionGuess,
      recordSessionHint,
      abandonSession,
      updateProfile,
      setTheme,
      theme,
      themeColors,
      t,
      formatNumber,
      formatDate,
      isRTL,
      appState,
      applyCloudSync,
    }),
    [
      appState,
      competitiveRank,
      personalBests,
      activeSession,
      levelUpEvent,
      ready,
      newlyUnlocked,
      updateSettings,
      resetStats,
      recordGame,
      buzz,
      playSound,
      recommendation,
      computeScore,
      isDailyDoneToday,
      claimMission,
      equipCosmetic,
      startSession,
      recordSessionGuess,
      recordSessionHint,
      abandonSession,
      updateProfile,
      setTheme,
      theme,
      themeColors,
      t,
      formatNumber,
      formatDate,
      isRTL,
      applyCloudSync,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
