-- ==============================================================================
-- Test Script: cloud_sync_live_validation.sql
-- Description: Live PostgreSQL & RLS Validation Suite for Group 07B Migrations
-- Target: Supabase SQL Editor (PostgreSQL 15+)
-- Migrations Tested: 0001_initial_profiles.sql, 0002_cloud_sync.sql,
--                    0003_settings_concurrency.sql, 0004_settings_concurrency_fix.sql
-- Execution Rule: Transactional with automatic ROLLBACK at the end so test data
--                is never permanently written to the live database.
-- ==============================================================================

BEGIN;

DO $$
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'STARTING GUESS MY NUMBER: LIVE DATABASE & RLS VALIDATION SUITE';
  RAISE NOTICE '====================================================================';
END $$;

-- -----------------------------------------------------------------------------
-- CONFIGURATION: DEFINE TEST USERS (SET ONCE HERE FOR THE ENTIRE SUITE)
-- -----------------------------------------------------------------------------
-- Instructions:
-- 1. In Supabase Dashboard, go to Authentication -> Users.
-- 2. Locate two existing user accounts (or click "Add user" -> "Create user" to create two test accounts).
-- 3. Copy their UUIDs and paste them below replacing the placeholder UUIDs.
-- 4. Execute this entire script in the Supabase SQL Editor.
CREATE TEMP TABLE IF NOT EXISTS _test_users_config (
  user_a UUID NOT NULL,
  user_b UUID NOT NULL
) ON COMMIT DROP;

TRUNCATE TABLE _test_users_config;
INSERT INTO _test_users_config (user_a, user_b)
VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID, -- <<< CONFIGURE TEST USER A UID
  '00000000-0000-0000-0000-000000000002'::UUID  -- <<< CONFIGURE TEST USER B UID
);

-- -----------------------------------------------------------------------------
-- SETUP: VERIFY TEST FIXTURES & NON-DESTRUCTIVE COLLISION PROTECTION
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_test_user_a UUID;
  v_test_user_b UUID;
BEGIN
  SELECT user_a, user_b INTO v_test_user_a, v_test_user_b FROM _test_users_config;

  -- 1. Check for unconfigured placeholder UUIDs
  IF v_test_user_a IN ('00000000-0000-0000-0000-000000000000'::UUID, '00000000-0000-0000-0000-000000000001'::UUID) OR
     v_test_user_b IN ('00000000-0000-0000-0000-000000000000'::UUID, '00000000-0000-0000-0000-000000000002'::UUID) OR
     v_test_user_a = v_test_user_b THEN
    RAISE EXCEPTION 'TEST SETUP ABORTED: Please configure two real, distinct test user UUIDs in _test_users_config at lines 31-32 before running in Supabase SQL Editor.';
  END IF;

  -- 2. Verify both test users exist in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_test_user_a) THEN
    RAISE EXCEPTION 'TEST SETUP ABORTED: Test User A (%) not found in auth.users. Create the user in Supabase Authentication before running.', v_test_user_a;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_test_user_b) THEN
    RAISE EXCEPTION 'TEST SETUP ABORTED: Test User B (%) not found in auth.users. Create the user in Supabase Authentication before running.', v_test_user_b;
  END IF;

  -- 3. Collision Protection: Clean up any pre-existing rows for test users inside this transaction.
  -- Notice: Because this script ends with ROLLBACK, all pre-existing rows are fully restored!
  DELETE FROM public.reward_ledger WHERE user_id IN (v_test_user_a, v_test_user_b);
  DELETE FROM public.game_sessions WHERE user_id IN (v_test_user_a, v_test_user_b);
  DELETE FROM public.user_achievements WHERE user_id IN (v_test_user_a, v_test_user_b);
  DELETE FROM public.user_cosmetic_unlocks WHERE user_id IN (v_test_user_a, v_test_user_b);
  DELETE FROM public.user_settings WHERE user_id IN (v_test_user_a, v_test_user_b);
  DELETE FROM public.legacy_progress_imports WHERE user_id IN (v_test_user_a, v_test_user_b);
  DELETE FROM public.sync_metadata WHERE user_id IN (v_test_user_a, v_test_user_b);

  RAISE NOTICE '[SETUP] Verified test user fixtures exist in auth.users:';
  RAISE NOTICE '        User A: %', v_test_user_a;
  RAISE NOTICE '        User B: %', v_test_user_b;
  RAISE NOTICE '[SETUP] Clean slate established for test fixtures within transaction.';
END $$;

