// ==============================================================================
// Service: ServerAuthoritativeGameService.ts
// Description: Client SDK for interacting with the trusted /game-session Edge Function.
//              Guarantees server-authoritative secret generation, move validation,
//              and verified reward/rating processing.
// ==============================================================================

import { supabase } from "@/lib/supabase";
import type { DifficultyId, GameMode } from "@/constants/gameConfig";

export interface ServerSessionInfo {
  sessionId: string;
  mode: GameMode;
  difficulty: DifficultyId;
  minRange: number;
  maxRange: number;
  livesRemaining: number;
  maxLives: number;
  hintsRemaining: number;
  maxHints: number;
  isRanked: boolean;
  startedAt: string;
}

export interface ServerGuessResult {
  feedback: "low" | "high" | "correct";
  won: boolean;
  isGameOver: boolean;
  secretNumber?: number;
  rounds: number;
  score?: number;
  elapsedMs?: number;
  livesRemaining?: number;
  reward?: {
    xp_gained?: number;
    level?: number;
    xp?: number;
    rank?: string;
    did_level_up?: boolean;
    cosmetics_unlocked?: string[];
  } | null;
  competitive?: {
    old_rating?: number;
    new_rating?: number;
    rating_delta?: number;
    old_tier?: string;
    new_tier?: string;
    division?: string;
    win_streak?: number;
    best_streak?: number;
  } | null;
}

export class ServerAuthoritativeGameService {
  /**
   * Initializes a fresh server-authoritative game session.
   * Secret number is securely generated on the server and concealed from the client.
   */
  static async startSession(params: {
    difficulty: DifficultyId;
    mode?: GameMode;
    isRanked?: boolean;
    isDaily?: boolean;
  }): Promise<{ success: boolean; session?: ServerSessionInfo; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke("game-session", {
        body: {
          action: "start",
          difficulty: params.difficulty,
          mode: params.mode || "player",
          isRanked: Boolean(params.isRanked),
          isDaily: Boolean(params.isDaily),
        },
      });

      if (error || !data || !data.success) {
        return {
          success: false,
          error: error?.message || data?.error || "Failed to start server-authoritative session.",
        };
      }

      return {
        success: true,
        session: {
          sessionId: data.sessionId,
          mode: data.mode,
          difficulty: data.difficulty,
          minRange: data.minRange,
          maxRange: data.maxRange,
          livesRemaining: data.livesRemaining,
          maxLives: data.maxLives,
          hintsRemaining: data.hintsRemaining,
          maxHints: data.maxHints,
          isRanked: data.isRanked,
          startedAt: data.startedAt,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Network error connecting to game server.",
      };
    }
  }

  /**
   * Submits a guess to the server for authoritative validation.
   */
  static async submitGuess(
    sessionId: string,
    guess: number,
  ): Promise<{ success: boolean; result?: ServerGuessResult; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke("game-session", {
        body: {
          action: "guess",
          sessionId,
          guess,
        },
      });

      if (error || !data || !data.success) {
        return {
          success: false,
          error: error?.message || data?.error || "Failed to validate guess on server.",
        };
      }

      return {
        success: true,
        result: {
          feedback: data.feedback,
          won: data.won,
          isGameOver: data.isGameOver,
          secretNumber: data.secretNumber,
          rounds: data.rounds,
          score: data.score,
          elapsedMs: data.elapsedMs,
          livesRemaining: data.livesRemaining,
          reward: data.reward,
          competitive: data.competitive,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Network error validating guess.",
      };
    }
  }

  /**
   * Requests an authoritative mathematical hint from the server.
   */
  static async requestHint(
    sessionId: string,
  ): Promise<{ success: boolean; hint?: string; hintsRemaining?: number; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke("game-session", {
        body: {
          action: "hint",
          sessionId,
        },
      });

      if (error || !data || !data.success) {
        return {
          success: false,
          error: error?.message || data?.error || "Failed to retrieve hint.",
        };
      }

      return {
        success: true,
        hint: data.hint,
        hintsRemaining: data.hintsRemaining,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Network error requesting hint.",
      };
    }
  }

  /**
   * Abandons an active session on the server.
   */
  static async abandonSession(sessionId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke("game-session", {
        body: {
          action: "abandon",
          sessionId,
        },
      });
      return !error && Boolean(data?.success);
    } catch {
      return false;
    }
  }
}

