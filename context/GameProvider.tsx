import {
  ACHIEVEMENTS,
  calculateScore,
  getDailySeed,
  getDifficulty,
  type DifficultyId,
  type GameMode,
} from "@/constants/gameConfig";
import {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  type GameResult,
  type PlayerStats,
  type Settings,
} from "@/types/game";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STATS_KEY = "@gmn/stats";
const SETTINGS_KEY = "@gmn/settings";

type GameContextValue = {
  stats: PlayerStats;
  settings: Settings;
  ready: boolean;
  newlyUnlocked: string[];
  clearNewlyUnlocked: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetStats: () => void;
  recordGame: (result: Omit<GameResult, "score"> & { score?: number }) => GameResult;
  buzz: (style?: "light" | "medium" | "success" | "error") => void;
  computeScore: (input: {
    rounds: number;
    elapsedMs: number;
    difficultyId: DifficultyId;
    hintsUsed: number;
    won: boolean;
    mode: GameMode;
  }) => number;
  isDailyDoneToday: boolean;
};

const GameContext = createContext<GameContextValue | null>(null);

function evaluateAchievements(
  stats: PlayerStats,
  result: GameResult,
): string[] {
  const unlocked = new Set(stats.unlockedAchievements);
  const add = (id: string) => {
    if (!unlocked.has(id)) unlocked.add(id);
  };

  if (result.won) {
    add("first_win");
    if (stats.currentStreak + 1 >= 3) add("streak_3");
    if (stats.currentStreak + 1 >= 7) add("streak_7");
    if (result.elapsedMs <= 15000) add("speed_demon");
    if (result.rounds <= 5) add("efficient");
    if (result.difficulty === "hard" || result.difficulty === "expert") {
      add("hard_master");
    }
    if (result.mode === "player") add("player_pro");
    if (result.isDaily) add("daily_done");
    if (result.score >= 1000) add("high_score_1k");
    if (result.hintsUsed === 0) add("perfect_hintless");
  }

  if (stats.gamesPlayed + 1 >= 25) add("games_25");
  if (stats.gamesPlayed + 1 >= 100) add("games_100");

  return ACHIEVEMENTS.map((a) => a.id).filter(
    (id) => unlocked.has(id) && !stats.unlockedAchievements.includes(id),
  );
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<PlayerStats>(DEFAULT_STATS);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [rawStats, rawSettings] = await Promise.all([
          AsyncStorage.getItem(STATS_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
        ]);
        if (rawStats) setStats({ ...DEFAULT_STATS, ...JSON.parse(rawStats) });
        if (rawSettings)
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) });
      } catch {
        // keep defaults
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persistStats = useCallback(async (next: PlayerStats) => {
    setStats(next);
    try {
      await AsyncStorage.setItem(STATS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const resetStats = useCallback(() => {
    persistStats(DEFAULT_STATS);
    setNewlyUnlocked([]);
  }, [persistStats]);

  const buzz = useCallback(
    (style: "light" | "medium" | "success" | "error" = "light") => {
      if (!settings.haptics) return;
      try {
        if (style === "success") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (style === "error") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else if (style === "medium") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch {
        // web / unsupported
      }
    },
    [settings.haptics],
  );

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

  const recordGame = useCallback(
    (partial: Omit<GameResult, "score"> & { score?: number }): GameResult => {
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

      const result: GameResult = { ...partial, score };
      const fresh = evaluateAchievements(stats, result);

      const key = `${result.mode}-${result.difficulty}` as const;
      const prevBest = stats.bestScores[key] ?? 0;

      const next: PlayerStats = {
        ...stats,
        gamesPlayed: stats.gamesPlayed + 1,
        gamesWon: stats.gamesWon + (result.won ? 1 : 0),
        totalRounds: stats.totalRounds + result.rounds,
        totalScore: stats.totalScore + score,
        bestScore: Math.max(stats.bestScore, score),
        currentStreak: result.won ? stats.currentStreak + 1 : 0,
        bestStreak: result.won
          ? Math.max(stats.bestStreak, stats.currentStreak + 1)
          : stats.bestStreak,
        fastestWinMs:
          result.won && result.elapsedMs > 0
            ? stats.fastestWinMs == null
              ? result.elapsedMs
              : Math.min(stats.fastestWinMs, result.elapsedMs)
            : stats.fastestWinMs,
        bestRounds:
          result.won
            ? stats.bestRounds == null
              ? result.rounds
              : Math.min(stats.bestRounds, result.rounds)
            : stats.bestRounds,
        dailyCompletions:
          stats.dailyCompletions + (result.isDaily && result.won ? 1 : 0),
        lastDailyDate:
          result.isDaily && result.won ? getDailySeed() : stats.lastDailyDate,
        unlockedAchievements: [
          ...stats.unlockedAchievements,
          ...fresh.filter((id) => !stats.unlockedAchievements.includes(id)),
        ],
        bestScores: {
          ...stats.bestScores,
          [key]: Math.max(prevBest, score),
        },
      };

      persistStats(next);
      if (fresh.length) setNewlyUnlocked(fresh);
      return result;
    },
    [computeScore, persistStats, stats],
  );

  const isDailyDoneToday = stats.lastDailyDate === getDailySeed();

  const value = useMemo(
    () => ({
      stats,
      settings,
      ready,
      newlyUnlocked,
      clearNewlyUnlocked: () => setNewlyUnlocked([]),
      updateSettings,
      resetStats,
      recordGame,
      buzz,
      computeScore,
      isDailyDoneToday,
    }),
    [
      stats,
      settings,
      ready,
      newlyUnlocked,
      updateSettings,
      resetStats,
      recordGame,
      buzz,
      computeScore,
      isDailyDoneToday,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
