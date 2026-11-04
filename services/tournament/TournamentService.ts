// ==============================================================================
// Service: TournamentService.ts
// Description: Client SDK for Weekly Tournaments, Tournament Leaderboards,
//              Participant Registrations, and Verified Attempt Tracking.
// ==============================================================================

import { supabase } from "@/lib/supabase";

export interface TournamentInfo {
  id: string;
  tournamentId: string;
  title: string;
  description: string;
  difficulty: string;
  minRange: number;
  maxRange: number;
  maxAttempts: number;
  startsAt: string;
  endsAt: string;
  status: "upcoming" | "active" | "completed";
  rewardTiers: Record<string, any>;
}

export interface TournamentParticipantInfo {
  id: string;
  tournamentId: string;
  userId: string;
  attemptsUsed: number;
  bestScore: number;
  bestRounds: number;
  bestElapsedMs: number;
  rewardsClaimed: boolean;
  lastAttemptAt?: string | null;
}

export interface TournamentLeaderboardEntry {
  userId: string;
  displayName: string;
  avatarId: string;
  titleId: string;
  bestScore: number;
  bestRounds: number;
  bestElapsedMs: number;
  attemptsUsed: number;
  tournamentRank: number;
}

export class TournamentService {
  /**
   * Fetches the current active weekly tournament.
   */
  static async fetchActiveTournament(): Promise<TournamentInfo | null> {
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("status", "active")
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        // Fallback deterministic tournament configuration if none found in DB
        return {
          id: "tournament_week_current",
          tournamentId: "tournament_week_current",
          title: "Weekly Oracle Championship",
          description: "Crack the Expert Oracle code in fewer rounds to conquer the global championship podium.",
          difficulty: "hard",
          minRange: 1,
          maxRange: 200,
          maxAttempts: 3,
          startsAt: new Date(Date.now() - 86400000).toISOString(),
          endsAt: new Date(Date.now() + 518400000).toISOString(),
          status: "active",
          rewardTiers: {
            top1: { xp: 1200, avatar: "cyber_crown" },
            top5: { xp: 600 },
            top20: { xp: 300 },
            participation: { xp: 100 },
          },
        };
      }

      return {
        id: data.id,
        tournamentId: data.tournament_id,
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        minRange: data.min_range,
        maxRange: data.max_range,
        maxAttempts: data.max_attempts,
        startsAt: data.starts_at,
        endsAt: data.ends_at,
        status: data.status,
        rewardTiers: data.reward_tiers || {},
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetches the user's participation stats for the active tournament.
   */
  static async fetchParticipant(tournamentId: string, userId: string): Promise<TournamentParticipantInfo | null> {
    try {
      const { data, error } = await supabase
        .from("tournament_participants")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        tournamentId: data.tournament_id,
        userId: data.user_id,
        attemptsUsed: data.attempts_used,
        bestScore: data.best_score,
        bestRounds: data.best_rounds,
        bestElapsedMs: data.best_elapsed_ms,
        rewardsClaimed: data.rewards_claimed,
        lastAttemptAt: data.last_attempt_at,
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetches the tournament leaderboard.
   */
  static async fetchLeaderboard(tournamentId: string, limit = 50, offset = 0): Promise<TournamentLeaderboardEntry[]> {
    try {
      const { data, error } = await supabase.rpc("get_tournament_leaderboard", {
        p_tournament_id: tournamentId,
        p_limit: limit,
        p_offset: offset,
      });

      if (error || !data) return [];

      return data.map((row: any) => ({
        userId: row.user_id,
        displayName: row.display_name || "Hunter",
        avatarId: row.avatar_id || "oracle_orb",
        titleId: row.title_id || "apprentice_hunter",
        bestScore: row.best_score,
        bestRounds: row.best_rounds,
        bestElapsedMs: row.best_elapsed_ms,
        attemptsUsed: row.attempts_used,
        tournamentRank: Number(row.tournament_rank),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Records a completed tournament attempt via server-authoritative verified RPC.
   */
  static async recordAttempt(params: {
    tournamentId: string;
    sessionId: string;
  }): Promise<{ success: boolean; bestScore?: number; attemptsRemaining?: number; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("record_verified_tournament_attempt", {
        p_tournament_id: params.tournamentId,
        p_session_id: params.sessionId,
      });

      if (error || !data) {
        return { success: false, error: error?.message || "Failed to record verified attempt." };
      }

      if (!data.success) {
        return { success: false, error: data.error || "Attempt could not be recorded." };
      }

      return {
        success: true,
        bestScore: data.best_score,
        attemptsRemaining: data.attempts_remaining,
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to record attempt." };
    }
  }
}

