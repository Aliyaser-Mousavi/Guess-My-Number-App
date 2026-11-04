// @ts-nocheck
/* eslint-disable */
// ==============================================================================
// Supabase Edge Function: /game-session
// Description: Server-Authoritative Gameplay Engine supporting Single-Player Ranked
//              AND Real-Time 1v1 Online Multiplayer (Resolving CRIT-02).
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
  easy: { min: 1, max: 50, lives: 8, hints: 3, multiplier: 1.0 },
  medium: { min: 1, max: 100, lives: 7, hints: 2, multiplier: 1.5 },
  hard: { min: 1, max: 200, lives: 8, hints: 1, multiplier: 2.25 },
  expert: { min: 1, max: 500, lives: 9, hints: 0, multiplier: 3.5 },
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
        JSON.stringify({ error: "Unauthorized: Invalid or expired token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const payload = await req.json();

    // =========================================================================
    // BRANCH A: REAL-TIME 1v1 MULTIPLAYER MATCHES (Resolves CRIT-02)
    // =========================================================================
    const matchId = payload.matchId || payload.sessionId;

    // Check if target is a 1v1 multiplayer match
    const { data: mpMatch } = await admin
      .from("multiplayer_matches")
      .select("*")
      .eq("id", matchId)
      .maybeSingle();

    if (mpMatch) {
      // Authorize BOTH Player A and Player B (CRIT-02 resolution)
      const isPlayerA = mpMatch.player_a_id === user.id;
      const isPlayerB = mpMatch.player_b_id === user.id;

      if (!isPlayerA && !isPlayerB) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: You are not a participant in this 1v1 match." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const opponentId = isPlayerA ? mpMatch.player_b_id : mpMatch.player_a_id;

      // 1. ACTION: MULTIPLAYER GUESS
      if (payload.action === "guess") {
        if (mpMatch.status !== "in_progress") {
          return new Response(
            JSON.stringify({
              error: `Match is not active (status: ${mpMatch.status}).`,
              isGameOver: true,
              winnerId: mpMatch.winner_id,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const guess = Number(payload.guess);
        if (isNaN(guess) || guess < mpMatch.min_range || guess > mpMatch.max_range) {
          return new Response(
            JSON.stringify({ error: `Guess out of range [${mpMatch.min_range}, ${mpMatch.max_range}].` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Fetch participant rows
        const { data: myPart } = await admin
          .from("multiplayer_participants")
          .select("*")
          .eq("match_id", mpMatch.id)
          .eq("user_id", user.id)
          .single();

        const { data: oppPart } = await admin
          .from("multiplayer_participants")
          .select("*")
          .eq("match_id", mpMatch.id)
          .eq("user_id", opponentId)
          .maybeSingle();

        const nextRounds = (myPart?.rounds || 0) + 1;
        const nextGuesses = [...(myPart?.guesses || []), guess];
        const secret = mpMatch.secret_number;
        const elapsedMs = Math.max(1000, Date.now() - new Date(mpMatch.started_at || mpMatch.created_at).getTime());

        if (guess === secret) {
          // --- PLAYER SOLVED FIRST (VICTORY) ---
          await admin
            .from("multiplayer_participants")
            .update({
              solved: true,
              solved_at: new Date().toISOString(),
              rounds: nextRounds,
              guesses: nextGuesses,
              feedbacks: [...(myPart?.feedbacks || []), "correct"],
              score: 1500,
              updated_at: new Date().toISOString(),
            })
            .eq("id", myPart.id);

          await admin
            .from("multiplayer_matches")
            .update({
              status: "completed",
              winner_id: user.id,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", mpMatch.id);

          // Update competitive ratings if ranked 1v1
          let compResult: any = null;
          if (mpMatch.match_type === "ranked_1v1") {
            // Winner rating update
            await admin.from("game_sessions").insert({
              id: mpMatch.id,
              user_id: user.id,
              client_session_id: `mp_${mpMatch.id}_${user.id}`,
              mode: "player",
              difficulty: mpMatch.difficulty,
              won: true,
              rounds: nextRounds,
              score: 1500,
              elapsed_ms: elapsedMs,
              hints_used: myPart?.hints_used || 0,
              is_daily: false,
              user_number: secret,
              secret_number: secret,
              guesses: nextGuesses,
              verification_status: "server_verified",
              processed_for_rewards: false,
              xp_awarded: 0,
            });

            const { data: cData } = await admin.rpc("update_player_competitive_rating", {
              p_user_id: user.id,
              p_session_id: mpMatch.id,
              p_won: true,
              p_rounds: nextRounds,
              p_difficulty: mpMatch.difficulty,
              p_elapsed_ms: elapsedMs,
            });
            compResult = cData;

            // Live update player_season_stats and user_event_progress
            try {
              await admin.rpc("process_match_season_and_events", {
                p_user_id: user.id,
                p_session_id: mpMatch.id,
                p_won: true,
                p_rounds: nextRounds,
                p_elapsed_ms: elapsedMs,
                p_mode: "ranked_1v1",
                p_is_ranked: true,
              });
            } catch (err: any) {
              console.warn("[game-session] Error processing season/event progress:", err.message);
            }

            // Opponent rating deduction
            if (opponentId) {
              const oppSessionId = crypto.randomUUID();
              await admin.from("game_sessions").insert({
                id: oppSessionId,
                user_id: opponentId,
                client_session_id: `mp_${mpMatch.id}_${opponentId}`,
                mode: "player",
                difficulty: mpMatch.difficulty,
                won: false,
                rounds: oppPart?.rounds || 1,
                score: 0,
                elapsed_ms: elapsedMs,
                hints_used: oppPart?.hints_used || 0,
                is_daily: false,
                user_number: secret,
                secret_number: secret,
                guesses: oppPart?.guesses || [],
                verification_status: "server_verified",
                processed_for_rewards: false,
                xp_awarded: 0,
              });

              await admin.rpc("update_player_competitive_rating", {
                p_user_id: opponentId,
                p_session_id: oppSessionId,
                p_won: false,
                p_rounds: oppPart?.rounds || 1,
                p_difficulty: mpMatch.difficulty,
                p_elapsed_ms: elapsedMs,
              });

              try {
                await admin.rpc("process_match_season_and_events", {
                  p_user_id: opponentId,
                  p_session_id: oppSessionId,
                  p_won: false,
                  p_rounds: oppPart?.rounds || 1,
                  p_elapsed_ms: elapsedMs,
                  p_mode: "ranked_1v1",
                  p_is_ranked: true,
                });
              } catch (err: any) {
                console.warn("[game-session] Error processing opponent season/event progress:", err.message);
              }
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              feedback: "correct",
              won: true,
              isGameOver: true,
              winnerId: user.id,
              secretNumber: secret,
              rounds: nextRounds,
              competitive: compResult,
              opponentProgress: {
                rounds: oppPart?.rounds || 0,
                livesRemaining: oppPart?.lives_remaining || 7,
                lowBound: oppPart?.low_bound || mpMatch.min_range,
                highBound: oppPart?.high_bound || mpMatch.max_range,
                solved: false,
              },
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // --- WRONG GUESS ---
        const nextLives = Math.max(0, (myPart?.lives_remaining || 7) - 1);
        const feedback = guess < secret ? "low" : "high";
        const nextLow = feedback === "low" ? Math.max(myPart?.low_bound || mpMatch.min_range, guess + 1) : (myPart?.low_bound || mpMatch.min_range);
        const nextHigh = feedback === "high" ? Math.min(myPart?.high_bound || mpMatch.max_range, guess - 1) : (myPart?.high_bound || mpMatch.max_range);

        await admin
          .from("multiplayer_participants")
          .update({
            rounds: nextRounds,
            guesses: nextGuesses,
            feedbacks: [...(myPart?.feedbacks || []), feedback],
            lives_remaining: nextLives,
            low_bound: nextLow,
            high_bound: nextHigh,
            updated_at: new Date().toISOString(),
          })
          .eq("id", myPart.id);

        const isEliminated = nextLives === 0;

        return new Response(
          JSON.stringify({
            success: true,
            feedback,
            won: false,
            isGameOver: isEliminated,
            livesRemaining: nextLives,
            rounds: nextRounds,
            lowBound: nextLow,
            highBound: nextHigh,
            opponentProgress: {
              rounds: oppPart?.rounds || 0,
              livesRemaining: oppPart?.lives_remaining || 7,
              lowBound: oppPart?.low_bound || mpMatch.min_range,
              highBound: oppPart?.high_bound || mpMatch.max_range,
              solved: oppPart?.solved || false,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // 2. ACTION: MULTIPLAYER SYNC / STATUS POLL
      if (payload.action === "sync" || payload.action === "status") {
        const { data: myPart } = await admin
          .from("multiplayer_participants")
          .select("*")
          .eq("match_id", mpMatch.id)
          .eq("user_id", user.id)
          .maybeSingle();

        const { data: oppPart } = await admin
          .from("multiplayer_participants")
          .select("*")
          .eq("match_id", mpMatch.id)
          .eq("user_id", opponentId)
          .maybeSingle();

        return new Response(
          JSON.stringify({
            success: true,
            status: mpMatch.status,
            winnerId: mpMatch.winner_id,
            isGameOver: mpMatch.status === "completed" || mpMatch.status === "abandoned",
            secretNumber: mpMatch.status === "completed" ? mpMatch.secret_number : undefined,
            myProgress: {
              rounds: myPart?.rounds || 0,
              livesRemaining: myPart?.lives_remaining || 7,
              solved: myPart?.solved || false,
            },
            opponentProgress: {
              rounds: oppPart?.rounds || 0,
              livesRemaining: oppPart?.lives_remaining || 7,
              lowBound: oppPart?.low_bound || mpMatch.min_range,
              highBound: oppPart?.high_bound || mpMatch.max_range,
              solved: oppPart?.solved || false,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // 3. ACTION: MULTIPLAYER FORFEIT / ABANDON
      if (payload.action === "abandon") {
        await admin
          .from("multiplayer_matches")
          .update({
            status: "abandoned",
            forfeit_by: user.id,
            winner_id: opponentId,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", mpMatch.id);

        if (mpMatch.match_type === "ranked_1v1") {
          // Forfeit penalty for caller
          const forfSessionId = crypto.randomUUID();
          await admin.from("game_sessions").insert({
            id: forfSessionId,
            user_id: user.id,
            client_session_id: `mp_forfeit_${mpMatch.id}_${user.id}`,
            mode: "player",
            difficulty: mpMatch.difficulty,
            won: false,
            rounds: 1,
            score: 0,
            elapsed_ms: 1000,
            hints_used: 0,
            is_daily: false,
            user_number: mpMatch.secret_number,
            secret_number: mpMatch.secret_number,
            guesses: [],
            verification_status: "server_verified",
            processed_for_rewards: false,
            xp_awarded: 0,
          });

          await admin.rpc("update_player_competitive_rating", {
            p_user_id: user.id,
            p_session_id: forfSessionId,
            p_won: false,
            p_rounds: 1,
            p_difficulty: mpMatch.difficulty,
            p_elapsed_ms: 1000,
          });
        }

        return new Response(
          JSON.stringify({ success: true, status: "abandoned", winnerId: opponentId }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // =========================================================================
    // BRANCH B: SINGLE-PLAYER SERVER-AUTHORITATIVE SESSIONS (PRESERVED 07C)
    // =========================================================================

    // ACTION: START SINGLE-PLAYER SESSION
    if (payload.action === "start") {
      const mode = payload.mode || "player";
      const diff = payload.difficulty && DIFFICULTY_CONFIG[payload.difficulty]
        ? payload.difficulty
        : "medium";
      const config = DIFFICULTY_CONFIG[diff];
      const isRanked = Boolean(payload.isRanked);
      const isDaily = Boolean(payload.isDaily);
      const secretNumber = generateSecureSecret(config.min, config.max);

      const { data: newSession, error: createErr } = await admin
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
          guesses: [],
          guess_feedbacks: [],
          rounds: 0,
          status: "active",
          is_ranked: isRanked,
          is_daily: isDaily,
          score: 0,
        })
        .select()
        .single();

      if (createErr || !newSession) {
        return new Response(
          JSON.stringify({ error: "Failed to initialize server session." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          sessionId: newSession.id,
          mode: newSession.mode,
          difficulty: newSession.difficulty,
          minRange: newSession.min_range,
          maxRange: newSession.max_range,
          livesRemaining: newSession.lives_remaining,
          maxLives: newSession.max_lives,
          hintsRemaining: newSession.max_hints - newSession.hints_used,
          maxHints: newSession.max_hints,
          status: newSession.status,
          isRanked: newSession.is_ranked,
          startedAt: newSession.started_at,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ACTION: GUESS SINGLE-PLAYER
    if (payload.action === "guess") {
      const { sessionId, guess } = payload;
      if (!sessionId || typeof guess !== "number" || isNaN(guess)) {
        return new Response(
          JSON.stringify({ error: "Invalid guess payload: sessionId and numeric guess are required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: session, error: fetchErr } = await admin
        .from("server_game_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchErr || !session) {
        return new Response(
          JSON.stringify({ error: "Game session not found or unauthorized." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (session.status !== "active") {
        return new Response(
          JSON.stringify({ error: `Session is already completed (status: ${session.status}).` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (guess < session.min_range || guess > session.max_range) {
        return new Response(
          JSON.stringify({ error: `Guess ${guess} is out of allowable range [${session.min_range}, ${session.max_range}].` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const nextRounds = (session.rounds || 0) + 1;
      const nextGuesses = [...(session.guesses || []), guess];
      const elapsedMs = Math.max(1000, Date.now() - new Date(session.started_at).getTime());
      const secret = session.secret_number;

      if (guess === secret) {
        const config = DIFFICULTY_CONFIG[session.difficulty as keyof typeof DIFFICULTY_CONFIG] || DIFFICULTY_CONFIG.medium;
        const speedBonus = elapsedMs < 20000 ? 250 : elapsedMs < 40000 ? 120 : 0;
        const lifeBonus = session.lives_remaining * 100;
        const efficiencyBonus = Math.max(0, (10 - nextRounds) * 35);
        const calculatedScore = Math.floor((1000 + lifeBonus + efficiencyBonus + speedBonus) * config.multiplier);

        await admin
          .from("server_game_sessions")
          .update({
            status: "won",
            completed_at: new Date().toISOString(),
            score: calculatedScore,
            rounds: nextRounds,
            guesses: nextGuesses,
            guess_feedbacks: [...(session.guess_feedbacks || []), "correct"],
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionId);

        await admin.from("game_sessions").insert({
          id: sessionId,
          user_id: user.id,
          client_session_id: `srv_${sessionId}`,
          mode: session.mode,
          difficulty: session.difficulty,
          won: true,
          rounds: nextRounds,
          score: calculatedScore,
          elapsed_ms: elapsedMs,
          hints_used: session.hints_used,
          is_daily: session.is_daily,
          user_number: secret,
          secret_number: secret,
          guesses: nextGuesses,
          verification_status: "server_verified",
          processed_for_rewards: false,
          xp_awarded: 0,
        });

        let rewardResult: any = null;
        try {
          const { data: rData } = await admin.rpc("process_game_session_reward", {
            p_session_id: sessionId,
          });
          rewardResult = rData;
        } catch (e: any) {
          console.warn("[game-session] Error invoking process_game_session_reward:", e.message);
        }

        let competitiveResult: any = null;
        if (session.is_ranked) {
          try {
            const { data: cData } = await admin.rpc("update_player_competitive_rating", {
              p_user_id: user.id,
              p_session_id: sessionId,
              p_won: true,
              p_rounds: nextRounds,
              p_difficulty: session.difficulty,
              p_elapsed_ms: elapsedMs,
            });
            competitiveResult = cData;
          } catch (e: any) {
            console.warn("[game-session] Error updating competitive rating:", e.message);
          }

          // Live update player_season_stats and user_event_progress
          try {
            await admin.rpc("process_match_season_and_events", {
              p_user_id: user.id,
              p_session_id: sessionId,
              p_won: true,
              p_rounds: nextRounds,
              p_elapsed_ms: elapsedMs,
              p_mode: session.mode,
              p_is_ranked: true,
            });
          } catch (e: any) {
            console.warn("[game-session] Error processing season/event progress:", e.message);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            feedback: "correct",
            won: true,
            isGameOver: true,
            secretNumber: secret,
            rounds: nextRounds,
            score: calculatedScore,
            elapsedMs,
            reward: rewardResult,
            competitive: competitiveResult,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // WRONG GUESS SINGLE-PLAYER
      const nextLives = Math.max(0, session.lives_remaining - 1);
      const isLost = nextLives === 0;
      const feedback = guess < secret ? "low" : "high";
      const feedbacks = [...(session.guess_feedbacks || []), feedback];

      if (isLost) {
        await admin
          .from("server_game_sessions")
          .update({
            status: "lost",
            completed_at: new Date().toISOString(),
            rounds: nextRounds,
            guesses: nextGuesses,
            lives_remaining: 0,
            guess_feedbacks: feedbacks,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionId);

        await admin.from("game_sessions").insert({
          id: sessionId,
          user_id: user.id,
          client_session_id: `srv_${sessionId}`,
          mode: session.mode,
          difficulty: session.difficulty,
          won: false,
          rounds: nextRounds,
          score: 0,
          elapsed_ms: elapsedMs,
          hints_used: session.hints_used,
          is_daily: session.is_daily,
          user_number: secret,
          secret_number: secret,
          guesses: nextGuesses,
          verification_status: "server_verified",
          processed_for_rewards: false,
          xp_awarded: 0,
        });

        let competitiveResult: any = null;
        if (session.is_ranked) {
          try {
            const { data: cData } = await admin.rpc("update_player_competitive_rating", {
              p_user_id: user.id,
              p_session_id: sessionId,
              p_won: false,
              p_rounds: nextRounds,
              p_difficulty: session.difficulty,
              p_elapsed_ms: elapsedMs,
            });
            competitiveResult = cData;
          } catch (e: any) {
            console.warn("[game-session] Error updating competitive rating:", e.message);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            feedback,
            won: false,
            isGameOver: true,
            secretNumber: secret,
            livesRemaining: 0,
            rounds: nextRounds,
            competitive: competitiveResult,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      await admin
        .from("server_game_sessions")
        .update({
          rounds: nextRounds,
          guesses: nextGuesses,
          lives_remaining: nextLives,
          guess_feedbacks: feedbacks,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      return new Response(
        JSON.stringify({
          success: true,
          feedback,
          won: false,
          isGameOver: false,
          livesRemaining: nextLives,
          rounds: nextRounds,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ACTION: HINT SINGLE-PLAYER
    if (payload.action === "hint") {
      const { sessionId } = payload;
      const { data: session } = await admin
        .from("server_game_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!session || session.status !== "active") {
        return new Response(
          JSON.stringify({ error: "Active game session not found." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (session.hints_used >= session.max_hints) {
        return new Response(
          JSON.stringify({ error: "No hints remaining." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const secret = session.secret_number;
      let hintText = "";
      const hintIndex = session.hints_used;

      if (hintIndex === 0) {
        hintText = secret % 2 === 0 ? "The secret number is EVEN." : "The secret number is ODD.";
      } else if (hintIndex === 1) {
        if (secret % 5 === 0) hintText = "The secret number is divisible by 5.";
        else if (secret % 3 === 0) hintText = "The secret number is divisible by 3.";
        else hintText = `The sum of digits is ${(Math.floor(secret / 10) + (secret % 10))}.`;
      } else {
        const lowerBound = Math.max(session.min_range, secret - 12);
        const upperBound = Math.min(session.max_range, secret + 12);
        hintText = `The number is tightly bounded between ${lowerBound} and ${upperBound}.`;
      }

      await admin
        .from("server_game_sessions")
        .update({
          hints_used: session.hints_used + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      return new Response(
        JSON.stringify({
          success: true,
          hint: hintText,
          hintsRemaining: session.max_hints - (session.hints_used + 1),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ACTION: ABANDON SINGLE-PLAYER
    if (payload.action === "abandon") {
      const { sessionId } = payload;
      const { data: session } = await admin
        .from("server_game_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (session && session.status === "active") {
        const elapsedMs = Math.max(1000, Date.now() - new Date(session.started_at).getTime());
        const roundsPlayed = Math.max(1, session.rounds || 1);

        await admin
          .from("server_game_sessions")
          .update({
            status: "abandoned",
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionId);

        if (session.is_ranked) {
          await admin.from("game_sessions").insert({
            id: sessionId,
            user_id: user.id,
            client_session_id: `srv_${sessionId}`,
            mode: session.mode,
            difficulty: session.difficulty,
            won: false,
            rounds: roundsPlayed,
            score: 0,
            elapsed_ms: elapsedMs,
            hints_used: session.hints_used,
            is_daily: session.is_daily,
            user_number: session.secret_number,
            secret_number: session.secret_number,
            guesses: session.guesses || [],
            verification_status: "server_verified",
            processed_for_rewards: false,
            xp_awarded: 0,
          });

          try {
            await admin.rpc("update_player_competitive_rating", {
              p_user_id: user.id,
              p_session_id: sessionId,
              p_won: false,
              p_rounds: roundsPlayed,
              p_difficulty: session.difficulty,
              p_elapsed_ms: elapsedMs,
            });
          } catch (e: any) {
            console.warn("[game-session] Error deducting MMR on abandon:", e.message);
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, status: "abandoned" }),
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
