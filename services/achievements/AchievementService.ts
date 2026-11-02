import type {
  AdvancedAchievement,
  GameHistoryRecord,
  GameResult,
  PlayerStats,
} from "../../types/game";

export const EXPANDED_ACHIEVEMENTS: AdvancedAchievement[] = [
  // --- Standard & Preserved (Stage 1 or Standalone) ---
  {
    id: "first_win",
    title: "First Blood",
    description: "Win your first game in any mode",
    icon: "trophy",
    tier: "common",
    category: "general",
    rewardXp: 150,
    maxProgress: 1,
  },
  {
    id: "streak_3",
    title: "On Fire",
    description: "Win 3 games in a row",
    icon: "flame",
    tier: "rare",
    category: "general",
    rewardXp: 250,
    maxProgress: 3,
    stage: 1,
    maxStage: 3,
  },
  {
    id: "streak_7",
    title: "Unstoppable",
    description: "Win 7 games in a row",
    icon: "rocket",
    tier: "epic",
    category: "general",
    rewardXp: 600,
    maxProgress: 7,
    stage: 2,
    maxStage: 3,
  },
  {
    id: "streak_12",
    title: "Immortal Streak",
    description: "Win 12 consecutive matches without defeat",
    icon: "flame",
    tier: "legendary",
    category: "general",
    rewardXp: 1200,
    maxProgress: 12,
    stage: 3,
    maxStage: 3,
  },
  {
    id: "speed_demon",
    title: "Speed Demon",
    description: "Finish and win a game in under 15 seconds",
    icon: "flash",
    tier: "rare",
    category: "speed",
    rewardXp: 300,
    rewardTitle: "speed_demon_title",
  },
  {
    id: "efficient",
    title: "Mind Reader",
    description: "Win a match in 5 rounds or fewer",
    icon: "bulb",
    tier: "rare",
    category: "mastery",
    rewardXp: 300,
  },
  {
    id: "hard_master",
    title: "Hard Mode Hero",
    description: "Win a Hard or Expert game",
    icon: "skull",
    tier: "rare",
    category: "mastery",
    rewardXp: 350,
  },
  {
    id: "player_pro",
    title: "Number Hunter",
    description: "Win in You Guess mode",
    icon: "search",
    tier: "common",
    category: "general",
    rewardXp: 150,
  },
  {
    id: "daily_done",
    title: "Daily Devotee",
    description: "Complete a Daily Challenge",
    icon: "calendar",
    tier: "common",
    category: "general",
    rewardXp: 200,
  },
  {
    id: "games_25",
    title: "Quarter Century",
    description: "Play 25 total games",
    icon: "medal",
    tier: "rare",
    category: "endurance",
    rewardXp: 350,
    maxProgress: 25,
    stage: 1,
    maxStage: 3,
  },
  {
    id: "games_100",
    title: "Centurion",
    description: "Play 100 total games",
    icon: "ribbon",
    tier: "epic",
    category: "endurance",
    rewardXp: 800,
    maxProgress: 100,
    stage: 2,
    maxStage: 3,
  },
  {
    id: "games_250",
    title: "Living Archive",
    description: "Play 250 total games across the arcade",
    icon: "planet",
    tier: "legendary",
    category: "endurance",
    rewardXp: 1500,
    maxProgress: 250,
    stage: 3,
    maxStage: 3,
    rewardCosmeticId: "void_sovereign",
  },
  {
    id: "wins_10",
    title: "Consistent Victor",
    description: "Win 10 total games",
    icon: "trophy",
    tier: "common",
    category: "endurance",
    rewardXp: 200,
    maxProgress: 10,
    stage: 1,
    maxStage: 3,
  },
  {
    id: "wins_50",
    title: "Century Club Victor",
    description: "Win 50 total games",
    icon: "medal",
    tier: "epic",
    category: "endurance",
    rewardXp: 750,
    maxProgress: 50,
    stage: 2,
    maxStage: 3,
  },
  {
    id: "wins_150",
    title: "Grand Champion",
    description: "Win 150 total games across all modes",
    icon: "ribbon",
    tier: "legendary",
    category: "endurance",
    rewardXp: 1800,
    maxProgress: 150,
    stage: 3,
    maxStage: 3,
    rewardCosmeticId: "solar_gold",
  },
  {
    id: "high_score_1k",
    title: "Point Collector",
    description: "Score 1,000+ points in a single match",
    icon: "star",
    tier: "rare",
    category: "mastery",
    rewardXp: 300,
  },
  {
    id: "perfect_hintless",
    title: "No Help Needed",
    description: "Win without using any hints",
    icon: "eye-off",
    tier: "rare",
    category: "mastery",
    rewardXp: 300,
    rewardTitle: "flawless_hunter",
  },
  {
    id: "time_attack_master",
    title: "Clock Stopper",
    description: "Win a Time Attack game with >10s remaining",
    icon: "timer",
    tier: "rare",
    category: "speed",
    rewardXp: 350,
  },
  {
    id: "survival_veteran",
    title: "Survivalist",
    description: "Reach Wave 5 in Survival Mode",
    icon: "shield-checkmark",
    tier: "rare",
    category: "endurance",
    rewardXp: 400,
  },
  {
    id: "blitz_striker",
    title: "Blitz Champion",
    description: "Solve 5 or more numbers in Blitz Mode",
    icon: "flash",
    tier: "rare",
    category: "speed",
    rewardXp: 400,
  },
  {
    id: "puzzle_deducer",
    title: "Master Sleuth",
    description: "Solve a Logic Puzzle on first attempt",
    icon: "bulb",
    tier: "rare",
    category: "mastery",
    rewardXp: 400,
  },

  // --- Secret Achievements ---
  {
    id: "secret_one_shot",
    title: "Cosmic Coincidence",
    description: "Guess the secret number on your very first attempt!",
    icon: "sparkles",
    tier: "legendary",
    category: "secret",
    isSecret: true,
    secretHint: "Trust your immediate first instinct...",
    rewardXp: 1000,
  },
  {
    id: "secret_clutch",
    title: "Down to the Wire",
    description: "Win a match with only 1 life remaining!",
    icon: "heart",
    tier: "epic",
    category: "secret",
    isSecret: true,
    secretHint: "Survive on the edge of defeat...",
    rewardXp: 600,
  },
  {
    id: "secret_lightning",
    title: "Sub-Ten Prodigy",
    description: "Win a match in under 8 seconds!",
    icon: "flash",
    tier: "epic",
    category: "secret",
    isSecret: true,
    secretHint: "Blink and you'll miss it...",
    rewardXp: 750,
  },
  {
    id: "secret_expert_clean",
    title: "Ascendant Oracle",
    description: "Win an Expert match in 7 rounds or fewer with zero hints",
    icon: "diamond",
    tier: "legendary",
    category: "secret",
    isSecret: true,
    secretHint: "Pure mathematical mastery on the hardest tier...",
    rewardXp: 1500,
  },
];