-- -----------------------------------------------------------------------------
-- PART A: SCHEMA, FUNCTION, INDEX & RLS EXISTENCE VERIFICATION
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_table_name TEXT;
  v_tables TEXT[] := ARRAY[
    'profiles',
    'game_sessions',
    'user_achievements',
    'user_cosmetic_unlocks',
    'user_settings',
    'legacy_progress_imports',
    'sync_metadata',
    'reward_ledger'
  ];
  v_rls_enabled BOOLEAN;
  v_func_count INTEGER;
  v_trg_count INTEGER;
BEGIN
  RAISE NOTICE '--------------------------------------------------------------------';
  RAISE NOTICE 'PART A: SCHEMA AND MIGRATION VERIFICATION';
  RAISE NOTICE '--------------------------------------------------------------------';

  -- A.1 Verify all required tables exist and have RLS enabled
  FOREACH v_table_name IN ARRAY v_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_table_name
    ) THEN
      RAISE EXCEPTION '[FAIL] Part A.1: Expected table public.% is missing!', v_table_name;
    END IF;

    SELECT c.relrowsecurity INTO v_rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = v_table_name;

    IF v_rls_enabled IS NOT TRUE THEN
      RAISE EXCEPTION '[FAIL] Part A.1: Table public.% does NOT have RLS enabled!', v_table_name;
    END IF;

    RAISE NOTICE '[PASS] Table public.% exists with RLS enabled.', v_table_name;
  END LOOP;

  -- A.2 Verify critical functions exist
  SELECT COUNT(*) INTO v_func_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'process_game_session_reward';
  IF v_func_count = 0 THEN
    RAISE EXCEPTION '[FAIL] Part A.2: Function public.process_game_session_reward is missing!';
  END IF;
  RAISE NOTICE '[PASS] Function public.process_game_session_reward exists.';

  SELECT COUNT(*) INTO v_func_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN ('handle_user_settings_versioning', 'handle_user_settings_insert');
  IF v_func_count < 2 THEN
    RAISE EXCEPTION '[FAIL] Part A.2: Versioning triggers functions from 0003 are missing! (Count: %)', v_func_count;
  END IF;
  RAISE NOTICE '[PASS] Migration 0003 trigger functions exist.';

  SELECT COUNT(*) INTO v_func_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'update_user_settings_optimistic';
  IF v_func_count = 0 THEN
    RAISE EXCEPTION '[FAIL] Part A.2: Function public.update_user_settings_optimistic is missing!';
  END IF;
  RAISE NOTICE '[PASS] Function public.update_user_settings_optimistic exists.';

  SELECT COUNT(*) INTO v_func_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'handle_game_session_insert_guard';
  IF v_func_count = 0 THEN
    RAISE EXCEPTION '[FAIL] Part A.2: Function public.handle_game_session_insert_guard is missing!';
  END IF;
  RAISE NOTICE '[PASS] Function public.handle_game_session_insert_guard exists.';

  -- A.3 Verify triggers exist on public.user_settings
  SELECT COUNT(*) INTO v_trg_count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'user_settings'
    AND t.tgname IN ('trg_user_settings_versioning', 'trg_user_settings_insert');
  IF v_trg_count < 2 THEN
    RAISE EXCEPTION '[FAIL] Part A.3: Expected user_settings triggers missing! (Found: %)', v_trg_count;
  END IF;
  RAISE NOTICE '[PASS] Triggers trg_user_settings_versioning and trg_user_settings_insert attached to user_settings.';

  -- A.4 Verify trigger on game_sessions exists
  SELECT COUNT(*) INTO v_trg_count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'game_sessions'
    AND t.tgname = 'trg_game_session_insert_guard';
  IF v_trg_count = 0 THEN
    RAISE EXCEPTION '[FAIL] Part A.4: Trigger trg_game_session_insert_guard on game_sessions is missing!';
  END IF;
  RAISE NOTICE '[PASS] Trigger trg_game_session_insert_guard attached to game_sessions.';
END $$;

-- -----------------------------------------------------------------------------
-- PART B: GAME SESSION SECURITY & IMMUTABILITY (AS AUTHENTICATED ROLE)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_test_user_a UUID;
  v_test_user_b UUID;
  v_session_a UUID;
  v_status TEXT;
  v_processed BOOLEAN;
  v_xp_awarded INTEGER;
  v_test_failed BOOLEAN;
  v_error_caught BOOLEAN;
  v_sqlstate TEXT;
  v_error_message TEXT;
  v_count INTEGER;
