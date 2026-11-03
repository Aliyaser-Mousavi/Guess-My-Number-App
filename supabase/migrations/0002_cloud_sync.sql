-- ==============================================================================
-- Migration: 0002_cloud_sync.sql
-- Description: Complete Cloud Save & Synchronization System (Secured)
-- Application: Guess My Number (Expo React Native)
-- Notes: Additive migration. Preserves 0001_initial_profiles.sql.
-- ==============================================================================

-- 1. Game Sessions Table (Append-only session history with replay data)
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_session_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  won BOOLEAN NOT NULL,
  rounds INTEGER NOT NULL CHECK (rounds >= 1),
  score INTEGER NOT NULL CHECK (score >= 0),
  elapsed_ms INTEGER NOT NULL CHECK (elapsed_ms >= 0),
  hints_used INTEGER NOT NULL DEFAULT 0 CHECK (hints_used >= 0),
  is_daily BOOLEAN NOT NULL DEFAULT false,
  user_number INTEGER NOT NULL,
  secret_number INTEGER NULL,
  min_range INTEGER NULL,
  max_range INTEGER NULL,
  target_number INTEGER NULL,
  custom_config JSONB NULL,
  player1_name TEXT NULL,
  player2_name TEXT NULL,
  guesses INTEGER[] NOT NULL DEFAULT '{}',
  replay_timeline JSONB NULL,

  -- Trust & Verification Classification (SEC-01 & SEC-03)
  verification_status TEXT NOT NULL DEFAULT 'client_reported'
    CHECK (verification_status IN ('client_reported', 'server_verified', 'legacy_unverified')),
  processed_for_rewards BOOLEAN NOT NULL DEFAULT false,
  xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),

  -- Separate client reported timestamp and authoritative server recorded timestamp
  client_played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate uploads from the same client session
  CONSTRAINT game_session_unique_client UNIQUE (user_id, client_session_id)
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user_played ON public.game_sessions(user_id, client_played_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_mode ON public.game_sessions(user_id, mode);
CREATE INDEX IF NOT EXISTS idx_game_sessions_client ON public.game_sessions(user_id, client_session_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_verification ON public.game_sessions(user_id, verification_status);

-- 1B. Client Insertion Guard Trigger for game_sessions
-- Enforces that authenticated clients can only insert 'client_reported' sessions with
-- processed_for_rewards = false and xp_awarded = 0.
CREATE OR REPLACE FUNCTION public.handle_game_session_insert_guard()
RETURNS TRIGGER AS $$
BEGIN
  -- Authenticated clients cannot set server-controlled verification or reward fields
  IF (auth.role() = 'authenticated' OR auth.role() = 'anon') THEN
    NEW.verification_status := 'client_reported';
    NEW.processed_for_rewards := false;
    NEW.xp_awarded := 0;
  END IF;
  NEW.created_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_game_session_insert_guard ON public.game_sessions;
CREATE TRIGGER trg_game_session_insert_guard
  BEFORE INSERT ON public.game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_game_session_insert_guard();

-- 2. User Achievements Table (Server-authoritative achievement unlocks)
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlock_source TEXT NOT NULL DEFAULT 'server_verified',
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_achievement_unique UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);

-- 3. User Cosmetic Unlocks Inventory Table (Server-authoritative inventory)
CREATE TABLE IF NOT EXISTS public.user_cosmetic_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cosmetic_type TEXT NOT NULL CHECK (cosmetic_type IN ('avatar', 'title', 'theme', 'number_style')),
  cosmetic_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlock_source TEXT NOT NULL DEFAULT 'progression',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_cosmetic_unique UNIQUE (user_id, cosmetic_type, cosmetic_id)
);

CREATE INDEX IF NOT EXISTS idx_user_cosmetics_user ON public.user_cosmetic_unlocks(user_id);