export class AchievementService {
  /**
   * Returns all achievements annotated with current progress and unlock status.
   */
  static getDecoratedAchievements(
    stats: PlayerStats,
    history: GameHistoryRecord[],
  ): (AdvancedAchievement & { currentProgress: number; unlocked: boolean })[] {
    const unlockedSet = new Set(stats.unlockedAchievements);

    return EXPANDED_ACHIEVEMENTS.map((a) => {
      const unlocked = unlockedSet.has(a.id);
      let currentProgress = 0;

      if (a.id === "games_25" || a.id === "games_100" || a.id === "games_250") {
        currentProgress = Math.min(a.maxProgress ?? 100, stats.gamesPlayed);
      } else if (a.id === "wins_10" || a.id === "wins_50" || a.id === "wins_150") {
        currentProgress = Math.min(a.maxProgress ?? 150, stats.gamesWon);
      } else if (a.id === "streak_3" || a.id === "streak_7" || a.id === "streak_12") {
        currentProgress = Math.min(a.maxProgress ?? 12, stats.bestStreak);
      } else {
        currentProgress = unlocked ? (a.maxProgress ?? 1) : 0;
      }

      return {
        ...a,
        currentProgress,
        unlocked,
      };
    });
  }

  /**
   * Evaluates all achievement criteria against the player's performance.
   * Returns IDs of newly unlocked achievements.
   */
  static evaluateNewUnlocks(
    stats: PlayerStats,
    result: GameResult,
    history: GameHistoryRecord[],
  ): string[] {
    const unlocked = new Set(stats.unlockedAchievements);
    const newUnlocks: string[] = [];

    const award = (id: string) => {
      if (!unlocked.has(id)) {
        unlocked.add(id);
        newUnlocks.push(id);
      }
    };

    // Standard achievements
    if (result.won) {
      award("first_win");
      if (stats.currentStreak + 1 >= 3) award("streak_3");
      if (stats.currentStreak + 1 >= 7) award("streak_7");
      if (stats.currentStreak + 1 >= 12) award("streak_12");
      if (result.elapsedMs > 0 && result.elapsedMs <= 15000) award("speed_demon");
      if (result.rounds <= 5) award("efficient");
      if (result.difficulty === "hard" || result.difficulty === "expert") {
        award("hard_master");
      }
      if (result.mode === "player") award("player_pro");
      if (result.isDaily) award("daily_done");
      if (result.score >= 1000) award("high_score_1k");
      if (result.hintsUsed === 0) award("perfect_hintless");
      if (result.mode === "timeAttack") award("time_attack_master");
      if (result.mode === "logicPuzzle" && result.rounds === 1) award("puzzle_deducer");

      // Multi-stage wins
      const totalWinsAfter = stats.gamesWon + 1;
      if (totalWinsAfter >= 10) award("wins_10");
      if (totalWinsAfter >= 50) award("wins_50");
      if (totalWinsAfter >= 150) award("wins_150");

      // Secret achievements
      if (result.rounds === 1) {
        award("secret_one_shot");
      }
      if (result.elapsedMs > 0 && result.elapsedMs <= 8000) {
        award("secret_lightning");
      }
      if (
        result.difficulty === "expert" &&
        result.rounds <= 7 &&
        result.hintsUsed === 0
      ) {
        award("secret_expert_clean");
      }
    }

    // Games played thresholds
    const totalGamesAfter = stats.gamesPlayed + 1;
    if (totalGamesAfter >= 25) award("games_25");
    if (totalGamesAfter >= 100) award("games_100");
    if (totalGamesAfter >= 250) award("games_250");

    // Mode-specific milestones
    if (result.mode === "survival" && result.rounds >= 5) {
      award("survival_veteran");
    }
    if (result.mode === "blitz" && result.rounds >= 5) {
      award("blitz_striker");
    }

    return newUnlocks;
  }
}