BEGIN
  SELECT user_a, user_b INTO v_test_user_a, v_test_user_b FROM _test_users_config;

  RAISE NOTICE '--------------------------------------------------------------------';
  RAISE NOTICE 'PART B: GAME SESSION SECURITY & IMMUTABILITY';
  RAISE NOTICE '--------------------------------------------------------------------';

  -- Switch context to Authenticated User A (Setting dual claims for universal Supabase compatibility)
  SET LOCAL ROLE authenticated;
  EXECUTE format('SET LOCAL "request.jwt.claim.sub" = ''%s''', v_test_user_a);
  EXECUTE format('SET LOCAL "request.jwt.claim.role" = ''authenticated''');
  EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s", "role": "authenticated"}''', v_test_user_a);

  -- B.1 User A inserts session attempting to forge server_verified and rewards
  INSERT INTO public.game_sessions (
    user_id, client_session_id, mode, difficulty, won, rounds, score, elapsed_ms, hints_used, user_number,
    verification_status, processed_for_rewards, xp_awarded
  ) VALUES (
    v_test_user_a, 'live_test_sess_001', 'you_guess', 'expert', true, 3, 999999, 12000, 0, 42,
    'server_verified', true, 10000
  ) RETURNING id INTO v_session_a;

  SELECT verification_status, processed_for_rewards, xp_awarded
  INTO v_status, v_processed, v_xp_awarded
  FROM public.game_sessions WHERE id = v_session_a;

  IF v_status = 'client_reported' AND v_processed = false AND v_xp_awarded = 0 THEN
    RAISE NOTICE '[PASS] Test B.1: Trigger forced verification_status=client_reported, processed=false, xp=0.';
  ELSE
    RAISE EXCEPTION '[FAIL] Test B.1: Insert trigger failed to sanitize untrusted client fields! Status: %, Processed: %, XP: %',
      v_status, v_processed, v_xp_awarded;
  END IF;

  -- B.2 User A attempts to UPDATE their game session (Immutability check)
  v_test_failed := false;
  v_error_caught := false;
  BEGIN
    UPDATE public.game_sessions SET score = 50000 WHERE id = v_session_a;
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test B.2: Client was permitted to UPDATE game session! Immutability breached.';
  ELSIF NOT v_error_caught OR v_sqlstate != '42501' THEN
    RAISE EXCEPTION '[FAIL] Test B.2: Expected SQLSTATE 42501 on UPDATE, got %: %', v_sqlstate, v_error_message;
  ELSE
    RAISE NOTICE '[PASS] Test B.2: Client UPDATE on game_sessions blocked with 42501 (Append-only verified).';
  END IF;

  -- B.3 User A attempts to DELETE their game session (Append-only check)
  v_test_failed := false;
  v_error_caught := false;
  BEGIN
    DELETE FROM public.game_sessions WHERE id = v_session_a;
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test B.3: Client was permitted to DELETE game session! Append-only breached.';
  ELSIF NOT v_error_caught OR v_sqlstate != '42501' THEN
    RAISE EXCEPTION '[FAIL] Test B.3: Expected SQLSTATE 42501 on DELETE, got %: %', v_sqlstate, v_error_message;
  ELSE
    RAISE NOTICE '[PASS] Test B.3: Client DELETE on game_sessions blocked with 42501.';
  END IF;

  -- B.4 Duplicate client_session_id rejected
  v_test_failed := false;
  v_error_caught := false;
  BEGIN
    INSERT INTO public.game_sessions (
      user_id, client_session_id, mode, difficulty, won, rounds, score, elapsed_ms, hints_used, user_number
    ) VALUES (
      v_test_user_a, 'live_test_sess_001', 'you_guess', 'easy', true, 5, 200, 30000, 1, 10
    );
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test B.4: Duplicate client_session_id was allowed!';
  ELSIF NOT v_error_caught OR v_sqlstate != '23505' THEN
    RAISE EXCEPTION '[FAIL] Test B.4: Expected unique_violation (23505), got %: %', v_sqlstate, v_error_message;
  ELSE
    RAISE NOTICE '[PASS] Test B.4: Duplicate client_session_id blocked with SQLSTATE 23505.';
  END IF;

  -- B.5 Switch context to Authenticated User B: RLS isolation test
  EXECUTE format('SET LOCAL "request.jwt.claim.sub" = ''%s''', v_test_user_b);
  EXECUTE format('SET LOCAL "request.jwt.claim.role" = ''authenticated''');
  EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s", "role": "authenticated"}''', v_test_user_b);

  SELECT COUNT(*) INTO v_count FROM public.game_sessions WHERE id = v_session_a;
  IF v_count = 0 THEN
    RAISE NOTICE '[PASS] Test B.5: User B cannot select User A game session (0 rows returned via RLS).';
  ELSE
    RAISE EXCEPTION '[FAIL] Test B.5: User B was able to view User A game session (RLS leakage)!';
  END IF;

  RESET ROLE;
  SET LOCAL "request.jwt.claim.sub" = '';
  SET LOCAL "request.jwt.claim.role" = '';
  SET LOCAL "request.jwt.claims" = '';
