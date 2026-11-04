// ==============================================================================
// Service: CompetitiveRatingService.ts
// Description: Client SDK for fetching server-authoritative player ratings,
//              tier progression, and competitive match history.
// ==============================================================================

import { supabase } from "@/lib/supabase";
import type { CompetitiveRankTier } from "@/types/game";

export interface PlayerRatingData {
  userId: string;
  rating: number;
  tier: CompetitiveRankTier;
  division: string;
  seasonId: number;
  rankedGamesPlayed: number;
  rankedGamesWon: number;
  bestRating: number;
  currentWinStreak: number;
  bestWinStreak: number;
  lastMatchAt: string | null;
}

export interface RatingHistoryEntry {
  id: string;
  sessionId: string;
  oldRating: number;
  newRating: number;
  ratingDelta: number;
  oldTier: string;
  newTier: string;
  matchOutcome: "win" | "loss" | "abandon";
  createdAt: string;
}

export const TIER_METADATA: Record<
  CompetitiveRankTier,
  { label: string; minRating: number; nextRating: number; color: string; icon: string }
> = {
  beginner: { label: "Beginner", minRating: 0, nextRating: 400, color: "#94A3B8", icon: "ellipse-outline" },
  bronze: { label: "Bronze", minRating: 400, nextRating: 1000, color: "#CD7F32", icon: "shield-outline" },
  silver: { label: "Silver", minRating: 1000, nextRating: 1800, color: "#C0C0C0", icon: "shield-half" },
  gold: { label: "Gold", minRating: 1800, nextRating: 2800, color: "#FFD700", icon: "shield" },
  platinum: { label: "Platinum", minRating: 2800, nextRating: 4000, color: "#00E5FF", icon: "diamond-outline" },
  diamond: { label: "Diamond", minRating: 4000, nextRating: 5500, color: "#B388FF", icon: "diamond" },
  master: { label: "Master", minRating: 5500, nextRating: 7200, color: "#FF5252", icon: "flame" },
  grandmaster: { label: "Grandmaster", minRating: 7200, nextRating: 10000, color: "#F59E0B", icon: "trophy" },
};

export class CompetitiveRatingService {
  /**
   * Fetches the player's server-authoritative competitive rating profile.
   */
  static async fetchPlayerRating(userId: string): Promise<PlayerRatingData | null> {
    try {
      const { data, error } = await supabase
        .from("player_ratings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        userId: data.user_id,
        rating: data.rating,
        tier: data.tier as CompetitiveRankTier,
        division: data.division || "",
        seasonId: data.season_id,
        rankedGamesPlayed: data.ranked_games_played,
        rankedGamesWon: data.ranked_games_won,
        bestRating: data.best_rating,
        currentWinStreak: data.current_win_streak,
        bestWinStreak: data.best_win_streak,
        lastMatchAt: data.last_match_at,
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetches the player's recent rating change ledger.
   */
  static async fetchRatingHistory(
    userId: string,
    limit = 20,
  ): Promise<RatingHistoryEntry[]> {
    try {
      const { data, error } = await supabase
        .from("rating_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error || !data) return [];

      return data.map((r: any) => ({
        id: r.id,
        sessionId: r.session_id,
        oldRating: r.old_rating,
        newRating: r.new_rating,
        ratingDelta: r.rating_delta,
        oldTier: r.old_tier,
        newTier: r.new_tier,
        matchOutcome: r.match_outcome,
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  }
}

