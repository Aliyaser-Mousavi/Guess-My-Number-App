// ==============================================================================
// Service: MatchmakingService.ts
// Description: Client SDK for joining, polling, and cancelling ranked matchmaking
//              via the /matchmaking Supabase Edge Function.
// ==============================================================================

import { supabase } from "@/lib/supabase";
import type { DifficultyId } from "@/constants/gameConfig";

export interface MatchmakingMatchedOpponent {
  id: string;
  displayName: string;
  avatarId: string;
  titleId: string;
  rating: number;
  tier: string;
}

export type MatchmakingStatusResponse =
  | { status: "queued"; enqueuedAt: string; playerRating?: number; playerTier?: string }
  | {
      status: "matched";
      sessionId: string;
      minRange: number;
      maxRange: number;
      livesRemaining: number;
      hintsRemaining: number;
      opponent: MatchmakingMatchedOpponent;
    }
  | { status: "timeout" }
  | { status: "none" }
  | { status: "error"; error: string };

export class MatchmakingService {
  /**
   * Enters the competitive matchmaking queue.
   */
  static async joinQueue(
    difficulty: DifficultyId = "medium",
    mode = "player",
  ): Promise<MatchmakingStatusResponse> {
    try {
      const { data, error } = await supabase.functions.invoke("matchmaking", {
        body: { action: "join", difficulty, mode },
      });

      if (error || !data) {
        return { status: "error", error: error?.message || "Failed to join queue." };
      }

      return data as MatchmakingStatusResponse;
    } catch (err: any) {
      return { status: "error", error: err.message || "Network error joining queue." };
    }
  }

  /**
   * Polls the current user's queue status.
   */
  static async pollQueue(): Promise<MatchmakingStatusResponse> {
    try {
      const { data, error } = await supabase.functions.invoke("matchmaking", {
        body: { action: "poll" },
      });

      if (error || !data) {
        return { status: "error", error: error?.message || "Failed to poll queue." };
      }

      return data as MatchmakingStatusResponse;
    } catch (err: any) {
      return { status: "error", error: err.message || "Network error polling queue." };
    }
  }

  /**
   * Cancels the active queue entry.
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
}

