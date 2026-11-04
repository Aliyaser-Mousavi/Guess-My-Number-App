-- ==============================================================================
-- Migration: 0005_competitive_and_server_authoritative.sql
-- Description: Group 07C - Server-Authoritative Gameplay, Ranked System,
--              Competitive Rating (CR / MMR), Matchmaking, & Global Leaderboards
-- Application: Guess My Number (Expo React Native & Supabase)
-- Notes: Additive migration. Completely preserves Groups 01-07B schema and RLS.
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. SERVER-AUTHORITATIVE ACTIVE GAME SESSIONS
-- Stores active server-side game sessions with the hidden secret number.
-- Access is strictly RESTRICTED to service_role to ensure clients can never inspect secrets.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.server_game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'player',
  difficulty TEXT NOT NULL DEFAULT 'medium',
  secret_number INTEGER NOT NULL,
  min_range INTEGER NOT NULL DEFAULT 1,
  max_range INTEGER NOT NULL DEFAULT 100,
  max_lives INTEGER NOT NULL DEFAULT 7,
  lives_remaining INTEGER NOT NULL DEFAULT 7,
  max_hints INTEGER NOT NULL DEFAULT 2,
  hints_used INTEGER NOT NULL DEFAULT 0,
  guesses INTEGER[] NOT NULL DEFAULT '{}',
  guess_feedbacks TEXT[] NOT NULL DEFAULT '{}',
  rounds INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'abandoned', 'expired')),
  is_daily BOOLEAN NOT NULL DEFAULT false,
  is_ranked BOOLEAN NOT NULL DEFAULT false,
  matched_opponent_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  score INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_server_game_sessions_user_status ON public.server_game_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_server_game_sessions_expires ON public.server_game_sessions(expires_at) WHERE status = 'active';

-- Strict Security Boundary: REVOKE all access from public, anon, and authenticated roles.
-- Only Edge Functions running under service_role can interact with this table.
ALTER TABLE public.server_game_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.server_game_sessions FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. PLAYER COMPETITIVE RATINGS (CR / MMR)
-- Stores official server-authoritative competitive ratings and rank tiers.
-- Clients have read-only access (via SELECT) for profile & leaderboard display.
-- All modifications must execute via service_role / trusted server functions.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_ratings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL DEFAULT 400 CHECK (rating >= 0),
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('beginner', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster')),
  division TEXT NOT NULL DEFAULT 'III',
  season_id INTEGER NOT NULL DEFAULT 1,
  ranked_games_played INTEGER NOT NULL DEFAULT 0 CHECK (ranked_games_played >= 0),
  ranked_games_won INTEGER NOT NULL DEFAULT 0 CHECK (ranked_games_won >= 0),
  best_rating INTEGER NOT NULL DEFAULT 400 CHECK (best_rating >= 0),
  current_win_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_win_streak >= 0),
  best_win_streak INTEGER NOT NULL DEFAULT 0 CHECK (best_win_streak >= 0),
  last_match_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_ratings_ranking ON public.player_ratings(rating DESC, ranked_games_won DESC, updated_at ASC);
CREATE INDEX IF NOT EXISTS idx_player_ratings_tier ON public.player_ratings(tier, rating DESC);

ALTER TABLE public.player_ratings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_ratings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.player_ratings TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view player ratings" ON public.player_ratings;
CREATE POLICY "Public can view player ratings"
  ON public.player_ratings FOR SELECT TO anon, authenticated
  USING (true);

-- -----------------------------------------------------------------------------
-- 3. RATING AUDIT HISTORY
-- Exactly-once ledger of all competitive rating changes per match session.
-- Prevents double-awarding of rating updates and ensures auditability.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rating_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  old_rating INTEGER NOT NULL,
  new_rating INTEGER NOT NULL,
  rating_delta INTEGER NOT NULL,
  old_tier TEXT NOT NULL,
  new_tier TEXT NOT NULL,
  match_outcome TEXT NOT NULL CHECK (match_outcome IN ('win', 'loss', 'abandon')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rating_history_session_unique UNIQUE (user_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_rating_history_user ON public.rating_history(user_id, created_at DESC);

ALTER TABLE public.rating_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rating_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.rating_history TO authenticated;

DROP POLICY IF EXISTS "Users can read own rating history" ON public.rating_history;
CREATE POLICY "Users can read own rating history"
  ON public.rating_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 4. MATCHMAKING QUEUE
-- Manages concurrent queue entries for ranked matchmaking.
-- One active queue entry per user enforced by UNIQUE(user_id).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  mode TEXT NOT NULL DEFAULT 'player',
  player_rating INTEGER NOT NULL DEFAULT 400,
  player_tier TEXT NOT NULL DEFAULT 'bronze',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'matched', 'cancelled', 'expired')),
  matched_with UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID NULL,
  enqueued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '3 minutes'),
  CONSTRAINT matchmaking_unique_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_matchmaking_active ON public.matchmaking_queue(difficulty, status, enqueued_at) WHERE status = 'queued';

ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.matchmaking_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.matchmaking_queue TO authenticated;