-- 4. User Settings Table
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_id TEXT NOT NULL DEFAULT 'midnight',
  number_style TEXT NOT NULL DEFAULT 'arcade_glow',
  number_animation TEXT NOT NULL DEFAULT 'pulse',
  text_size TEXT NOT NULL DEFAULT 'normal',
  haptics BOOLEAN NOT NULL DEFAULT true,
  haptic_intensity TEXT NOT NULL DEFAULT 'medium',
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_volume REAL NOT NULL DEFAULT 0.8,
  show_proximity BOOLEAN NOT NULL DEFAULT true,
  show_timer BOOLEAN NOT NULL DEFAULT true,
  show_range_bar BOOLEAN NOT NULL DEFAULT true,
  tutorial_completed BOOLEAN NOT NULL DEFAULT false,
  high_contrast BOOLEAN NOT NULL DEFAULT false,
  color_blind_mode TEXT NOT NULL DEFAULT 'none',
  reduced_motion BOOLEAN NOT NULL DEFAULT false,
  left_handed_controls BOOLEAN NOT NULL DEFAULT false,
  language TEXT NOT NULL DEFAULT 'en',
  digit_format TEXT NOT NULL DEFAULT 'latin',
  notifications JSONB NOT NULL DEFAULT '{"dailyReminder":false,"dailyReminderTime":"09:00","missionReminder":false,"streakReminder":false,"eventReminder":false,"permissionGranted":false}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  client_modified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for automatic updated_at timestamp maintenance on user_settings
CREATE OR REPLACE FUNCTION public.handle_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_settings_updated_at();

-- 5. Legacy Progress Imports Table (Immutable snapshot for guest account migration)
CREATE TABLE IF NOT EXISTS public.legacy_progress_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  legacy_stats JSONB NOT NULL,
  legacy_xp INTEGER NOT NULL DEFAULT 0,
  legacy_level INTEGER NOT NULL DEFAULT 1,
  legacy_rank TEXT NOT NULL DEFAULT 'Beginner',
  unlocked_achievements TEXT[] NOT NULL DEFAULT '{}',
  unlocked_cosmetics JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Enforce at DB level that client imports can NEVER be verified (SEC-09)
  is_verified BOOLEAN NOT NULL DEFAULT false CHECK (is_verified = false),

  CONSTRAINT one_legacy_import_per_user UNIQUE (user_id)
);

-- 6. Synchronization Metadata Table
CREATE TABLE IF NOT EXISTS public.sync_metadata (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  client_device_id TEXT NULL,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  schema_version INTEGER NOT NULL DEFAULT 2,
  sync_version BIGINT NOT NULL DEFAULT 1,
  device_platform TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for sync_metadata updated_at
DROP TRIGGER IF EXISTS trg_sync_metadata_updated_at ON public.sync_metadata;
CREATE TRIGGER trg_sync_metadata_updated_at
  BEFORE UPDATE ON public.sync_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_settings_updated_at();

-- 7. Reward Ledger Table (Idempotent Exactly-Once Reward Audit Ledger)
CREATE TABLE IF NOT EXISTS public.reward_ledger (
  session_id UUID PRIMARY KEY REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_awarded INTEGER NOT NULL CHECK (xp_awarded >= 0),
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verification_source TEXT NOT NULL DEFAULT 'server_verified'
);

CREATE INDEX IF NOT EXISTS idx_reward_ledger_user ON public.reward_ledger(user_id);

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES & PERMISSIONS
-- ==============================================================================

-- A. Game Sessions (Strictly Append-Only. DELETE & UPDATE REVOKED) (SEC-01)
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.game_sessions FROM anon, authenticated;
GRANT SELECT, INSERT ON public.game_sessions TO authenticated;

DROP POLICY IF EXISTS "Users can read own game sessions" ON public.game_sessions;
CREATE POLICY "Users can read own game sessions"
  ON public.game_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own game sessions" ON public.game_sessions;
CREATE POLICY "Users can insert own game sessions"
  ON public.game_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- B. User Achievements (Server-Authoritative. Direct client INSERT REVOKED) (SEC-07)
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_achievements FROM anon, authenticated;
GRANT SELECT ON public.user_achievements TO authenticated;

DROP POLICY IF EXISTS "Users can read own achievements" ON public.user_achievements;
CREATE POLICY "Users can read own achievements"
  ON public.user_achievements FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- C. User Cosmetic Unlocks (Server-Authoritative. Direct client INSERT REVOKED) (SEC-02)
ALTER TABLE public.user_cosmetic_unlocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_cosmetic_unlocks FROM anon, authenticated;
GRANT SELECT ON public.user_cosmetic_unlocks TO authenticated;

DROP POLICY IF EXISTS "Users can read own cosmetic unlocks" ON public.user_cosmetic_unlocks;
CREATE POLICY "Users can read own cosmetic unlocks"
  ON public.user_cosmetic_unlocks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- D. User Settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_settings FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;

DROP POLICY IF EXISTS "Users can read own settings" ON public.user_settings;
CREATE POLICY "Users can read own settings"
  ON public.user_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- E. Legacy Progress Imports
ALTER TABLE public.legacy_progress_imports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legacy_progress_imports FROM anon, authenticated;
GRANT SELECT, INSERT ON public.legacy_progress_imports TO authenticated;

DROP POLICY IF EXISTS "Users can read own legacy import" ON public.legacy_progress_imports;
CREATE POLICY "Users can read own legacy import"
  ON public.legacy_progress_imports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own legacy import once" ON public.legacy_progress_imports;
CREATE POLICY "Users can insert own legacy import once"
  ON public.legacy_progress_imports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_verified = false);