END $$;

-- -----------------------------------------------------------------------------
-- PART C: ACHIEVEMENT & COSMETIC READ-ONLY CLIENT SECURITY
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_test_user_a UUID;
  v_test_user_b UUID;
  v_test_failed BOOLEAN;
  v_error_caught BOOLEAN;
  v_sqlstate TEXT;
  v_error_message TEXT;
  v_count INTEGER;
BEGIN
  SELECT user_a, user_b INTO v_test_user_a, v_test_user_b FROM _test_users_config;

  RAISE NOTICE '--------------------------------------------------------------------';
  RAISE NOTICE 'PART C: ACHIEVEMENT & COSMETIC CLIENT SECURITY';
  RAISE NOTICE '--------------------------------------------------------------------';

  SET LOCAL ROLE authenticated;
  EXECUTE format('SET LOCAL "request.jwt.claim.sub" = ''%s''', v_test_user_a);
  EXECUTE format('SET LOCAL "request.jwt.claim.role" = ''authenticated''');
  EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s", "role": "authenticated"}''', v_test_user_a);

  -- C.1 User cannot insert into user_achievements
  v_test_failed := false;
  v_error_caught := false;
  BEGIN
    INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (v_test_user_a, 'speed_demon');
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test C.1: User was able to directly INSERT into user_achievements!';
  ELSIF NOT v_error_caught OR v_sqlstate != '42501' THEN
    RAISE EXCEPTION '[FAIL] Test C.1: Expected SQLSTATE 42501 on user_achievements INSERT, got %: %', v_sqlstate, v_error_message;
  ELSE
    RAISE NOTICE '[PASS] Test C.1: Direct client INSERT to user_achievements blocked with 42501.';
  END IF;

  -- C.2 User cannot insert into user_cosmetic_unlocks
  v_test_failed := false;
  v_error_caught := false;
  BEGIN
    INSERT INTO public.user_cosmetic_unlocks (user_id, cosmetic_type, cosmetic_id)
    VALUES (v_test_user_a, 'avatar', 'void_sovereign');
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test C.2: User was able to directly INSERT into user_cosmetic_unlocks!';
  ELSIF NOT v_error_caught OR v_sqlstate != '42501' THEN
    RAISE EXCEPTION '[FAIL] Test C.2: Expected SQLSTATE 42501 on user_cosmetic_unlocks INSERT, got %: %', v_sqlstate, v_error_message;
  ELSE
    RAISE NOTICE '[PASS] Test C.2: Direct client INSERT to user_cosmetic_unlocks blocked with 42501.';
  END IF;

  -- C.3 User can SELECT own achievement and cosmetic records
  SELECT COUNT(*) INTO v_count FROM public.user_achievements WHERE user_id = v_test_user_a;
  SELECT COUNT(*) INTO v_count FROM public.user_cosmetic_unlocks WHERE user_id = v_test_user_a;
  RAISE NOTICE '[PASS] Test C.3: Authenticated user can SELECT own achievements and cosmetic unlocks.';

  RESET ROLE;
  SET LOCAL "request.jwt.claim.sub" = '';
  SET LOCAL "request.jwt.claim.role" = '';
  SET LOCAL "request.jwt.claims" = '';
END $$;

-- -----------------------------------------------------------------------------
-- PART D: LEGACY IMPORT PROTECTION
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_test_user_a UUID;
  v_test_user_b UUID;
  v_test_failed BOOLEAN;
  v_error_caught BOOLEAN;
  v_sqlstate TEXT;
  v_error_message TEXT;
  v_count INTEGER;
