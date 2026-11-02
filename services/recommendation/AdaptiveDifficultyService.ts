import type { DifficultyId } from "@/constants/gameConfig";
import type { GameHistoryRecord, PlayerStats } from "@/types/game";

export type DifficultyRecommendation = {
  recommendedDifficulty: DifficultyId;
  currentDifficulty: DifficultyId;
  reason: string;
  badge: string;
  winRate: number;
};

export class AdaptiveDifficultyService {
  /**
   * Evaluates the player's recent match history and statistics to suggest an optimal difficulty.
   */
  static getRecommendation(
    history: GameHistoryRecord[],
    stats: PlayerStats,
  ): DifficultyRecommendation | null {
    if (history.length < 3) return null;

    // Filter to last 10 games
    const recent = history.slice(0, 10);

    // Group by difficulty
    const byDiff: Record<
      DifficultyId,
      { played: number; won: number; consecutiveLosses: number }
    > = {
      easy: { played: 0, won: 0, consecutiveLosses: 0 },
      medium: { played: 0, won: 0, consecutiveLosses: 0 },
      hard: { played: 0, won: 0, consecutiveLosses: 0 },
      expert: { played: 0, won: 0, consecutiveLosses: 0 },
    };

    for (const game of recent) {
      if (byDiff[game.difficulty]) {
        byDiff[game.difficulty].played += 1;
        if (game.won) {
          byDiff[game.difficulty].won += 1;
        }
      }
    }

    // Check consecutive recent losses in expert or hard
    let hardLossStreak = 0;
    for (const g of recent) {
      if ((g.difficulty === "hard" || g.difficulty === "expert") && !g.won) {
        hardLossStreak += 1;
      } else {
        break;
      }
    }

    if (hardLossStreak >= 3) {
      return {
        recommendedDifficulty: "medium",
        currentDifficulty: "hard",
        reason: "Facing tough numbers? Reset your rhythm on Medium (1–100) with 2 hints to rebuild your streak.",
        badge: "TACTICAL RESET",
        winRate: 0,
      };
    }

    // Progression: Easy -> Medium
    if (byDiff.easy.played >= 3) {
      const rate = byDiff.easy.won / byDiff.easy.played;
      if (rate >= 0.7) {
        return {
          recommendedDifficulty: "medium",
          currentDifficulty: "easy",
          reason: `You've mastered Easy with a ${Math.round(rate * 100)}% win rate! Step up to Medium for a 1.5x score bonus.`,
          badge: "RECOMMENDED UPGRADE",
          winRate: Math.round(rate * 100),
        };
      }
    }

    // Progression: Medium -> Hard
    if (byDiff.medium.played >= 3) {
      const rate = byDiff.medium.won / byDiff.medium.played;
      if (rate >= 0.7) {
        return {
          recommendedDifficulty: "hard",
          currentDifficulty: "medium",
          reason: `Outstanding ${Math.round(rate * 100)}% win rate on Medium! Challenge Hard mode (1–200) for a 2.25x score multiplier.`,
          badge: "SKILL PROMOTION",
          winRate: Math.round(rate * 100),
        };
      }
    }

    // Progression: Hard -> Expert
    if (byDiff.hard.played >= 3) {
      const rate = byDiff.hard.won / byDiff.hard.played;
      if (rate >= 0.65) {
        return {
          recommendedDifficulty: "expert",
          currentDifficulty: "hard",
          reason: `Elite hunter detected (${Math.round(rate * 100)}% on Hard). Test your deduction on Expert (1–500) for maximum rewards!`,
          badge: "MASTER TIER",
          winRate: Math.round(rate * 100),
        };
      }
    }

    return null;
  }
}

