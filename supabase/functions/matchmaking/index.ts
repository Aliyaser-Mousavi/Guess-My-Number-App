// @ts-nocheck
/* eslint-disable */
// ==============================================================================
// Supabase Edge Function: /matchmaking
// Description: Server-Authoritative Ranked Matchmaking Queue, Rating Matching,
//              and Concurrent Match Allocation.
// ==============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JoinPayload {
  action: "join";
  difficulty?: "easy" | "medium" | "hard" | "expert";
  mode?: string;
}

interface PollPayload {
  action: "poll";
}

interface CancelPayload {
  action: "cancel";
}

type MatchmakingPayload = JoinPayload | PollPayload | CancelPayload;

const DIFFICULTY_CONFIG = {
  easy: { min: 1, max: 50, lives: 8, hints: 3 },
  medium: { min: 1, max: 100, lives: 7, hints: 2 },
  hard: { min: 1, max: 200, lives: 8, hints: 1 },
  expert: { min: 1, max: 500, lives: 9, hints: 0 },
};

function generateSecureSecret(min: number, max: number): number {
  const range = max - min + 1;
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return min + (buffer[0] % range);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration missing." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authErr } = await userClient.auth.getUser(token);

    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const payload: MatchmakingPayload = await req.json();

    // -------------------------------------------------------------------------
    // ACTION: JOIN QUEUE
    // -------------------------------------------------------------------------
    if (payload.action === "join") {
      const diff = payload.difficulty && DIFFICULTY_CONFIG[payload.difficulty]
        ? payload.difficulty
        : "medium";
      const mode = payload.mode || "player";
      const config = DIFFICULTY_CONFIG[diff];

      // 1. Fetch player's current authoritative rating
      const { data: playerRating } = await admin
        .from("player_ratings")
        .select("rating, tier")
        .eq("user_id", user.id)
        .maybeSingle();

      const rating = playerRating?.rating ?? 400;
      const tier = playerRating?.tier ?? "bronze";

      // 2. Clean up any expired queue records
      await admin
        .from("matchmaking_queue")
        .delete()
        .lt("expires_at", new Date().toISOString());

      // 3. Search for existing queued opponent within rating tolerance (+-350 CR)
      const minMatchRating = Math.max(0, rating - 350);
      const maxMatchRating = rating + 350;

      const { data: opponents } = await admin
        .from("matchmaking_queue")
        .select("*")
        .eq("status", "queued")
        .eq("difficulty", diff)
        .neq("user_id", user.id)
        .gte("player_rating", minMatchRating)
        .lte("player_rating", maxMatchRating)
        .order("enqueued_at", { ascending: true })
        .limit(1);

      if (opponents && opponents.length > 0) {
        const opponent = opponents[0];

        // Opponent found! Create a shared server-authoritative session for the ranked match
        const secretNumber = generateSecureSecret(config.min, config.max);

        const { data: newSession, error: sessErr } = await admin
          .from("server_game_sessions")
          .insert({
            user_id: user.id,
            mode,
            difficulty: diff,
            secret_number: secretNumber,
            min_range: config.min,
            max_range: config.max,
            max_lives: config.lives,
            lives_remaining: config.lives,
            max_hints: config.hints,
            hints_used: 0,
            status: "active",
            is_ranked: true,
            matched_opponent_id: opponent.user_id,
          })
          .select()
          .single();

        if (!sessErr && newSession) {
          // Update opponent's queue entry to matched
          await admin
            .from("matchmaking_queue")
            .update({
              status: "matched",
              matched_with: user.id,
              session_id: newSession.id,
            })
            .eq("id", opponent.id);

          // Delete player's own prior queue entry if any
          await admin.from("matchmaking_queue").delete().eq("user_id", user.id);

          // Fetch opponent profile details
          const { data: oppProfile } = await admin
            .from("profiles")
            .select("display_name, avatar_id, title_id")
            .eq("id", opponent.user_id)
            .maybeSingle();

          return new Response(
            JSON.stringify({
              success: true,
              status: "matched",
              sessionId: newSession.id,
              minRange: config.min,
              maxRange: config.max,
              livesRemaining: config.lives,
              hintsRemaining: config.hints,
              opponent: {
                id: opponent.user_id,
                displayName: oppProfile?.display_name || "Challenger",
                avatarId: oppProfile?.avatar_id || "oracle_orb",
                titleId: oppProfile?.title_id || "apprentice_hunter",
                rating: opponent.player_rating,
                tier: opponent.player_tier,
              },
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      // No opponent available: enqueue current player
      const { data: queuedItem, error: queueErr } = await admin
        .from("matchmaking_queue")
        .upsert(
          {
            user_id: user.id,
            difficulty: diff,
            mode,
            player_rating: rating,
            player_tier: tier,
            status: "queued",
            enqueued_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 180000).toISOString(),
          },
          { onConflict: "user_id" },
        )
        .select()
        .single();

      if (queueErr) {
        return new Response(
          JSON.stringify({ error: "Failed to enter matchmaking queue." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: "queued",
          enqueuedAt: queuedItem.enqueued_at,
          playerRating: rating,
          playerTier: tier,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // -------------------------------------------------------------------------
    // ACTION: POLL STATUS
    // -------------------------------------------------------------------------
    if (payload.action === "poll") {
      const { data: queueItem } = await admin
        .from("matchmaking_queue")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!queueItem) {
        return new Response(
          JSON.stringify({ status: "none" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (queueItem.status === "matched" && queueItem.session_id) {
        // Opponent matched! Fetch details and clean up queue record
        const { data: session } = await admin
          .from("server_game_sessions")
          .select("id, mode, difficulty, min_range, max_range, max_lives, max_hints")
          .eq("id", queueItem.session_id)
          .maybeSingle();

        const { data: oppProfile } = await admin
          .from("profiles")
          .select("display_name, avatar_id, title_id")
          .eq("id", queueItem.matched_with)
          .maybeSingle();

        const { data: oppRating } = await admin
          .from("player_ratings")
          .select("rating, tier")
          .eq("user_id", queueItem.matched_with)
          .maybeSingle();

        // Delete finished queue entry
        await admin.from("matchmaking_queue").delete().eq("id", queueItem.id);

        return new Response(
          JSON.stringify({
            status: "matched",
            sessionId: queueItem.session_id,
            minRange: session?.min_range || 1,
            maxRange: session?.max_range || 100,
            livesRemaining: session?.max_lives || 7,
            hintsRemaining: session?.max_hints || 2,
            opponent: {
              id: queueItem.matched_with,
              displayName: oppProfile?.display_name || "Challenger",
              avatarId: oppProfile?.avatar_id || "oracle_orb",
              titleId: oppProfile?.title_id || "apprentice_hunter",
              rating: oppRating?.rating || 400,
              tier: oppRating?.tier || "bronze",
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Check if expired
      if (new Date(queueItem.expires_at).getTime() < Date.now()) {
        await admin.from("matchmaking_queue").delete().eq("id", queueItem.id);
        return new Response(
          JSON.stringify({ status: "timeout" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ status: "queued", enqueuedAt: queueItem.enqueued_at }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // -------------------------------------------------------------------------
    // ACTION: CANCEL QUEUE
    // -------------------------------------------------------------------------
    if (payload.action === "cancel") {
      await admin.from("matchmaking_queue").delete().eq("user_id", user.id);
      return new Response(
        JSON.stringify({ success: true, status: "cancelled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