BEGIN
  SELECT user_a, user_b INTO v_test_user_a, v_test_user_b FROM _test_users_config;

  RAISE NOTICE '--------------------------------------------------------------------';
  RAISE NOTICE 'PART D: LEGACY PROGRESS IMPORT PROTECTION';
  RAISE NOTICE '--------------------------------------------------------------------';

  SET LOCAL ROLE authenticated;
  EXECUTE format('SET LOCAL "request.jwt.claim.sub" = ''%s''', v_test_user_a);
  EXECUTE format('SET LOCAL "request.jwt.claim.role" = ''authenticated''');
  EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s", "role": "authenticated"}''', v_test_user_a);

  -- D.1 Cannot insert with is_verified = true
  v_test_failed := false;
  v_error_caught := false;
  BEGIN
    INSERT INTO public.legacy_progress_imports (
      user_id, legacy_stats, legacy_xp, legacy_level, is_verified
    ) VALUES (
      v_test_user_a, '{"gamesPlayed": 50}'::jsonb, 5000, 10, true
    );
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test D.1: Legacy import with is_verified = true was accepted!';
  ELSIF NOT v_error_caught OR (v_sqlstate != '23514' AND v_sqlstate != '42501') THEN
    RAISE EXCEPTION '[FAIL] Test D.1: Expected check/policy violation, got %: %', v_sqlstate, v_error_message;
  ELSE
    RAISE NOTICE '[PASS] Test D.1: Legacy import with is_verified=true rejected by DB constraint.';
  END IF;

  -- D.2 Legitimate import with is_verified = false succeeds once
  INSERT INTO public.legacy_progress_imports (
    user_id, legacy_stats, legacy_xp, legacy_level, is_verified
  ) VALUES (
    v_test_user_a, '{"gamesPlayed": 20}'::jsonb, 1000, 3, false
  );
  RAISE NOTICE '[PASS] Test D.2: Legitimate legacy import with is_verified=false successfully inserted.';

  -- D.3 Duplicate import for same user rejected by UNIQUE constraint
  v_test_failed := false;
  v_error_caught := false;
  BEGIN
    INSERT INTO public.legacy_progress_imports (
      user_id, legacy_stats, legacy_xp, legacy_level, is_verified
    ) VALUES (
      v_test_user_a, '{"gamesPlayed": 30}'::jsonb, 2000, 4, false
    );
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test D.3: Duplicate legacy import was permitted!';
  ELSIF NOT v_error_caught OR v_sqlstate != '23505' THEN
    RAISE EXCEPTION '[FAIL] Test D.3: Expected unique_violation (23505), got %: %', v_sqlstate, v_error_message;
  ELSE
    RAISE NOTICE '[PASS] Test D.3: Duplicate legacy import blocked with SQLSTATE 23505.';
  END IF;

  -- D.4 User B cannot select User A legacy import (RLS isolation)
  EXECUTE format('SET LOCAL "request.jwt.claim.sub" = ''%s''', v_test_user_b);
  EXECUTE format('SET LOCAL "request.jwt.claim.role" = ''authenticated''');
  EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s", "role": "authenticated"}''', v_test_user_b);

  SELECT COUNT(*) INTO v_count FROM public.legacy_progress_imports WHERE user_id = v_test_user_a;
  IF v_count = 0 THEN
    RAISE NOTICE '[PASS] Test D.4: User B cannot view User A legacy import (0 rows returned via RLS).';
  ELSE
    RAISE EXCEPTION '[FAIL] Test D.4: User B was able to view User A legacy import!';
  END IF;

  RESET ROLE;
  SET LOCAL "request.jwt.claim.sub" = '';
  SET LOCAL "request.jwt.claim.role" = '';
  SET LOCAL "request.jwt.claims" = '';
END $$;

-- -----------------------------------------------------------------------------
-- PART E: ACTUAL SETTINGS VERSION TRIGGERS (MIGRATION 0003 IN ACTION)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_test_user_a UUID;
  v_test_user_b UUID;
  v_v1 INTEGER;
  v_v2 INTEGER;
  v_v3 INTEGER;
  v_v4 INTEGER;
  v_updated_at TIMESTAMPTZ;
  v_old_updated_at TIMESTAMPTZ;
