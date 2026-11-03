import Colors from "@/constants/colors";
import type {
  CompetitiveRank,
  CompetitiveRankTier,
  GameHistoryRecord,
  GameResult,
  PlayerProgression,
  PlayerStats,
} from "../../types/game";

export class ProgressionService {
  /**
   * Calculates XP awarded for completing a match.
   * Balanced across win/loss, performance speed, accuracy, difficulty, and mode.
   */
  static calculateXpGained(result: GameResult): number {
    if (!result.won) {
      // Consolation XP for effort (rounds played)
      return Math.min(40, Math.max(10, Math.floor(result.rounds * 5)));
    }

    // Base win XP
    let base = 120;

    // Difficulty multiplier
    const difficultyMultiplier: Record<string, number> = {
      novice: 0.8,
      easy: 1.0,
      medium: 1.5,
      hard: 2.2,
      expert: 3.5,
    };
    const diffMult = difficultyMultiplier[result.difficulty] ?? 1.0;

    // Mode multiplier
    const modeMultiplier: Record<string, number> = {
      player: 1.1,
      opponent: 1.0,
      timeAttack: 1.25,
      survival: 1.35,
      blitz: 1.3,
      logicPuzzle: 1.4,
      passAndPlay: 1.0,
      custom: 0.9,
    };
    const modeMult = modeMultiplier[result.mode] ?? 1.0;

    // Score factor (1 XP per 12 score points)
    const scoreXp = Math.floor(result.score * 0.08);

    // Speed bonus: Under 20s or 40s
    let speedBonus = 0;
    if (result.elapsedMs > 0 && result.elapsedMs < 20000) {
      speedBonus = 80;
    } else if (result.elapsedMs > 0 && result.elapsedMs < 40000) {
      speedBonus = 40;
    }

    // Efficiency bonus: 5 rounds or fewer
    const efficiencyBonus = result.rounds <= 5 ? 75 : result.rounds <= 7 ? 35 : 0;

    // Hintless bonus
    const hintlessBonus = result.hintsUsed === 0 ? 50 : 0;

    // Daily challenge completion bonus
    const dailyBonus = result.isDaily ? 120 : 0;

    const raw =
      (base + scoreXp + speedBonus + efficiencyBonus + hintlessBonus + dailyBonus) *
      diffMult *
      modeMult;

    return Math.max(30, Math.floor(raw));
  }

  /**
   * Applies gained XP to current player progression, calculating any level ups (Level 1 to 100).
   */
  static applyXp(
    current: PlayerProgression,
    xpGained: number,
  ): { next: PlayerProgression; didLevelUp: boolean; levelsGained: number } {
    let level = current.level;
    let currentXp = current.currentXp + xpGained;
    const totalXp = current.totalXp + xpGained;

    let didLevelUp = false;
    let levelsGained = 0;

    // Progression curve for levels 1 to 100
    let nextThreshold = this.getXpThresholdForLevel(level);

    while (currentXp >= nextThreshold && level < 100) {
      currentXp -= nextThreshold;
      level += 1;
      levelsGained += 1;
      didLevelUp = true;
      nextThreshold = this.getXpThresholdForLevel(level);
    }

    // If capped at level 100
    if (level >= 100) {
      currentXp = Math.min(currentXp, nextThreshold);
    }

    return {
      next: {
        level,
        currentXp,
        nextLevelXp: nextThreshold,
        totalXp,
        rankTitle: this.getRankTitle(level),
      },
      didLevelUp,
      levelsGained,
    };
  }

  /**
   * Returns XP required to complete a given level (smooth, engaging curve).
   */
  static getXpThresholdForLevel(level: number): number {
    if (level >= 100) return 15000;
    // Formula: 400 base + linear growth + fractional exponential
    return Math.floor(400 + (level - 1) * 120 + Math.pow(level - 1, 1.5) * 25);
  }

  /**
   * Reconstructs full PlayerProgression given authoritative level and total XP.
   */
  static fromLevelAndXp(
    level: number,
    totalXp: number,
    rankTitle?: string,
  ): PlayerProgression {
    const nextLevelXp = this.getXpThresholdForLevel(level);
    let cumulative = 0;
    for (let l = 1; l < level; l++) {
      cumulative += this.getXpThresholdForLevel(l);
    }
    const currentXp = Math.max(0, Math.min(totalXp - cumulative, nextLevelXp));

    return {
      level,
      currentXp,
      nextLevelXp,
      totalXp,
      rankTitle: rankTitle || this.getRankTitle(level),
    };
  }

  /**
   * Prestige titles awarded based on player level.
   */
  static getRankTitle(level: number): string {
    if (level >= 100) return "Living Legend";
    if (level >= 75) return "Omniscient Oracle";
    if (level >= 60) return "Arcade Sovereign";
    if (level >= 50) return "Grandmaster Mind";
    if (level >= 40) return "Master Tactician";
    if (level >= 30) return "Oracle Whisperer";
    if (level >= 25) return "Arcade Legend";
    if (level >= 20) return "Master Mind";
    if (level >= 15) return "Intuition Expert";
    if (level >= 10) return "Code Breaker";
    if (level >= 5) return "Skilled Guesser";
    if (level >= 2) return "Number Seeker";
    return "Apprentice Hunter";
  }