DROP POLICY IF EXISTS "Users can view own matchmaking entry" ON public.matchmaking_queue;
CREATE POLICY "Users can view own matchmaking entry"
  ON public.matchmaking_queue FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can cancel own matchmaking entry" ON public.matchmaking_queue;
CREATE POLICY "Users can cancel own matchmaking entry"
  ON public.matchmaking_queue FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 5. FUNCTION: UPDATE PLAYER COMPETITIVE RATING (SERVER-AUTHORITATIVE)
-- Atomically calculates and updates MMR/CR based on verified match results.
-- Idempotent: rejects duplicate updates for the same session.
-- Restricted exclusively to service_role.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_player_competitive_rating(
  p_user_id UUID,
  p_session_id UUID,
  p_won BOOLEAN,
  p_rounds INTEGER DEFAULT 5,
  p_difficulty TEXT DEFAULT 'medium',
  p_elapsed_ms INTEGER DEFAULT 30000
)
RETURNS JSONB AS $$
DECLARE
  v_current public.player_ratings%ROWTYPE;
  v_old_rating INTEGER;
  v_new_rating INTEGER;
  v_delta INTEGER := 0;
  v_base_gain INTEGER := 25;
  v_speed_bonus INTEGER := 0;
  v_efficiency_bonus INTEGER := 0;
  v_diff_multiplier REAL := 1.0;
  v_streak_bonus INTEGER := 0;
  v_new_tier TEXT;
  v_new_div TEXT;
  v_old_tier TEXT;
  v_new_streak INTEGER;
  v_new_best_streak INTEGER;
  v_new_played INTEGER;
  v_new_won INTEGER;
  v_new_best_rating INTEGER;
  v_outcome TEXT;