BEGIN
  SELECT user_a, user_b INTO v_test_user_a, v_test_user_b FROM _test_users_config;

  RAISE NOTICE '--------------------------------------------------------------------';
  RAISE NOTICE 'PART E: ACTUAL SETTINGS VERSION TRIGGERS';
  RAISE NOTICE '--------------------------------------------------------------------';

  SET LOCAL ROLE authenticated;
  EXECUTE format('SET LOCAL "request.jwt.claim.sub" = ''%s''', v_test_user_a);
  EXECUTE format('SET LOCAL "request.jwt.claim.role" = ''authenticated''');
  EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s", "role": "authenticated"}''', v_test_user_a);

  -- E.1 Insert settings row for User A: trigger enforces version = 1
  INSERT INTO public.user_settings (user_id, theme_id, sound_volume)
  VALUES (v_test_user_a, 'midnight', 0.8)
  RETURNING version, updated_at INTO v_v1, v_old_updated_at;

  IF v_v1 = 1 THEN
    RAISE NOTICE '[PASS] Test E.1: Trigger trg_user_settings_insert initialized version exactly to 1.';
  ELSE
    RAISE EXCEPTION '[FAIL] Test E.1: Expected initial version 1, got %', v_v1;
  END IF;

  -- E.2 Update one setting: trigger advances version to 2
  UPDATE public.user_settings
  SET sound_volume = 0.5
  WHERE user_id = v_test_user_a
  RETURNING version, updated_at INTO v_v2, v_updated_at;

  IF v_v2 = 2 AND v_updated_at >= v_old_updated_at THEN
    RAISE NOTICE '[PASS] Test E.2: First UPDATE advanced version exactly to 2 with fresh updated_at.';
  ELSE
    RAISE EXCEPTION '[FAIL] Test E.2: Expected version 2, got %', v_v2;
  END IF;

  -- E.3 Update another setting: trigger advances version to 3
  UPDATE public.user_settings
  SET haptics = false
  WHERE user_id = v_test_user_a
  RETURNING version INTO v_v3;

  IF v_v3 = 3 THEN
    RAISE NOTICE '[PASS] Test E.3: Second UPDATE advanced version exactly to 3.';
  ELSE
    RAISE EXCEPTION '[FAIL] Test E.3: Expected version 3, got %', v_v3;
  END IF;

  -- E.4 Client attempts to inject version = 999: trigger overrides client tampering
  UPDATE public.user_settings
  SET theme_id = 'ocean', version = 999
  WHERE user_id = v_test_user_a
  RETURNING version INTO v_v4;

  IF v_v4 = 4 THEN
    RAISE NOTICE '[PASS] Test E.4: Database trigger discarded client tamper version=999 and enforced version=4.';
  ELSE
    RAISE EXCEPTION '[FAIL] Test E.4: Version tamper was permitted! Version is % instead of 4', v_v4;
  END IF;

  -- E.5 Client attempts to modify updated_at: trigger maintains server timestamp
  UPDATE public.user_settings
  SET text_size = 'large', updated_at = '2000-01-01 00:00:00+00'
  WHERE user_id = v_test_user_a
  RETURNING updated_at INTO v_updated_at;

  IF v_updated_at > now() - INTERVAL '10 seconds' THEN
    RAISE NOTICE '[PASS] Test E.5: Database trigger maintained authoritative server timestamp (updated_at).';
  ELSE
    RAISE EXCEPTION '[FAIL] Test E.5: Client timestamp spoofing was permitted! updated_at: %', v_updated_at;
  END IF;

  RESET ROLE;
  SET LOCAL "request.jwt.claim.sub" = '';
  SET LOCAL "request.jwt.claim.role" = '';
  SET LOCAL "request.jwt.claims" = '';
END $$;

-- -----------------------------------------------------------------------------
-- PART F: OCC AND STALE UPDATE PROTECTION (WHERE user_id = ... AND version = ...)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_test_user_a UUID;
  v_test_user_b UUID;
  v_rows_affected INTEGER;
  v_current_version INTEGER;
  v_current_lang TEXT;
BEGIN
  SELECT user_a, user_b INTO v_test_user_a, v_test_user_b FROM _test_users_config;

  RAISE NOTICE '--------------------------------------------------------------------';
  RAISE NOTICE 'PART F: OPTIMISTIC CONCURRENCY CONTROL (OCC)';
  RAISE NOTICE '--------------------------------------------------------------------';

  SET LOCAL ROLE authenticated;
  EXECUTE format('SET LOCAL "request.jwt.claim.sub" = ''%s''', v_test_user_a);
  EXECUTE format('SET LOCAL "request.jwt.claim.role" = ''authenticated''');
  EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s", "role": "authenticated"}''', v_test_user_a);

  -- Current version in DB after Part E is 5
  SELECT version INTO v_current_version FROM public.user_settings WHERE user_id = v_test_user_a;

  -- F.1 Valid expected version updates exactly one row
  UPDATE public.user_settings
  SET language = 'fa'
  WHERE user_id = v_test_user_a AND version = v_current_version;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected = 1 THEN
    RAISE NOTICE '[PASS] Test F.1: Update with valid expected version (%) affected exactly 1 row.', v_current_version;
  ELSE
    RAISE EXCEPTION '[FAIL] Test F.1: Expected 1 row affected, got %', v_rows_affected;
  END IF;

  -- F.2 Stale expected version updates exactly zero rows (OCC collision protection)
  -- The version in DB has advanced to v_current_version + 1. We supply the stale version.
  UPDATE public.user_settings
  SET language = 'en'
  WHERE user_id = v_test_user_a AND version = v_current_version;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected = 0 THEN
    RAISE NOTICE '[PASS] Test F.2: Stale update using version % affected exactly 0 rows (Collision detected).', v_current_version;
  ELSE
    RAISE EXCEPTION '[FAIL] Test F.2: Stale update unexpectedly affected % rows! Overwrite permitted.', v_rows_affected;
  END IF;

  -- F.3 Verify data in DB was not overwritten by stale update
  SELECT language INTO v_current_lang FROM public.user_settings WHERE user_id = v_test_user_a;
  IF v_current_lang = 'fa' THEN
    RAISE NOTICE '[PASS] Test F.3: Stale update did NOT overwrite newer settings (language remains "fa").';
  ELSE
    RAISE EXCEPTION '[FAIL] Test F.3: Stale update corrupted settings! language is %', v_current_lang;
  END IF;

  RAISE NOTICE '[CONCURRENCY NOTE] Part F validates OCC within this connection. Real parallel race conditions (two simultaneous connections executing concurrent requests) are validated by the automated Node test suite (scripts/test_settings_sync.mjs, Scenario G & Test E).';

  RESET ROLE;
  SET LOCAL "request.jwt.claim.sub" = '';
  SET LOCAL "request.jwt.claim.role" = '';
  SET LOCAL "request.jwt.claims" = '';
