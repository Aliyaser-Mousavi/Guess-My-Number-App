// ==============================================================================
// Service: LeaderboardService.ts
// Description: Client SDK for querying server-authoritative global ranked leaderboards
//              and individual standing positions.
// ==============================================================================

import { supabase } from "@/lib/supabase";
import type { CompetitiveRankTier } from "@/types/game";

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarId: string;
  titleId: string;
  rating: number;
  tier: CompetitiveRankTier;
  division: string;
  rankedGamesPlayed: number;
  rankedGamesWon: number;
  winRate: number;
  currentWinStreak: number;
  globalRank: number;
}

export interface UserLeaderboardPosition {
  userId: string;
  displayName: string;
  avatarId: string;
  titleId: string;
  rating: number;
  tier: CompetitiveRankTier;
  division: string;
  rankedGamesPlayed: number;
  rankedGamesWon: number;
  winRate: number;
  globalRank: number;
}

export class LeaderboardService {
  /**
   * Fetches paginated global competitive leaderboard entries.
   */
  static async fetchGlobalRanked(
    limit = 50,
    offset = 0,
  ): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await supabase.rpc("get_ranked_leaderboard", {
        p_limit: limit,
        p_offset: offset,
      });

      if (error || !data) return [];

      return data.map((row: any) => ({
        userId: row.user_id,
        username: row.username,
        displayName: row.display_name,
        avatarId: row.avatar_id,
        titleId: row.title_id,
        rating: row.rating,
        tier: row.tier as CompetitiveRankTier,
        division: row.division || "",
        rankedGamesPlayed: row.ranked_games_played,
        rankedGamesWon: row.ranked_games_won,
        winRate: row.win_rate,
        currentWinStreak: row.current_win_streak,
        globalRank: Number(row.global_rank),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Fetches the current user's specific leaderboard rank position.
   */
  static async fetchUserPosition(
    userId: string,
  ): Promise<UserLeaderboardPosition | null> {
    try {
      const { data, error } = await supabase.rpc("get_user_leaderboard_position", {
        p_user_id: userId,
      });

      if (error || !data || data.length === 0) return null;

      const row = data[0];
      return {
        userId: row.user_id,
        displayName: row.display_name,
        avatarId: row.avatar_id,
        titleId: row.title_id,
        rating: row.rating,
        tier: row.tier as CompetitiveRankTier,
        division: row.division || "",
        rankedGamesPlayed: row.ranked_games_played,
        rankedGamesWon: row.ranked_games_won,
        winRate: row.win_rate,
        globalRank: Number(row.global_rank),
      };
    } catch {
      return null;
    }
  }
}

