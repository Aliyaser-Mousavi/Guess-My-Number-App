-- ==============================================================================
-- Migration: 0006_group08_competitive_seasons_multiplayer.sql
-- Description: Group 08 - Real-Time 1v1 Multiplayer, Atomic Matchmaking, Private Rooms,
--              Weekly Tournaments, Competitive Seasons, & Seasonal Events.
-- Application: Guess My Number (Expo React Native & Supabase)
-- Notes: Idempotent additive migration. Preserves Groups 01-07C.
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. REAL-TIME 1v1 MULTIPLAYER MATCHES
-- Stores 1v1 online matches between two authenticated players.
-- Both Player A and Player B are authorized participants.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.multiplayer_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_type TEXT NOT NULL CHECK (match_type IN ('ranked_1v1', 'private_room')),
  room_code TEXT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  secret_number INTEGER NOT NULL,
  min_range INTEGER NOT NULL DEFAULT 1,
  max_range INTEGER NOT NULL DEFAULT 100,
  max_lives INTEGER NOT NULL DEFAULT 7,
  max_hints INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'lobby', 'countdown', 'in_progress', 'completed', 'abandoned', 'cancelled')),
  player_a_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_b_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  player_a_ready BOOLEAN NOT NULL DEFAULT false,
  player_b_ready BOOLEAN NOT NULL DEFAULT false,
  winner_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  forfeit_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_room_code_active ON public.multiplayer_matches(room_code) WHERE status IN ('waiting', 'lobby', 'countdown', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_mp_matches_players ON public.multiplayer_matches(player_a_id, player_b_id, status);

-- -----------------------------------------------------------------------------
-- 2. MULTIPLAYER PARTICIPANTS (PER-PLAYER INDEPENDENT STATE)
-- Tracks each player's guesses, lives, hints, and solved time independently.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.multiplayer_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.multiplayer_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guesses INTEGER[] NOT NULL DEFAULT '{}',
  feedbacks TEXT[] NOT NULL DEFAULT '{}',
  rounds INTEGER NOT NULL DEFAULT 0,
  lives_remaining INTEGER NOT NULL DEFAULT 7,
  hints_used INTEGER NOT NULL DEFAULT 0,
  low_bound INTEGER NOT NULL DEFAULT 1,
  high_bound INTEGER NOT NULL DEFAULT 100,
  solved BOOLEAN NOT NULL DEFAULT false,
  solved_at TIMESTAMPTZ NULL,
  score INTEGER NOT NULL DEFAULT 0,
  rating_delta INTEGER NULL,
  new_rating INTEGER NULL,
  new_tier TEXT NULL,
  is_connected BOOLEAN NOT NULL DEFAULT true,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mp_participant_unique UNIQUE (match_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mp_participants_user ON public.multiplayer_participants(user_id, match_id);

-- Enable RLS and lock direct modifications to service_role / backend RPCs
ALTER TABLE public.multiplayer_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multiplayer_participants ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.multiplayer_matches FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.multiplayer_participants FROM PUBLIC, anon, authenticated;

-- Read policy: participants can inspect their active or completed matches
GRANT SELECT ON public.multiplayer_matches TO authenticated;
GRANT SELECT ON public.multiplayer_participants TO authenticated;

DROP POLICY IF EXISTS "Participants can view own multiplayer match" ON public.multiplayer_matches;
CREATE POLICY "Participants can view own multiplayer match"
  ON public.multiplayer_matches FOR SELECT TO authenticated
  USING (auth.uid() = player_a_id OR auth.uid() = player_b_id);

DROP POLICY IF EXISTS "Participants can view match participant data" ON public.multiplayer_participants;
CREATE POLICY "Participants can view match participant data"
  ON public.multiplayer_participants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.multiplayer_matches m
      WHERE m.id = match_id AND (m.player_a_id = auth.uid() OR m.player_b_id = auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 3. ATOMIC MATCHMAKING PAIRING RPC (RESOLVING MED-02)
-- Uses SELECT ... FOR UPDATE SKIP LOCKED to prevent race conditions during queue matching.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_queued_player_atomic(
  p_user_id UUID,
  p_difficulty TEXT,
  p_rating INTEGER,
  p_tolerance INTEGER DEFAULT 350
)
RETURNS TABLE (
  matched BOOLEAN,
  matched_opponent_id UUID,
  opponent_rating INTEGER,
  opponent_tier TEXT,
  queue_ticket_id UUID
) AS $$
DECLARE
  v_opponent RECORD;
BEGIN
  -- Lock the best candidate opponent atomically, skipping any locked by concurrent matches
  SELECT id, user_id, player_rating, player_tier
  INTO v_opponent
  FROM public.matchmaking_queue
  WHERE status = 'queued'
    AND difficulty = p_difficulty
    AND user_id != p_user_id
    AND player_rating BETWEEN GREATEST(0, p_rating - p_tolerance) AND (p_rating + p_tolerance)
  ORDER BY enqueued_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF FOUND THEN
    -- Update opponent queue entry to 'matched'
    UPDATE public.matchmaking_queue
    SET status = 'matched',
        matched_with = p_user_id
    WHERE id = v_opponent.id;

    RETURN QUERY
    SELECT true, v_opponent.user_id, v_opponent.player_rating, v_opponent.player_tier, v_opponent.id;
  ELSE
    RETURN QUERY
    SELECT false, NULL::UUID, NULL::INTEGER, NULL::TEXT, NULL::UUID;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.match_queued_player_atomic FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_queued_player_atomic TO service_role;

-- -----------------------------------------------------------------------------
-- 4. WEEKLY TOURNAMENTS
-- Server-validated weekly tournaments with aggregated leaderboard and reward tiers.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'hard',
  min_range INTEGER NOT NULL DEFAULT 1,
  max_range INTEGER NOT NULL DEFAULT 200,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('upcoming', 'active', 'completed')),
  reward_tiers JSONB NOT NULL DEFAULT '{"top1": {"xp": 1200, "avatar": "cyber_crown"}, "top5": {"xp": 600}, "top20": {"xp": 300}, "participation": {"xp": 100}}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempts_used INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  best_rounds INTEGER NOT NULL DEFAULT 999,
  best_elapsed_ms INTEGER NOT NULL DEFAULT 999999,
  rewards_claimed BOOLEAN NOT NULL DEFAULT false,
  last_attempt_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tournament_user_unique UNIQUE (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_participants_rank ON public.tournament_participants(tournament_id, best_score DESC, best_rounds ASC, best_elapsed_ms ASC);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.tournaments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.tournament_participants FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.tournaments TO anon, authenticated;
GRANT SELECT ON public.tournament_participants TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view tournaments" ON public.tournaments;
CREATE POLICY "Public can view tournaments"
  ON public.tournaments FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public can view tournament participants" ON public.tournament_participants;
CREATE POLICY "Public can view tournament participants"
  ON public.tournament_participants FOR SELECT TO anon, authenticated
  USING (true);

-- Tournament Leaderboard RPC
DROP FUNCTION IF EXISTS public.get_tournament_leaderboard(UUID, INT, INT);
DROP FUNCTION IF EXISTS public.get_tournament_leaderboard(UUID, INT);
DROP FUNCTION IF EXISTS public.get_tournament_leaderboard(UUID);
DROP FUNCTION IF EXISTS public.get_tournament_leaderboard(TEXT, INT, INT);
DROP FUNCTION IF EXISTS public.get_tournament_leaderboard(TEXT, INT);
DROP FUNCTION IF EXISTS public.get_tournament_leaderboard(TEXT);
CREATE OR REPLACE FUNCTION public.get_tournament_leaderboard(
  p_tournament_id TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_id TEXT,
  title_id TEXT,
  best_score INTEGER,
  best_rounds INTEGER,
  best_elapsed_ms INTEGER,
  attempts_used INTEGER,
  tournament_rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tp.user_id,
    p.display_name,
    p.avatar_id,
    p.title_id,
    tp.best_score,
    tp.best_rounds,
    tp.best_elapsed_ms,
    tp.attempts_used,
    RANK() OVER (ORDER BY tp.best_score DESC, tp.best_rounds ASC, tp.best_elapsed_ms ASC) AS tournament_rank
  FROM public.tournament_participants tp
  JOIN public.profiles p ON p.id = tp.user_id
  WHERE tp.tournament_id = p_tournament_id
    AND tp.best_score > 0
  ORDER BY tp.best_score DESC, tp.best_rounds ASC, tp.best_elapsed_ms ASC
  LIMIT LEAST(100, GREATEST(1, p_limit))
  OFFSET GREATEST(0, p_offset);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION public.get_tournament_leaderboard TO anon, authenticated;

-- Server-Verified Tournament Attempt Recording RPC (Anti-Cheat & Anti-Spoofing)
CREATE OR REPLACE FUNCTION public.record_verified_tournament_attempt(
  p_tournament_id TEXT,
  p_session_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_session RECORD;
  v_tournament RECORD;
  v_participant RECORD;
  v_next_attempts INTEGER;
  v_is_better BOOLEAN;
  v_next_score INTEGER;
  v_next_rounds INTEGER;
  v_next_elapsed INTEGER;
BEGIN
  -- 1. Identify caller
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  -- 2. Validate active tournament and attempt capacity
  SELECT * INTO v_tournament
  FROM public.tournaments
  WHERE (tournament_id = p_tournament_id OR id::TEXT = p_tournament_id)
    AND status = 'active'
    AND now() BETWEEN starts_at AND ends_at;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament is not currently active.');
  END IF;

  -- Check existing attempts
  SELECT * INTO v_participant
  FROM public.tournament_participants
  WHERE tournament_id = v_tournament.tournament_id AND user_id = v_user_id;

  IF FOUND AND v_participant.attempts_used >= v_tournament.max_attempts THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum tournament attempts reached.');
  END IF;

  -- 3. Verify authoritative game session row
  SELECT * INTO v_session
  FROM public.game_sessions
  WHERE id = p_session_id
    AND user_id = v_user_id
    AND verification_status = 'server_verified';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Valid server-verified session not found.');
  END IF;

  -- Calculate score and progression
  v_next_attempts := COALESCE(v_participant.attempts_used, 0) + 1;
  v_is_better := v_participant IS NULL OR v_session.score > COALESCE(v_participant.best_score, 0);
  v_next_score := CASE WHEN v_is_better THEN v_session.score ELSE v_participant.best_score END;
  v_next_rounds := CASE WHEN v_is_better THEN v_session.rounds ELSE v_participant.best_rounds END;
  v_next_elapsed := CASE WHEN v_is_better THEN v_session.elapsed_ms ELSE v_participant.best_elapsed_ms END;

  -- Upsert participant record atomically
  INSERT INTO public.tournament_participants (
    tournament_id,
    user_id,
    attempts_used,
    best_score,
    best_rounds,
    best_elapsed_ms,
    last_attempt_at,
    updated_at
  ) VALUES (
    v_tournament.tournament_id,
    v_user_id,
    v_next_attempts,
    v_next_score,
    v_next_rounds,
    v_next_elapsed,
    now(),
    now()
  ) ON CONFLICT (tournament_id, user_id) DO UPDATE
  SET attempts_used = v_next_attempts,
      best_score = v_next_score,
      best_rounds = v_next_rounds,
      best_elapsed_ms = v_next_elapsed,
      last_attempt_at = now(),
      updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'attempts_used', v_next_attempts,
    'best_score', v_next_score,
    'best_rounds', v_next_rounds,
    'attempts_remaining', GREATEST(0, v_tournament.max_attempts - v_next_attempts)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION public.record_verified_tournament_attempt TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. COMPETITIVE SEASONS & SOFT RESET
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.competitive_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT 'Cyber Odyssey',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  reward_tiers JSONB NOT NULL DEFAULT '{"grandmaster": {"badge": "gm_season", "xp": 2500}, "master": {"badge": "master_season", "xp": 1500}, "diamond": {"badge": "diamond_season", "xp": 1000}, "platinum": {"xp": 600}, "gold": {"xp": 400}, "silver": {"xp": 200}, "bronze": {"xp": 100}}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.player_season_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.competitive_seasons(id) ON DELETE CASCADE,
  start_rating INTEGER NOT NULL DEFAULT 400,
  final_rating INTEGER NOT NULL DEFAULT 400,
  peak_rating INTEGER NOT NULL DEFAULT 400,
  peak_tier TEXT NOT NULL DEFAULT 'bronze',
  ranked_wins INTEGER NOT NULL DEFAULT 0,
  ranked_losses INTEGER NOT NULL DEFAULT 0,
  rewards_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT player_season_unique UNIQUE (user_id, season_id)
);

ALTER TABLE public.competitive_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_season_stats ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.competitive_seasons FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.player_season_stats FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.competitive_seasons TO anon, authenticated;
GRANT SELECT ON public.player_season_stats TO authenticated;

DROP POLICY IF EXISTS "Public can view seasons" ON public.competitive_seasons;
CREATE POLICY "Public can view seasons"
  ON public.competitive_seasons FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can view own season stats" ON public.player_season_stats;
CREATE POLICY "Users can view own season stats"
  ON public.player_season_stats FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Season Soft Reset RPC (Compresses rating towards 400 baseline without erasing lifetime stats)
CREATE OR REPLACE FUNCTION public.execute_season_soft_reset(
  p_old_season_id UUID,
  p_new_season_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_rec RECORD;
  v_new_rating INTEGER;
  v_count INTEGER := 0;
BEGIN
  -- 1. Archive current ratings into player_season_stats for old season
  FOR v_rec IN SELECT * FROM public.player_ratings LOOP
    INSERT INTO public.player_season_stats (
      user_id, season_id, start_rating, final_rating, peak_rating, peak_tier, ranked_wins, ranked_losses
    ) VALUES (
      v_rec.user_id, p_old_season_id, 400, v_rec.rating, COALESCE(v_rec.best_rating, v_rec.rating, 400), v_rec.tier, v_rec.ranked_games_won, GREATEST(0, v_rec.ranked_games_played - v_rec.ranked_games_won)
    ) ON CONFLICT (user_id, season_id) DO UPDATE
    SET final_rating = EXCLUDED.final_rating,
        peak_rating = GREATEST(player_season_stats.peak_rating, EXCLUDED.peak_rating),
        peak_tier = EXCLUDED.peak_tier,
        ranked_wins = EXCLUDED.ranked_wins,
        ranked_losses = EXCLUDED.ranked_losses,
        updated_at = now();

    -- Standard Soft Reset Formula: Compressed 50% toward 600 baseline
    v_new_rating := GREATEST(400, ROUND(400 + (v_rec.rating - 400) * 0.5));

    UPDATE public.player_ratings
    SET rating = v_new_rating,
        current_win_streak = 0,
        ranked_games_played = 0,
        ranked_games_won = 0,
        updated_at = now()
    WHERE user_id = v_rec.user_id;

    v_count := v_count + 1;
  END LOOP;

  -- 2. Mark old season inactive, new season active
  UPDATE public.competitive_seasons SET is_active = false WHERE id = p_old_season_id;
  UPDATE public.competitive_seasons SET is_active = true WHERE id = p_new_season_id;

  RETURN jsonb_build_object('success', true, 'players_reset', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.execute_season_soft_reset FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_season_soft_reset TO service_role;

-- -----------------------------------------------------------------------------
-- 6. CONFIGURABLE SEASONAL EVENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seasonal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  description TEXT NOT NULL,
  banner_color TEXT NOT NULL DEFAULT '#00D2B4',
  badge_icon TEXT NOT NULL DEFAULT 'sparkles',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  challenges JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_event_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_challenges TEXT[] NOT NULL DEFAULT '{}',
  rewards_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_event_unique UNIQUE (event_id, user_id)
);

ALTER TABLE public.seasonal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_event_progress ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.seasonal_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.user_event_progress FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.seasonal_events TO anon, authenticated;
GRANT SELECT ON public.user_event_progress TO authenticated;

DROP POLICY IF EXISTS "Public can view seasonal events" ON public.seasonal_events;
CREATE POLICY "Public can view seasonal events"
  ON public.seasonal_events FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can view own event progress" ON public.user_event_progress;
CREATE POLICY "Users can view own event progress"
  ON public.user_event_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Trigger / Helper RPC: Update season stats and event progress on verified match completion
CREATE OR REPLACE FUNCTION public.process_match_season_and_events(
  p_user_id UUID,
  p_session_id UUID,
  p_won BOOLEAN,
  p_rounds INTEGER,
  p_elapsed_ms INTEGER,
  p_mode TEXT,
  p_is_ranked BOOLEAN
)
RETURNS VOID AS $$
DECLARE
  v_active_season RECORD;
  v_rating_row RECORD;
  v_event RECORD;
  v_progress_row RECORD;
  v_cur_prog JSONB;
  v_cur_wins INTEGER;
  v_cur_rounds_best INTEGER;
  v_cur_streak INTEGER;
  v_completed TEXT[];
  v_c RECORD;
BEGIN
  -- 1. Update active player_season_stats if match is ranked
  IF p_is_ranked THEN
    SELECT * INTO v_active_season
    FROM public.competitive_seasons
    WHERE is_active = true
    ORDER BY season_number DESC
    LIMIT 1;

    IF FOUND THEN
      SELECT * INTO v_rating_row
      FROM public.player_ratings
      WHERE user_id = p_user_id;

      INSERT INTO public.player_season_stats (
        user_id,
        season_id,
        start_rating,
        final_rating,
        peak_rating,
        peak_tier,
        ranked_wins,
        ranked_losses,
        updated_at
      ) VALUES (
        p_user_id,
        v_active_season.id,
        400,
        COALESCE(v_rating_row.rating, 400),
        COALESCE(v_rating_row.best_rating, v_rating_row.rating, 400),
        COALESCE(v_rating_row.tier, 'bronze'),
        CASE WHEN p_won THEN 1 ELSE 0 END,
        CASE WHEN p_won THEN 0 ELSE 1 END,
        now()
      ) ON CONFLICT (user_id, season_id) DO UPDATE
      SET final_rating = COALESCE(v_rating_row.rating, player_season_stats.final_rating),
          peak_rating = GREATEST(player_season_stats.peak_rating, COALESCE(v_rating_row.best_rating, v_rating_row.rating, 400)),
          peak_tier = COALESCE(v_rating_row.tier, player_season_stats.peak_tier),
          ranked_wins = player_season_stats.ranked_wins + (CASE WHEN p_won THEN 1 ELSE 0 END),
          ranked_losses = player_season_stats.ranked_losses + (CASE WHEN p_won THEN 0 ELSE 1 END),
          updated_at = now();
    END IF;
  END IF;

  -- 2. Update active seasonal_events challenges
  FOR v_event IN
    SELECT * FROM public.seasonal_events
    WHERE is_active = true AND now() BETWEEN starts_at AND ends_at
  LOOP
    SELECT * INTO v_progress_row
    FROM public.user_event_progress
    WHERE event_id = v_event.event_id AND user_id = p_user_id;

    v_cur_prog := COALESCE(v_progress_row.progress, '{}'::jsonb);
    v_completed := COALESCE(v_progress_row.completed_challenges, ARRAY[]::TEXT[]);

    v_cur_wins := COALESCE((v_cur_prog->>'wins')::INTEGER, 0) + (CASE WHEN p_won THEN 1 ELSE 0 END);
    v_cur_streak := CASE WHEN p_won THEN COALESCE((v_cur_prog->>'streak')::INTEGER, 0) + 1 ELSE 0 END;
    v_cur_rounds_best := CASE
      WHEN p_won AND p_rounds > 0 THEN LEAST(COALESCE((v_cur_prog->>'best_rounds')::INTEGER, 999), p_rounds)
      ELSE COALESCE((v_cur_prog->>'best_rounds')::INTEGER, 999)
    END;

    v_cur_prog := jsonb_build_object(
      'wins', v_cur_wins,
      'streak', v_cur_streak,
      'best_rounds', v_cur_rounds_best,
      'matches', COALESCE((v_cur_prog->>'matches')::INTEGER, 0) + 1
    );

    -- Check completion criteria for known challenges
    IF v_cur_wins >= 3 AND NOT ('win_3_events' = ANY(v_completed)) THEN
      v_completed := array_append(v_completed, 'win_3_events');
    END IF;
    IF v_cur_rounds_best <= 5 AND NOT ('solve_under_5_rounds' = ANY(v_completed)) THEN
      v_completed := array_append(v_completed, 'solve_under_5_rounds');
    END IF;
    IF v_cur_streak >= 2 AND NOT ('streak_2' = ANY(v_completed)) THEN
      v_completed := array_append(v_completed, 'streak_2');
    END IF;

    INSERT INTO public.user_event_progress (
      event_id,
      user_id,
      progress,
      completed_challenges,
      updated_at
    ) VALUES (
      v_event.event_id,
      p_user_id,
      v_cur_prog,
      v_completed,
      now()
    ) ON CONFLICT (event_id, user_id) DO UPDATE
    SET progress = v_cur_prog,
        completed_challenges = v_completed,
        updated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION public.process_match_season_and_events TO service_role;

-- -----------------------------------------------------------------------------
-- 7. SEED DATA (ACTIVE SEASON, TOURNAMENT, AND SEASONAL EVENTS)
-- Idempotent insertion of default active entities
-- -----------------------------------------------------------------------------
INSERT INTO public.competitive_seasons (season_number, title, theme, starts_at, ends_at, is_active)
VALUES (
  1,
  'Season 1: Neon Genesis',
  'Cyber Grid',
  now() - INTERVAL '3 days',
  now() + INTERVAL '27 days',
  true
) ON CONFLICT (season_number) DO NOTHING;

INSERT INTO public.tournaments (tournament_id, title, description, difficulty, min_range, max_range, max_attempts, starts_at, ends_at, status)
VALUES (
  'tournament_week_current',
  'Weekly Oracle Championship',
  'Crack the Expert Oracle code in fewer rounds to conquer the global championship podium.',
  'hard',
  1,
  200,
  3,
  now() - INTERVAL '1 day',
  now() + INTERVAL '6 days',
  'active'
) ON CONFLICT (tournament_id) DO NOTHING;

INSERT INTO public.seasonal_events (event_id, title, subtitle, description, banner_color, badge_icon, starts_at, ends_at, is_active, rules, challenges)
VALUES (
  'event_cyber_breach',
  'Cyber Breach Protocol',
  'Limited-Time Grid Infiltration',
  'Compete under high-speed firewall conditions. Solve encrypted numerical targets with binary efficiency.',
  '#00D2B4',
  'shield-half',
  now() - INTERVAL '2 days',
  now() + INTERVAL '12 days',
  true,
  '{"minRange": 1, "maxRange": 150, "timeLimit": 45, "lives": 6}'::jsonb,
  '[
    {"id": "win_3_events", "title": "Firewall Bypass", "desc": "Win 3 event matches", "target": 3, "rewardXp": 350},
    {"id": "solve_under_5_rounds", "title": "Binary Surgeon", "desc": "Solve in 5 or fewer rounds", "target": 1, "rewardXp": 500},
    {"id": "streak_2", "title": "Overclocked", "desc": "Achieve a 2-game win streak", "target": 2, "rewardXp": 400}
  ]'::jsonb
) ON CONFLICT (event_id) DO NOTHING;