  /**
   * Calculates transparent Competitive Rating (CR / MMR) and Competitive Rank.
   * Determined strictly by performance: wins, win rate, difficulty mastery, streaks, and mode challenges.
   */
  static calculateCompetitiveRank(
    stats: PlayerStats,
    history: GameHistoryRecord[],
  ): CompetitiveRank {
    let rating = 0;

    // 1. Win Points (up to 1,500 pts)
    rating += Math.min(1500, stats.gamesWon * 25);

    // 2. Win Rate Factor (scaled with games played, up to 1,000 pts)
    if (stats.gamesPlayed >= 3) {
      const winRateRatio = stats.gamesWon / Math.max(stats.gamesPlayed, 1);
      const confidence = Math.min(1, stats.gamesPlayed / 15);
      rating += Math.floor(winRateRatio * 1000 * confidence);
    }

    // 3. Difficulty Mastery from History (up to 2,000 pts)
    let diffPoints = 0;
    let bestSurvival = 0;
    let bestBlitz = 0;

    for (const rec of history) {
      if (rec.won) {
        if (rec.difficulty === "medium") diffPoints += 15;
        else if (rec.difficulty === "hard") diffPoints += 40;
        else if (rec.difficulty === "expert") diffPoints += 75;
      }
      if (rec.mode === "survival") {
        bestSurvival = Math.max(bestSurvival, rec.rounds);
      } else if (rec.mode === "blitz") {
        bestBlitz = Math.max(bestBlitz, rec.rounds);
      }
    }
    rating += Math.min(2000, diffPoints);

    // 4. Streak Multiplier (up to 500 pts)
    rating += Math.min(500, stats.bestStreak * 50);

    // 5. Special Mode Mastery (Survival wave up to 800 pts, Blitz up to 700 pts)
    rating += Math.min(800, bestSurvival * 90);
    rating += Math.min(700, bestBlitz * 70);

    // Determine Tier & Division
    const tiers: {
      tier: CompetitiveRankTier;
      label: string;
      minRating: number;
      nextRating: number;
      color: string;
      icon: string;
    }[] = [
      {
        tier: "beginner",
        label: "Beginner",
        minRating: 0,
        nextRating: 400,
        color: "#94A3B8",
        icon: "ellipse-outline",
      },
      {
        tier: "bronze",
        label: "Bronze",
        minRating: 400,
        nextRating: 1000,
        color: "#CD7F32",
        icon: "shield-outline",
      },
      {
        tier: "silver",
        label: "Silver",
        minRating: 1000,
        nextRating: 1800,
        color: "#C0C0C0",
        icon: "shield-half",
      },
      {
        tier: "gold",
        label: "Gold",
        minRating: 1800,
        nextRating: 2800,
        color: "#FFD700",
        icon: "shield",
      },
      {
        tier: "platinum",
        label: "Platinum",
        minRating: 2800,
        nextRating: 4000,
        color: "#00E5FF",
        icon: "diamond-outline",
      },
      {
        tier: "diamond",
        label: "Diamond",
        minRating: 4000,
        nextRating: 5500,
        color: "#B388FF",
        icon: "diamond",
      },
      {
        tier: "master",
        label: "Master",
        minRating: 5500,
        nextRating: 7200,
        color: "#FF5252",
        icon: "flame",
      },
      {
        tier: "grandmaster",
        label: "Grandmaster",
        minRating: 7200,
        nextRating: 10000,
        color: Colors.accent,
        icon: "trophy",
      },
    ];

    let currentTier = tiers[0];
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (rating >= tiers[i].minRating) {
        currentTier = tiers[i];
        break;
      }
    }

    // Calculate sub-division: III, II, I (except Grandmaster)
    let division = "";
    if (currentTier.tier !== "grandmaster" && currentTier.tier !== "beginner") {
      const tierRange = currentTier.nextRating - currentTier.minRating;
      const progressInTier = rating - currentTier.minRating;
      const third = tierRange / 3;
      if (progressInTier < third) division = "III";
      else if (progressInTier < third * 2) division = "II";
      else division = "I";
    }

    const tierRange = Math.max(1, currentTier.nextRating - currentTier.minRating);
    const progressPercent = Math.min(
      100,
      Math.max(
        0,
        Math.round(((rating - currentTier.minRating) / tierRange) * 100),
      ),
    );

    return {
      tier: currentTier.tier,
      label: division ? `${currentTier.label} ${division}` : currentTier.label,
      rating,
      minRating: currentTier.minRating,
      nextTierRating: currentTier.nextRating,
      tierColor: currentTier.color,
      tierIcon: currentTier.icon,
      division,
      progressPercent,
    };
  }
}