BEGIN
  -- 1. Ensure user ratings row exists (or initialize default)
  INSERT INTO public.player_ratings (user_id, rating, tier, division)
  VALUES (p_user_id, 400, 'bronze', 'III')
  ON CONFLICT (user_id) DO NOTHING;

  -- 2. Lock row for update
  SELECT * INTO v_current
  FROM public.player_ratings
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- 3. Idempotency Check: prevent duplicate rating updates for the same session
  IF EXISTS (SELECT 1 FROM public.rating_history WHERE user_id = p_user_id AND session_id = p_session_id) THEN
    SELECT * INTO v_current FROM public.player_ratings WHERE user_id = p_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'rating', v_current.rating,
      'tier', v_current.tier,
      'division', v_current.division,
      'rating_delta', 0
    );
  END IF;

  v_old_rating := v_current.rating;
  v_old_tier := v_current.tier;

  -- 4. Calculate Rating Delta according to Group 05 design
  IF p_won THEN
    v_outcome := 'win';

    -- Difficulty factor
    IF p_difficulty = 'easy' THEN v_diff_multiplier := 0.8;
    ELSIF p_difficulty = 'medium' THEN v_diff_multiplier := 1.0;
    ELSIF p_difficulty = 'hard' THEN v_diff_multiplier := 1.35;
    ELSIF p_difficulty = 'expert' THEN v_diff_multiplier := 1.75;
    END IF;

    -- Speed bonus (fast solve within 25 seconds)
    IF p_elapsed_ms > 0 AND p_elapsed_ms < 25000 THEN
      v_speed_bonus := 15;
    ELSIF p_elapsed_ms > 0 AND p_elapsed_ms < 45000 THEN
      v_speed_bonus := 8;
    END IF;

    -- Efficiency bonus (optimal binary search is ~6-7 rounds for 1-100)
    IF p_rounds <= 4 THEN
      v_efficiency_bonus := 18;
    ELSIF p_rounds <= 6 THEN
      v_efficiency_bonus := 10;
    END IF;

    -- Streak bonus (+5 per streak up to max +25)
    v_streak_bonus := LEAST(25, (v_current.current_win_streak + 1) * 5);

    v_delta := ROUND((v_base_gain + v_speed_bonus + v_efficiency_bonus) * v_diff_multiplier + v_streak_bonus);
    v_delta := GREATEST(15, LEAST(75, v_delta)); -- Clamp win delta between +15 and +75
    v_new_rating := v_old_rating + v_delta;
    v_new_streak := v_current.current_win_streak + 1;
    v_new_won := v_current.ranked_games_won + 1;
  ELSE
    v_outcome := 'loss';
    v_delta := -20; -- Standard competitive loss deduction
    v_new_rating := GREATEST(0, v_old_rating + v_delta); -- Minimum 0 CR (no negative rating)
    v_new_streak := 0;
    v_new_won := v_current.ranked_games_won;
  END IF;

  v_new_played := v_current.ranked_games_played + 1;
  v_new_best_streak := GREATEST(v_current.best_win_streak, v_new_streak);
  v_new_best_rating := GREATEST(v_current.best_rating, v_new_rating);

  -- 5. Determine Tier and Division from new rating
  IF v_new_rating >= 7200 THEN
    v_new_tier := 'grandmaster';
    v_new_div := '';
  ELSIF v_new_rating >= 5500 THEN
    v_new_tier := 'master';
    IF v_new_rating < 6066 THEN v_new_div := 'III';
    ELSIF v_new_rating < 6633 THEN v_new_div := 'II';
    ELSE v_new_div := 'I';
    END IF;
  ELSIF v_new_rating >= 4000 THEN
    v_new_tier := 'diamond';
    IF v_new_rating < 4500 THEN v_new_div := 'III';
    ELSIF v_new_rating < 5000 THEN v_new_div := 'II';
    ELSE v_new_div := 'I';
    END IF;
  ELSIF v_new_rating >= 2800 THEN
    v_new_tier := 'platinum';
    IF v_new_rating < 3200 THEN v_new_div := 'III';
    ELSIF v_new_rating < 3600 THEN v_new_div := 'II';
    ELSE v_new_div := 'I';
    END IF;
  ELSIF v_new_rating >= 1800 THEN
    v_new_tier := 'gold';
    IF v_new_rating < 2133 THEN v_new_div := 'III';
    ELSIF v_new_rating < 2466 THEN v_new_div := 'II';
    ELSE v_new_div := 'I';
    END IF;
  ELSIF v_new_rating >= 1000 THEN
    v_new_tier := 'silver';
    IF v_new_rating < 1266 THEN v_new_div := 'III';
    ELSIF v_new_rating < 1533 THEN v_new_div := 'II';
    ELSE v_new_div := 'I';
    END IF;
  ELSIF v_new_rating >= 400 THEN
    v_new_tier := 'bronze';
    IF v_new_rating < 600 THEN v_new_div := 'III';
    ELSIF v_new_rating < 800 THEN v_new_div := 'II';
    ELSE v_new_div := 'I';
    END IF;
  ELSE
    v_new_tier := 'beginner';
    v_new_div := '';
  END IF;

  -- 6. Update player_ratings table
  UPDATE public.player_ratings
  SET rating = v_new_rating,
      tier = v_new_tier,
      division = v_new_div,
      ranked_games_played = v_new_played,
      ranked_games_won = v_new_won,
      best_rating = v_new_best_rating,
      current_win_streak = v_new_streak,
      best_win_streak = v_new_best_streak,
      last_match_at = now(),
      updated_at = now()
  WHERE user_id = p_user_id;

  -- 7. Record rating history entry
  INSERT INTO public.rating_history (
    user_id, session_id, old_rating, new_rating, rating_delta, old_tier, new_tier, match_outcome
  ) VALUES (
    p_user_id, p_session_id, v_old_rating, v_new_rating, v_delta, v_old_tier, v_new_tier, v_outcome
  );

  -- 8. Automatically grant Tier-based cosmetic rewards
  IF v_new_rating >= 1800 THEN -- Gold Tier Avatar: quantum_core / cyber_crown
    INSERT INTO public.user_cosmetic_unlocks (user_id, cosmetic_type, cosmetic_id, unlock_source)
    VALUES (p_user_id, 'avatar', 'cyber_crown', 'ranked_gold_tier')
    ON CONFLICT (user_id, cosmetic_type, cosmetic_id) DO NOTHING;
  END IF;
  IF v_new_rating >= 4000 THEN -- Diamond Tier Avatar: void_sovereign
    INSERT INTO public.user_cosmetic_unlocks (user_id, cosmetic_type, cosmetic_id, unlock_source)
    VALUES (p_user_id, 'avatar', 'void_sovereign', 'ranked_diamond_tier')
    ON CONFLICT (user_id, cosmetic_type, cosmetic_id) DO NOTHING;
  END IF;
  IF v_new_rating >= 7200 THEN -- Grandmaster Glyph
    INSERT INTO public.user_cosmetic_unlocks (user_id, cosmetic_type, cosmetic_id, unlock_source)
    VALUES (p_user_id, 'avatar', 'grandmaster_glyph', 'ranked_grandmaster_tier')
    ON CONFLICT (user_id, cosmetic_type, cosmetic_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'old_rating', v_old_rating,
    'new_rating', v_new_rating,
    'rating_delta', v_delta,
    'old_tier', v_old_tier,
    'new_tier', v_new_tier,
    'division', v_new_div,
    'win_streak', v_new_streak,
    'best_streak', v_new_best_streak
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.update_player_competitive_rating FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_player_competitive_rating TO service_role;

-- -----------------------------------------------------------------------------
-- 6. FUNCTION: GET RANKED LEADERBOARD
-- High-performance query returning paginated global ranked leaderboard.
-- Safe for authenticated & anon clients.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_ranked_leaderboard(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_id TEXT,
  title_id TEXT,
  rating INTEGER,
  tier TEXT,
  division TEXT,
  ranked_games_played INTEGER,
  ranked_games_won INTEGER,
  win_rate REAL,
  current_win_streak INTEGER,
  global_rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.username,
    p.display_name,
    p.avatar_id,
    p.title_id,
    r.rating,
    r.tier,
    r.division,
    r.ranked_games_played,
    r.ranked_games_won,
    CASE
      WHEN r.ranked_games_played > 0 THEN ROUND((r.ranked_games_won::REAL / r.ranked_games_played::REAL) * 100)::REAL
      ELSE 0::REAL
    END AS win_rate,
    r.current_win_streak,
    RANK() OVER (ORDER BY r.rating DESC, r.ranked_games_won DESC, r.updated_at ASC) AS global_rank
  FROM public.player_ratings r
  JOIN public.profiles p ON p.id = r.user_id
  WHERE r.ranked_games_played > 0
  ORDER BY r.rating DESC, r.ranked_games_won DESC, r.updated_at ASC
  LIMIT LEAST(100, GREATEST(1, p_limit))
  OFFSET GREATEST(0, p_offset);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION public.get_ranked_leaderboard TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7. FUNCTION: GET USER LEADERBOARD POSITION
-- Retrieves the caller's specific global standing.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_leaderboard_position(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_id TEXT,
  title_id TEXT,
  rating INTEGER,
  tier TEXT,
  division TEXT,
  ranked_games_played INTEGER,
  ranked_games_won INTEGER,
  win_rate REAL,
  global_rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_players AS (
    SELECT
      p.id AS r_user_id,
      p.display_name AS r_display_name,
      p.avatar_id AS r_avatar_id,
      p.title_id AS r_title_id,
      r.rating AS r_rating,
      r.tier AS r_tier,
      r.division AS r_division,
      r.ranked_games_played AS r_games_played,
      r.ranked_games_won AS r_games_won,
      CASE
        WHEN r.ranked_games_played > 0 THEN ROUND((r.ranked_games_won::REAL / r.ranked_games_played::REAL) * 100)::REAL
        ELSE 0::REAL
      END AS r_win_rate,
      RANK() OVER (ORDER BY r.rating DESC, r.ranked_games_won DESC, r.updated_at ASC) AS r_rank
    FROM public.player_ratings r
    JOIN public.profiles p ON p.id = r.user_id
  )
  SELECT
    rp.r_user_id,
    rp.r_display_name,
    rp.r_avatar_id,
    rp.r_title_id,
    rp.r_rating,
    rp.r_tier,
    rp.r_division,
    rp.r_games_played,
    rp.r_games_won,
    rp.r_win_rate,
    rp.r_rank
  FROM ranked_players rp
  WHERE rp.r_user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION public.get_user_leaderboard_position TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 8. INITIALIZE PLAYER RATINGS TRIGGER
-- Automatically creates a default player_ratings record when a new profile is created.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_player_rating()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.player_ratings (user_id, rating, tier, division)
  VALUES (NEW.id, 400, 'bronze', 'III')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_profile_init_player_rating ON public.profiles;
CREATE TRIGGER trg_profile_init_player_rating
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_player_rating();

-- -----------------------------------------------------------------------------
-- 9. IDEMPOTENT BACKFILL FOR PRE-EXISTING PROFILES
-- Backfills default 400 CR (Bronze III) ratings for users registered prior to 0005.
-- -----------------------------------------------------------------------------
INSERT INTO public.player_ratings (user_id, rating, tier, division)
SELECT id, 400, 'bronze', 'III'
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;