-- F. Sync Metadata
ALTER TABLE public.sync_metadata ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sync_metadata FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sync_metadata TO authenticated;

DROP POLICY IF EXISTS "Users can read own sync metadata" ON public.sync_metadata;
CREATE POLICY "Users can read own sync metadata"
  ON public.sync_metadata FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own sync metadata" ON public.sync_metadata;
CREATE POLICY "Users can manage own sync metadata"
  ON public.sync_metadata FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- G. Reward Ledger (Read-only for owner)
ALTER TABLE public.reward_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reward_ledger FROM anon, authenticated;
GRANT SELECT ON public.reward_ledger TO authenticated;

DROP POLICY IF EXISTS "Users can read own reward ledger" ON public.reward_ledger;
CREATE POLICY "Users can read own reward ledger"
  ON public.reward_ledger FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 9. SERVER-AUTHORITATIVE REWARD PROCESSING (RPC)
-- Restricted to trusted service role. Rejects unverified sessions.
-- Enforces hard XP caps and does NOT corrupt competitive rank (SEC-03, SEC-08, SEC-10).
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.process_game_session_reward(p_session_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_session RECORD;
  v_base_xp INTEGER := 120;
  v_diff_mult NUMERIC := 1.0;
  v_mode_mult NUMERIC := 1.0;
  v_score_xp INTEGER := 0;
  v_speed_bonus INTEGER := 0;
  v_efficiency_bonus INTEGER := 0;
  v_hintless_bonus INTEGER := 0;
  v_daily_bonus INTEGER := 0;
  v_raw_xp NUMERIC := 0;
  v_xp_gained INTEGER := 0;

  -- Profile state
  v_profile RECORD;
  v_new_level INTEGER;
  v_new_current_xp INTEGER;
  v_threshold INTEGER;
  v_did_level_up BOOLEAN := false;
  v_levels_gained INTEGER := 0;
BEGIN
  -- 1. Identify target session record
  SELECT * INTO v_session
  FROM public.game_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game session % not found.', p_session_id;
  END IF;

  v_user_id := v_session.user_id;

  -- 2. Trust Model Enforcement (SEC-03 & SEC-04)
  -- Reject unverified client-reported or legacy sessions from generating official XP
  IF v_session.verification_status != 'server_verified' THEN
    RAISE EXCEPTION 'Cannot reward unverified session: verification_status is %', v_session.verification_status;
  END IF;

  -- 3. Exactly-Once Idempotency Check (SEC-01 & SEC-10)
  IF v_session.processed_for_rewards OR EXISTS (SELECT 1 FROM public.reward_ledger WHERE session_id = p_session_id) THEN
    SELECT level, xp, rank INTO v_profile FROM public.profiles WHERE id = v_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'xp_gained', v_session.xp_awarded,
      'level', v_profile.level,
      'xp', v_profile.xp,
      'rank', v_profile.rank,
      'did_level_up', false,
      'levels_gained', 0
    );
  END IF;

  -- 4. Calculate XP with sanity caps
  IF NOT v_session.won THEN
    -- Consolation XP
    v_xp_gained := LEAST(40, GREATEST(10, FLOOR(v_session.rounds * 5)));
  ELSE
    -- Difficulty multiplier
    IF v_session.difficulty = 'novice' THEN v_diff_mult := 0.8;
    ELSIF v_session.difficulty = 'easy' THEN v_diff_mult := 1.0;
    ELSIF v_session.difficulty = 'medium' THEN v_diff_mult := 1.5;
    ELSIF v_session.difficulty = 'hard' THEN v_diff_mult := 2.2;
    ELSIF v_session.difficulty = 'expert' THEN v_diff_mult := 3.5;
    ELSE v_diff_mult := 1.0;
    END IF;

    -- Mode multiplier
    IF v_session.mode IN ('you_guess', 'player') THEN v_mode_mult := 1.1;
    ELSIF v_session.mode IN ('oracle', 'opponent') THEN v_mode_mult := 1.0;
    ELSIF v_session.mode IN ('time_attack', 'timeAttack') THEN v_mode_mult := 1.25;
    ELSIF v_session.mode = 'survival' THEN v_mode_mult := 1.35;
    ELSIF v_session.mode = 'blitz' THEN v_mode_mult := 1.3;
    ELSIF v_session.mode IN ('logic_puzzle', 'logicPuzzle') THEN v_mode_mult := 1.4;
    ELSIF v_session.mode IN ('two_player', 'passAndPlay') THEN v_mode_mult := 1.0;
    ELSIF v_session.mode = 'custom' THEN v_mode_mult := 0.9;
    ELSE v_mode_mult := 1.0;
    END IF;

    -- Score factor with hard ceiling (max 150 score-based XP) to prevent score injection (SEC-03)
    v_score_xp := LEAST(150, FLOOR(v_session.score * 0.08));

    -- Speed bonus
    IF v_session.elapsed_ms > 0 AND v_session.elapsed_ms < 20000 THEN
      v_speed_bonus := 80;
    ELSIF v_session.elapsed_ms > 0 AND v_session.elapsed_ms < 40000 THEN
      v_speed_bonus := 40;
    END IF;

    -- Efficiency bonus (fewer rounds)
    IF v_session.rounds <= 5 THEN
      v_efficiency_bonus := 75;
    ELSIF v_session.rounds <= 7 THEN
      v_efficiency_bonus := 35;
    END IF;

    -- Hintless bonus
    IF v_session.hints_used = 0 THEN
      v_hintless_bonus := 50;
    END IF;

    -- Daily challenge bonus
    IF v_session.is_daily THEN
      v_daily_bonus := 120;
    END IF;

    v_raw_xp := (v_base_xp + v_score_xp + v_speed_bonus + v_efficiency_bonus + v_hintless_bonus + v_daily_bonus) * v_diff_mult * v_mode_mult;
    -- Hard total XP cap per session (max 600 XP per match)
    v_xp_gained := LEAST(600, GREATEST(30, FLOOR(v_raw_xp)));
  END IF;

  -- 5. Lock and update profile progression
  SELECT level, xp, rank INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  v_new_level := v_profile.level;
  v_new_current_xp := v_profile.xp + v_xp_gained;

  -- Calculate level threshold curve: 400 base + linear + polynomial
  WHILE v_new_level < 100 LOOP
    IF v_new_level >= 100 THEN
      v_threshold := 15000;
    ELSE
      v_threshold := FLOOR(400 + (v_new_level - 1) * 120 + POW(v_new_level - 1, 1.5) * 25);
    END IF;

    IF v_new_current_xp >= v_threshold THEN
      v_new_current_xp := v_new_current_xp - v_threshold;
      v_new_level := v_new_level + 1;
      v_levels_gained := v_levels_gained + 1;
      v_did_level_up := true;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  -- NOTE: Competitive Rank is NOT updated here. It is governed exclusively by Group 05
  -- competitive rating (MMR) calculations to preserve competitive integrity (SEC-08).

  -- Update profiles with server-authoritative level and XP
  UPDATE public.profiles
  SET xp = v_new_current_xp,
      level = v_new_level,
      updated_at = now()
  WHERE id = v_user_id;

  -- 6. Mark session as processed in both game_sessions and reward_ledger
  UPDATE public.game_sessions
  SET processed_for_rewards = true,
      xp_awarded = v_xp_gained
  WHERE id = p_session_id;

  INSERT INTO public.reward_ledger (session_id, user_id, xp_awarded, verification_source)
  VALUES (p_session_id, v_user_id, v_xp_gained, 'server_verified')
  ON CONFLICT (session_id) DO NOTHING;

  -- 7. Automatically grant cosmetic unlocks associated with the new level
  IF v_new_level >= 5 THEN
    INSERT INTO public.user_cosmetic_unlocks (user_id, cosmetic_type, cosmetic_id, unlock_source)
    VALUES (v_user_id, 'avatar', 'quantum_core', 'progression_level_5')
    ON CONFLICT (user_id, cosmetic_type, cosmetic_id) DO NOTHING;
  END IF;
  IF v_new_level >= 10 THEN
    INSERT INTO public.user_cosmetic_unlocks (user_id, cosmetic_type, cosmetic_id, unlock_source)
    VALUES (v_user_id, 'avatar', 'mystic_eye', 'progression_level_10')
    ON CONFLICT (user_id, cosmetic_type, cosmetic_id) DO NOTHING;
  END IF;
  IF v_new_level >= 15 THEN
    INSERT INTO public.user_cosmetic_unlocks (user_id, cosmetic_type, cosmetic_id, unlock_source)
    VALUES (v_user_id, 'avatar', 'cybernetic_mind', 'progression_level_15')
    ON CONFLICT (user_id, cosmetic_type, cosmetic_id) DO NOTHING;
  END IF;
  IF v_new_level >= 25 THEN
    INSERT INTO public.user_cosmetic_unlocks (user_id, cosmetic_type, cosmetic_id, unlock_source)
    VALUES (v_user_id, 'avatar', 'golden_hunter', 'progression_level_25')
    ON CONFLICT (user_id, cosmetic_type, cosmetic_id) DO NOTHING;
  END IF;
  IF v_new_level >= 50 THEN
    INSERT INTO public.user_cosmetic_unlocks (user_id, cosmetic_type, cosmetic_id, unlock_source)
    VALUES (v_user_id, 'avatar', 'void_sovereign', 'progression_level_50')
    ON CONFLICT (user_id, cosmetic_type, cosmetic_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'xp_gained', v_xp_gained,
    'level', v_new_level,
    'xp', v_new_current_xp,
    'rank', v_profile.rank,
    'did_level_up', v_did_level_up,
    'levels_gained', v_levels_gained
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Revoke execute from all client roles (SEC-10)
REVOKE ALL ON FUNCTION public.process_game_session_reward(UUID) FROM PUBLIC, anon, authenticated;
-- Grant execute strictly to service_role for backend / Edge Function invocation
GRANT EXECUTE ON FUNCTION public.process_game_session_reward(UUID) TO service_role;