END $$;

-- -----------------------------------------------------------------------------
-- PART G: REWARD RPC SECURITY & TRUST BOUNDARY
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_test_user_a UUID;
  v_test_user_b UUID;
  v_session_id UUID;
  v_test_failed BOOLEAN;
  v_error_caught BOOLEAN;
  v_sqlstate TEXT;
  v_error_message TEXT;
BEGIN
  SELECT user_a, user_b INTO v_test_user_a, v_test_user_b FROM _test_users_config;

  RAISE NOTICE '--------------------------------------------------------------------';
  RAISE NOTICE 'PART G: REWARD RPC SECURITY & TRUST BOUNDARY';
  RAISE NOTICE '--------------------------------------------------------------------';

  -- G.1 Anon cannot execute process_game_session_reward
  SET LOCAL ROLE anon;
  SET LOCAL "request.jwt.claim.sub" = '';
  SET LOCAL "request.jwt.claim.role" = 'anon';
  SET LOCAL "request.jwt.claims" = '{"role": "anon"}';

  v_test_failed := false;
  v_error_caught := false;
  BEGIN
    PERFORM public.process_game_session_reward('00000000-0000-0000-0000-000000000001'::UUID);
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test G.1: Anon was able to execute process_game_session_reward!';
  ELSIF NOT v_error_caught OR v_sqlstate != '42501' THEN
    RAISE EXCEPTION '[FAIL] Test G.1: Expected 42501 for anon, got %: %', v_sqlstate, v_error_message;
  ELSE
    RAISE NOTICE '[PASS] Test G.1: Anon execution of process_game_session_reward blocked with 42501.';
  END IF;

  -- G.2 Authenticated cannot execute process_game_session_reward
  SET LOCAL ROLE authenticated;
  EXECUTE format('SET LOCAL "request.jwt.claim.sub" = ''%s''', v_test_user_a);
  EXECUTE format('SET LOCAL "request.jwt.claim.role" = ''authenticated''');
  EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s", "role": "authenticated"}''', v_test_user_a);

  v_test_failed := false;
  v_error_caught := false;
  BEGIN
    PERFORM public.process_game_session_reward('00000000-0000-0000-0000-000000000001'::UUID);
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test G.2: Authenticated user was able to execute process_game_session_reward!';
  ELSIF NOT v_error_caught OR v_sqlstate != '42501' THEN
    RAISE EXCEPTION '[FAIL] Test G.2: Expected 42501 for authenticated, got %: %', v_sqlstate, v_error_message;
  ELSE
    RAISE NOTICE '[PASS] Test G.2: Authenticated execution of process_game_session_reward blocked with 42501.';
  END IF;

  -- G.3 Client-reported session rejected even when called with service_role
  SELECT id INTO v_session_id FROM public.game_sessions WHERE user_id = v_test_user_a LIMIT 1;

  SET LOCAL ROLE service_role;
  SET LOCAL "request.jwt.claim.sub" = '';
  SET LOCAL "request.jwt.claim.role" = 'service_role';
  SET LOCAL "request.jwt.claims" = '{"role": "service_role"}';

  v_test_failed := false;
  v_error_caught := false;
  BEGIN
    PERFORM public.process_game_session_reward(v_session_id);
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test G.3: Unverified client_reported session was awarded rewards by RPC!';
  ELSIF NOT v_error_caught OR v_error_message NOT LIKE '%Cannot reward unverified session%' THEN
    RAISE EXCEPTION '[FAIL] Test G.3: Expected unverified session rejection message, got %: %', v_sqlstate, v_error_message;
  ELSE
    RAISE NOTICE '[PASS] Test G.3: Client-reported session rejected by reward RPC even under service_role.';
  END IF;

  RESET ROLE;
  SET LOCAL "request.jwt.claim.sub" = '';
  SET LOCAL "request.jwt.claim.role" = '';
  SET LOCAL "request.jwt.claims" = '';
