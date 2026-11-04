// @ts-nocheck
/* eslint-disable */
// ==============================================================================
// Supabase Edge Function: /matchmaking
// Description: Real-Time 1v1 Skill-Based Matchmaking (Atomic SKIP LOCKED),
//              Private Room Codes, Lobby Ready State, and Match Allocation.
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

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const buffer = new Uint8Array(6);
  crypto.getRandomValues(buffer);
  for (let i = 0; i < 6; i++) {
    code += chars[buffer[i] % chars.length];
  }
  return code;
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
    const payload = await req.json();

    // -------------------------------------------------------------------------
    // 1. ACTION: JOIN SKILL-BASED QUEUE (ATOMIC SKIP LOCKED)
    // -------------------------------------------------------------------------
    if (payload.action === "join") {
      const diff = payload.difficulty && DIFFICULTY_CONFIG[payload.difficulty]
        ? payload.difficulty
        : "medium";
      const config = DIFFICULTY_CONFIG[diff];

      // Fetch player's current authoritative rating
      const { data: playerRating } = await admin
        .from("player_ratings")
        .select("rating, tier")
        .eq("user_id", user.id)
        .maybeSingle();

      const rating = playerRating?.rating ?? 400;
      const tier = playerRating?.tier ?? "bronze";

      // Clean up expired tickets
      await admin.from("matchmaking_queue").delete().lt("expires_at", new Date().toISOString());

      // Atomically find an opponent without race conditions (MED-02 resolved)
      const { data: matchRows, error: rpcErr } = await admin.rpc("match_queued_player_atomic", {
        p_user_id: user.id,
        p_difficulty: diff,
        p_rating: rating,
        p_tolerance: 350,
      });

      const matchedOpponent = matchRows && matchRows.length > 0 && matchRows[0].matched ? matchRows[0] : null;

      if (matchedOpponent && matchedOpponent.matched_opponent_id) {
        // Both players matched atomically! Initialize multiplayer match
        const secret = generateSecureSecret(config.min, config.max);

        const { data: match, error: matchErr } = await admin
          .from("multiplayer_matches")
          .insert({
            match_type: "ranked_1v1",
            difficulty: diff,
            secret_number: secret,
            min_range: config.min,
            max_range: config.max,
            max_lives: config.lives,
            max_hints: config.hints,
            status: "in_progress",
            player_a_id: user.id,
            player_b_id: matchedOpponent.matched_opponent_id,
            player_a_ready: true,
            player_b_ready: true,
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!matchErr && match) {
          // Initialize participants for both players
          await admin.from("multiplayer_participants").insert([
            {
              match_id: match.id,
              user_id: user.id,
              lives_remaining: config.lives,
              low_bound: config.min,
              high_bound: config.max,
            },
            {
              match_id: match.id,
              user_id: matchedOpponent.matched_opponent_id,
              lives_remaining: config.lives,
              low_bound: config.min,
              high_bound: config.max,
            },
          ]);

          // Update opponent's queue entry with session_id
          await admin
            .from("matchmaking_queue")
            .update({
              status: "matched",
              session_id: match.id,
              matched_with: user.id,
            })
            .eq("user_id", matchedOpponent.matched_opponent_id);

          // Delete player's own ticket if existing
          await admin.from("matchmaking_queue").delete().eq("user_id", user.id);

          // Fetch opponent profile
          const { data: oppProfile } = await admin
            .from("profiles")
            .select("display_name, avatar_id, title_id")
            .eq("id", matchedOpponent.matched_opponent_id)
            .maybeSingle();

          return new Response(
            JSON.stringify({
              success: true,
              status: "matched",
              matchId: match.id,
              minRange: config.min,
              maxRange: config.max,
              livesRemaining: config.lives,
              hintsRemaining: config.hints,
              opponent: {
                id: matchedOpponent.matched_opponent_id,
                displayName: oppProfile?.display_name || "Challenger",
                avatarId: oppProfile?.avatar_id || "oracle_orb",
                titleId: oppProfile?.title_id || "apprentice_hunter",
                rating: matchedOpponent.opponent_rating || 400,
                tier: matchedOpponent.opponent_tier || "bronze",
              },
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      // No opponent found: upsert caller into matchmaking_queue
      const { data: queuedItem, error: queueErr } = await admin
        .from("matchmaking_queue")
        .upsert(
          {
            user_id: user.id,
            difficulty: diff,
            mode: "player",
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
    // 2. ACTION: POLL QUEUE STATUS
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
        const { data: match } = await admin
          .from("multiplayer_matches")
          .select("*")
          .eq("id", queueItem.session_id)
          .maybeSingle();

        const oppId = queueItem.matched_with || (match?.player_a_id === user.id ? match?.player_b_id : match?.player_a_id);

        const { data: oppProfile } = await admin
          .from("profiles")
          .select("display_name, avatar_id, title_id")
          .eq("id", oppId)
          .maybeSingle();

        const { data: oppRating } = await admin
          .from("player_ratings")
          .select("rating, tier")
          .eq("user_id", oppId)
          .maybeSingle();

        // Remove queue entry once delivered
        await admin.from("matchmaking_queue").delete().eq("id", queueItem.id);

        return new Response(
          JSON.stringify({
            status: "matched",
            matchId: queueItem.session_id,
            minRange: match?.min_range || 1,
            maxRange: match?.max_range || 100,
            livesRemaining: match?.max_lives || 7,
            hintsRemaining: match?.max_hints || 2,
            opponent: {
              id: oppId,
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
    // 3. ACTION: CANCEL QUEUE
    // -------------------------------------------------------------------------
    if (payload.action === "cancel") {
      await admin.from("matchmaking_queue").delete().eq("user_id", user.id);
      return new Response(
        JSON.stringify({ success: true, status: "cancelled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // -------------------------------------------------------------------------
    // 4. ACTION: CREATE PRIVATE ROOM
    // -------------------------------------------------------------------------
    if (payload.action === "create_room") {
      const diff = payload.difficulty && DIFFICULTY_CONFIG[payload.difficulty]
        ? payload.difficulty
        : "medium";
      const config = DIFFICULTY_CONFIG[diff];
      const roomCode = generateRoomCode();
      const secret = generateSecureSecret(config.min, config.max);

      const { data: room, error: roomErr } = await admin
        .from("multiplayer_matches")
        .insert({
          match_type: "private_room",
          room_code: roomCode,
          difficulty: diff,
          secret_number: secret,
          min_range: config.min,
          max_range: config.max,
          max_lives: config.lives,
          max_hints: config.hints,
          status: "waiting",
          player_a_id: user.id,
          player_a_ready: false,
          player_b_ready: false,
        })
        .select()
        .single();

      if (roomErr || !room) {
        return new Response(
          JSON.stringify({ error: "Failed to create private room." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      await admin.from("multiplayer_participants").insert({
        match_id: room.id,
        user_id: user.id,
        lives_remaining: config.lives,
        low_bound: config.min,
        high_bound: config.max,
      });

      return new Response(
        JSON.stringify({
          success: true,
          roomCode,
          matchId: room.id,
          difficulty: diff,
          minRange: config.min,
          maxRange: config.max,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // -------------------------------------------------------------------------
    // 5. ACTION: JOIN PRIVATE ROOM
    // -------------------------------------------------------------------------
    if (payload.action === "join_room") {
      const roomCode = String(payload.roomCode || "").toUpperCase().trim();
      if (!roomCode) {
        return new Response(
          JSON.stringify({ error: "Room code is required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: room } = await admin
        .from("multiplayer_matches")
        .select("*")
        .eq("room_code", roomCode)
        .in("status", ["waiting", "lobby"])
        .maybeSingle();

      if (!room) {
        return new Response(
          JSON.stringify({ error: "Room not found or already in progress." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (room.player_a_id === user.id) {
        return new Response(
          JSON.stringify({ success: true, matchId: room.id, roomCode: room.room_code }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (room.player_b_id && room.player_b_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Room is already full." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Attach Player B
      await admin
        .from("multiplayer_matches")
        .update({
          player_b_id: user.id,
          status: "lobby",
          updated_at: new Date().toISOString(),
        })
        .eq("id", room.id);

      await admin.from("multiplayer_participants").upsert(
        {
          match_id: room.id,
          user_id: user.id,
          lives_remaining: room.max_lives,
          low_bound: room.min_range,
          high_bound: room.max_range,
        },
        { onConflict: "match_id,user_id" },
      );

      return new Response(
        JSON.stringify({
          success: true,
          matchId: room.id,
          roomCode: room.room_code,
          difficulty: room.difficulty,
          minRange: room.min_range,
          maxRange: room.max_range,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // -------------------------------------------------------------------------
    // 6. ACTION: LOBBY READY TOGGLE
    // -------------------------------------------------------------------------
    if (payload.action === "ready_toggle") {
      const { matchId, ready } = payload;
      const { data: match } = await admin
        .from("multiplayer_matches")
        .select("*")
        .eq("id", matchId)
        .maybeSingle();

      if (!match) {
        return new Response(
          JSON.stringify({ error: "Match not found." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const isPlayerA = match.player_a_id === user.id;
      const isPlayerB = match.player_b_id === user.id;

      if (!isPlayerA && !isPlayerB) {
        return new Response(
          JSON.stringify({ error: "Unauthorized." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const nextA = isPlayerA ? Boolean(ready) : match.player_a_ready;
      const nextB = isPlayerB ? Boolean(ready) : match.player_b_ready;
      const bothReady = nextA && nextB && Boolean(match.player_b_id);

      await admin
        .from("multiplayer_matches")
        .update({
          player_a_ready: nextA,
          player_b_ready: nextB,
          status: bothReady ? "in_progress" : match.status,
          started_at: bothReady ? new Date().toISOString() : match.started_at,
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchId);

      return new Response(
        JSON.stringify({
          success: true,
          playerAReady: nextA,
          playerBReady: nextB,
          status: bothReady ? "in_progress" : match.status,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // -------------------------------------------------------------------------
    // 7. ACTION: LEAVE / CANCEL PRIVATE ROOM
    // -------------------------------------------------------------------------
    if (payload.action === "leave_room") {
      const { matchId } = payload;
      if (!matchId) {
        return new Response(
          JSON.stringify({ error: "matchId is required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: match } = await admin
        .from("multiplayer_matches")
        .select("*")
        .eq("id", matchId)
        .maybeSingle();

      if (match) {
        if (match.player_a_id === user.id) {
          // Host left: cancel match and clear active room code
          await admin
            .from("multiplayer_matches")
            .update({
              status: "cancelled",
              room_code: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", matchId);
        } else if (match.player_b_id === user.id) {
          // Guest left: reset room back to waiting
          await admin
            .from("multiplayer_matches")
            .update({
              player_b_id: null,
              player_b_ready: false,
              status: "waiting",
              updated_at: new Date().toISOString(),
            })
            .eq("id", matchId);
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
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
