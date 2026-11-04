// ==============================================================================
// Service: MultiplayerService.ts
// Description: Client SDK for Real-Time 1v1 Online Multiplayer, Private Rooms,
//              Matchmaking, and Real-Time State Subscriptions.
// ==============================================================================

import { supabase } from "@/lib/supabase";
import type { DifficultyId } from "@/constants/gameConfig";

export interface OpponentInfo {
  id: string;
  displayName: string;
  avatarId: string;
  titleId: string;
  rating: number;
  tier: string;
}

export interface OpponentProgress {
  rounds: number;
  livesRemaining: number;
  lowBound?: number;
  highBound?: number;
  solved: boolean;
}

export interface MultiplayerMatchState {
  matchId: string;
  status: "waiting" | "lobby" | "countdown" | "in_progress" | "completed" | "abandoned" | "cancelled";
  minRange: number;
  maxRange: number;
  livesRemaining: number;
  hintsRemaining: number;
  opponent?: OpponentInfo;
  roomCode?: string;
  playerAReady?: boolean;
  playerBReady?: boolean;
  winnerId?: string | null;
  opponentProgress?: OpponentProgress;
}

export class MultiplayerService {
  /**
   * Joins the skill-based matchmaking queue.
   */
  static async joinQueue(difficulty: DifficultyId = "medium"): Promise<{
    success: boolean;
    status: "queued" | "matched" | "error";
    matchId?: string;
    opponent?: OpponentInfo;
    minRange?: number;
    maxRange?: number;
    livesRemaining?: number;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke("matchmaking", {
        body: { action: "join", difficulty },
      });

      if (error || !data) {
        return { success: false, status: "error", error: error?.message || "Failed to join queue." };
      }

      return {
        success: true,
        status: data.status,
        matchId: data.matchId,
        opponent: data.opponent,
        minRange: data.minRange,
        maxRange: data.maxRange,
        livesRemaining: data.livesRemaining,
      };
    } catch (err: any) {
      return { success: false, status: "error", error: err.message || "Network error joining queue." };
    }
  }

  /**
   * Polls queue status for matched opponent.
   */
  static async pollQueue(): Promise<{
    status: "queued" | "matched" | "timeout" | "none" | "error";
    matchId?: string;
    opponent?: OpponentInfo;
    minRange?: number;
    maxRange?: number;
    livesRemaining?: number;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke("matchmaking", {
        body: { action: "poll" },
      });

      if (error || !data) {
        return { status: "error", error: error?.message || "Failed to poll queue." };
      }

      return data;
    } catch (err: any) {
      return { status: "error", error: err.message || "Network error polling queue." };
    }
  }

  /**
   * Cancels active queue entry.
   */
  static async cancelQueue(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke("matchmaking", {
        body: { action: "cancel" },
      });
      return !error && Boolean(data?.success);
    } catch {
      return false;
    }
  }

  /**
   * Creates a private room with a 6-character room code.
   */
  static async createPrivateRoom(difficulty: DifficultyId = "medium"): Promise<{
    success: boolean;
    roomCode?: string;
    matchId?: string;
    difficulty?: DifficultyId;
    minRange?: number;
    maxRange?: number;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke("matchmaking", {
        body: { action: "create_room", difficulty },
      });

      if (error || !data || !data.success) {
        return { success: false, error: error?.message || data?.error || "Failed to create room." };
      }

      return {
        success: true,
        roomCode: data.roomCode,
        matchId: data.matchId,
        difficulty: data.difficulty,
        minRange: data.minRange,
        maxRange: data.maxRange,
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error creating room." };
    }
  }

  /**
   * Joins an existing private room using its 6-character code.
   */
  static async joinPrivateRoom(roomCode: string): Promise<{
    success: boolean;
    matchId?: string;
    roomCode?: string;
    difficulty?: DifficultyId;
    minRange?: number;
    maxRange?: number;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke("matchmaking", {
        body: { action: "join_room", roomCode },
      });

      if (error || !data || !data.success) {
        return { success: false, error: error?.message || data?.error || "Failed to join room." };
      }

      return {
        success: true,
        matchId: data.matchId,
        roomCode: data.roomCode,
        difficulty: data.difficulty,
        minRange: data.minRange,
        maxRange: data.maxRange,
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error joining room." };
    }
  }

  /**
   * Toggles ready state in private lobby.
   */
  static async toggleReady(matchId: string, ready: boolean): Promise<{
    success: boolean;
    playerAReady?: boolean;
    playerBReady?: boolean;
    status?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke("matchmaking", {
        body: { action: "ready_toggle", matchId, ready },
      });

      if (error || !data) {
        return { success: false, error: error?.message || "Failed to update ready state." };
      }

      return data;
    } catch (err: any) {
      return { success: false, error: err.message || "Network error toggling ready." };
    }
  }

  /**
   * Leaves or cancels an active private room.
   */
  static async leavePrivateRoom(matchId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke("matchmaking", {
        body: { action: "leave_room", matchId },
      });
      return !error && Boolean(data?.success);
    } catch {
      return false;
    }
  }

  /**
   * Submits a guess in an active 1v1 multiplayer match.
   */
  static async submitGuess(matchId: string, guess: number): Promise<{
    success: boolean;
    feedback?: "low" | "high" | "correct";
    won?: boolean;
    isGameOver?: boolean;
    winnerId?: string;
    secretNumber?: number;
    livesRemaining?: number;
    rounds?: number;
    lowBound?: number;
    highBound?: number;
    opponentProgress?: OpponentProgress;
    competitive?: any;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke("game-session", {
        body: { action: "guess", matchId, guess },
      });

      if (error || !data || !data.success) {
        return {
          success: false,
          error: error?.message || data?.error || "Failed to validate multiplayer guess.",
        };
      }

      return data;
    } catch (err: any) {
      return { success: false, error: err.message || "Network error submitting guess." };
    }
  }

  /**
   * Polls comprehensive match state and opponent telemetry.
   */
  static async pollMatchState(matchId: string): Promise<MultiplayerMatchState | null> {
    try {
      const statusRes = await this.pollMatchStatus(matchId);
      if (!statusRes || !statusRes.success) return null;

      const { data: match } = await supabase
        .from("multiplayer_matches")
        .select("*")
        .eq("id", matchId)
        .maybeSingle();

      if (!match) return null;

      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id;

      let opponent: OpponentInfo | undefined;
      const opponentId = match.player_a_id === currentUserId ? match.player_b_id : match.player_a_id;
      if (opponentId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, avatar_id, title_id")
          .eq("id", opponentId)
          .maybeSingle();

        const { data: rating } = await supabase
          .from("player_ratings")
          .select("rating, tier")
          .eq("user_id", opponentId)
          .maybeSingle();

        opponent = {
          id: opponentId,
          displayName: profile?.display_name || "Opponent",
          avatarId: profile?.avatar_id || "oracle_orb",
          titleId: profile?.title_id || "apprentice_hunter",
          rating: rating?.rating || 400,
          tier: rating?.tier || "bronze",
        };
      }

      return {
        matchId,
        status: (match.status as any) || "in_progress",
        minRange: match.min_range || 1,
        maxRange: match.max_range || 100,
        livesRemaining: statusRes.myProgress?.livesRemaining ?? 7,
        hintsRemaining: 0,
        opponent,
        roomCode: match.room_code,
        playerAReady: match.player_a_ready,
        playerBReady: match.player_b_ready,
        winnerId: match.winner_id,
        opponentProgress: statusRes.opponentProgress,
      };
    } catch {
      return null;
    }
  }

  /**
   * Polls current match state and opponent progress.
   */
  static async pollMatchStatus(matchId: string): Promise<{
    success: boolean;
    status?: string;
    winnerId?: string | null;
    isGameOver?: boolean;
    secretNumber?: number;
    myProgress?: { rounds: number; livesRemaining: number; solved: boolean };
    opponentProgress?: OpponentProgress;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke("game-session", {
        body: { action: "status", matchId },
      });

      if (error || !data) {
        return { success: false, error: error?.message || "Failed to fetch match status." };
      }

      return data;
    } catch (err: any) {
      return { success: false, error: err.message || "Network error syncing match." };
    }
  }

  /**
   * Forfeits or abandons an active multiplayer match.
   */
  static async forfeitMatch(matchId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke("game-session", {
        body: { action: "abandon", matchId },
      });
      return !error && Boolean(data?.success);
    } catch {
      return false;
    }
  }
}