END $$;

-- -----------------------------------------------------------------------------
-- PART H: SETTINGS RPC CONCURRENCY & INTEGRITY (update_user_settings_optimistic)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_test_user_a UUID;
  v_test_user_b UUID;
  v_current_version INTEGER;
  v_prev_volume REAL;
  v_post_volume REAL;
  v_res JSONB;
BEGIN
  SELECT user_a, user_b INTO v_test_user_a, v_test_user_b FROM _test_users_config;

  RAISE NOTICE '--------------------------------------------------------------------';
  RAISE NOTICE 'PART H: SETTINGS RPC CONCURRENCY & INTEGRITY';
  RAISE NOTICE '--------------------------------------------------------------------';

  SET LOCAL ROLE authenticated;
  EXECUTE format('SET LOCAL "request.jwt.claim.sub" = ''%s''', v_test_user_a);
  EXECUTE format('SET LOCAL "request.jwt.claim.role" = ''authenticated''');
  EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s", "role": "authenticated"}''', v_test_user_a);

  SELECT version INTO v_current_version FROM public.user_settings WHERE user_id = v_test_user_a;

  -- H.1 Valid expected version call succeeds
  v_res := public.update_user_settings_optimistic(
    v_current_version,
    p_theme_id => 'emerald'
  );
  IF (v_res->>'success')::BOOLEAN IS TRUE AND (v_res->>'new_version')::INTEGER = v_current_version + 1 THEN
    RAISE NOTICE '[PASS] Test H.1: update_user_settings_optimistic succeeded with valid version (new_version: %).', v_res->>'new_version';
  ELSE
    RAISE EXCEPTION '[FAIL] Test H.1: RPC failed with valid version! Result: %', v_res;
  END IF;

  -- H.2 Stale expected version returns conflict
  v_res := public.update_user_settings_optimistic(
    v_current_version, -- Stale version
    p_theme_id => 'solar_gold'
  );
  IF (v_res->>'conflict')::BOOLEAN IS TRUE AND (v_res->>'success')::BOOLEAN IS FALSE THEN
    RAISE NOTICE '[PASS] Test H.2: update_user_settings_optimistic returned conflict=true for stale version.';
  ELSE
    RAISE EXCEPTION '[FAIL] Test H.2: RPC did not flag conflict for stale version! Result: %', v_res;
  END IF;

  -- H.3 Validate Migration 0004: Strict OCC protection against NULL expected_version
  SELECT sound_volume INTO v_prev_volume FROM public.user_settings WHERE user_id = v_test_user_a;

  v_res := public.update_user_settings_optimistic(
    NULL,
    p_sound_volume => 0.1
  );

  SELECT sound_volume INTO v_post_volume FROM public.user_settings WHERE user_id = v_test_user_a;

  IF (v_res->>'success')::BOOLEAN IS FALSE
     AND (v_res->>'conflict')::BOOLEAN IS TRUE
     AND v_post_volume = v_prev_volume THEN
    RAISE NOTICE '[PASS] Test H.3: NULL expected_version strictly rejected (success=false, conflict=true, sound_volume unchanged). Migration 0004 verified.';
  ELSE
    RAISE EXCEPTION '[FAIL] Test H.3: Migration 0004 is NOT deployed or failed! NULL expected_version bypassed OCC collision check. Result: %, Volume: % -> %',
      v_res, v_prev_volume, v_post_volume;
  END IF;

  RESET ROLE;
  SET LOCAL "request.jwt.claim.sub" = '';
  SET LOCAL "request.jwt.claim.role" = '';
  SET LOCAL "request.jwt.claims" = '';
END $$;

-- -----------------------------------------------------------------------------
-- SUMMARY & CLEAN ROLLBACK
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'ALL LIVE DATABASE & RLS VALIDATION ASSERTIONS PASSED SUCCESSFULLY!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Notice: Executing ROLLBACK — all test fixtures, inserts, and changes reverted.';
END $$;

ROLLBACK;
