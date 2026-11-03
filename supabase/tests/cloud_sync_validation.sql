-- ==============================================================================
-- Test Script: cloud_sync_validation.sql
-- Purpose: Complete positive & negative tests for 0002_cloud_sync.sql RLS & RPC
-- Execution: Run in Supabase SQL Editor
-- Security: Wraps in a transaction and issues ROLLBACK at the end so test data
--           is never permanently written to the database.
-- ==============================================================================

BEGIN;

DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'STARTING GUESS MY NUMBER CLOUD SYNC & REWARD AUDIT';
  RAISE NOTICE '==================================================';
END $$;

-- -----------------------------------------------------------------------------
-- 1. VERIFY TEST FIXTURES
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  -- >>> CONFIGURE MATCHING TEST USER UUIDS HERE <<<
  v_test_user_a UUID := '00000000-0000-0000-0000-000000000001'::UUID;
  v_test_user_b UUID := '00000000-0000-0000-0000-000000000002'::UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_test_user_a) OR
     NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_test_user_b) THEN
    RAISE EXCEPTION 'TEST SETUP FAILED: Test users not found in auth.users.';
  END IF;

  RAISE NOTICE '[SETUP] Verified test accounts exist for Cloud Sync validation.';
END $$;

-- -----------------------------------------------------------------------------
-- 2. TEST SUITE: CLOUD SYNC RLS PERMISSIONS & ISOLATION
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_test_user_a UUID := '00000000-0000-0000-0000-000000000001'::UUID;
  v_test_user_b UUID := '00000000-0000-0000-0000-000000000002'::UUID;

  v_session_a UUID;
  v_session_b UUID;
  v_count INTEGER;
  v_rows_affected INTEGER;
  v_test_failed BOOLEAN;
  v_error_caught BOOLEAN;
  v_sqlstate TEXT;
  v_error_message TEXT;
  v_reward_result JSONB;
  v_passed_count INTEGER := 0;
BEGIN
  -- ---------------------------------------------------------------------------
  -- Setup: User A inserts a game session
  -- ---------------------------------------------------------------------------
  SET LOCAL ROLE authenticated;
  EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s", "role": "authenticated"}''', v_test_user_a);

  INSERT INTO public.game_sessions (
    user_id, client_session_id, mode, difficulty, won, rounds, score, elapsed_ms, hints_used, user_number
  ) VALUES (
    v_test_user_a, 'sess_client_test_a', 'you_guess', 'medium', true, 4, 850, 18500, 0, 42
  ) RETURNING id INTO v_session_a;

  v_passed_count := v_passed_count + 1;
  RAISE NOTICE '[PASS] Test 1: User A successfully uploaded game session (ID: %).', v_session_a;

  -- ---------------------------------------------------------------------------
  -- Setup: Switch to User B and insert a game session
  -- ---------------------------------------------------------------------------
  EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s", "role": "authenticated"}''', v_test_user_b);

  INSERT INTO public.game_sessions (
    user_id, client_session_id, mode, difficulty, won, rounds, score, elapsed_ms, hints_used, user_number
  ) VALUES (
    v_test_user_b, 'sess_client_test_b', 'oracle', 'hard', true, 6, 920, 25000, 1, 77
  ) RETURNING id INTO v_session_b;

  -- ---------------------------------------------------------------------------
  -- Test 2 (Negative): User B cannot read User A's game sessions
  -- ---------------------------------------------------------------------------
  SELECT COUNT(*) INTO v_count FROM public.game_sessions WHERE id = v_session_a;
  IF v_count = 0 THEN
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 2: User B cannot read User A session (0 rows returned via RLS).';
  ELSE
    RAISE EXCEPTION '[FAIL] Test 2: User B was able to read User A session!';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Test 3 (Negative): User B cannot delete User A's game sessions
  -- ---------------------------------------------------------------------------
  DELETE FROM public.game_sessions WHERE id = v_session_a;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected = 0 THEN
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 3: User B deleting User A session affected 0 rows (RLS isolated).';
  ELSE
    RAISE EXCEPTION '[FAIL] Test 3: User B was able to delete User A session!';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Test 4 (Negative): User B cannot process rewards for User A's session
  -- ---------------------------------------------------------------------------
  v_test_failed := false;
  v_error_caught := false;
  v_sqlstate := '';
  v_error_message := '';
  BEGIN
    PERFORM public.process_game_session_reward(v_session_a);
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test 4: User B was allowed to claim rewards for User A session!';
  ELSIF NOT v_error_caught THEN
    RAISE EXCEPTION '[FAIL] Test 4: Expected error for cross-user reward claim!';
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 4: Cross-user reward processing blocked (Error: %).', v_error_message;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Test 5 (Positive): User A processes rewards for their own session
  -- ---------------------------------------------------------------------------
  EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s", "role": "authenticated"}''', v_test_user_a);

  v_reward_result := public.process_game_session_reward(v_session_a);
  IF (v_reward_result->>'success')::BOOLEAN IS TRUE AND (v_reward_result->>'xp_gained')::INTEGER > 0 THEN
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 5: User A successfully processed server-authoritative reward (XP Gained: %).', v_reward_result->>'xp_gained';
  ELSE
    RAISE EXCEPTION '[FAIL] Test 5: Reward processing failed: %', v_reward_result;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Test 6 (Negative): Idempotent duplicate reward processing (Zero extra XP)
  -- ---------------------------------------------------------------------------
  v_reward_result := public.process_game_session_reward(v_session_a);
  IF (v_reward_result->>'already_processed')::BOOLEAN IS TRUE THEN
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 6: Replay reward claim rejected (already_processed: true).';
  ELSE
    RAISE EXCEPTION '[FAIL] Test 6: Duplicate reward claim was not marked as already processed!';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Test 7 (Negative): Duplicate client_session_id insertion blocked
  -- ---------------------------------------------------------------------------
  v_test_failed := false;
  v_error_caught := false;
  v_sqlstate := '';
  v_error_message := '';
  BEGIN
    INSERT INTO public.game_sessions (
      user_id, client_session_id, mode, difficulty, won, rounds, score, elapsed_ms, hints_used, user_number
    ) VALUES (
      v_test_user_a, 'sess_client_test_a', 'you_guess', 'medium', true, 4, 850, 18500, 0, 42
    );
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test 7: Duplicate client_session_id was allowed!';
  ELSIF NOT v_error_caught OR v_sqlstate != '23505' THEN
    RAISE EXCEPTION '[FAIL] Test 7: Expected SQLSTATE 23505 (unique_violation), got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 7: Duplicate client_session_id blocked with SQLSTATE 23505.';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Test 8 (Positive & Negative): User Settings RLS isolation
  -- ---------------------------------------------------------------------------
  INSERT INTO public.user_settings (user_id, theme_id, language)
  VALUES (v_test_user_a, 'emerald', 'fa')
  ON CONFLICT (user_id) DO UPDATE SET theme_id = 'emerald', language = 'fa';

  -- User B should not see User A's settings
  EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s", "role": "authenticated"}''', v_test_user_b);
  SELECT COUNT(*) INTO v_count FROM public.user_settings WHERE user_id = v_test_user_a;
  IF v_count = 0 THEN
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 8: User B cannot view User A settings (0 rows returned via RLS).';
  ELSE
    RAISE EXCEPTION '[FAIL] Test 8: User B was able to view User A settings!';
  END IF;

  -- Reset role cleanly
  RESET ROLE;
  SET LOCAL "request.jwt.claims" = '';

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'ALL 8 CLOUD SYNC VALIDATION CHECKS PASSED CLEANLY!';
  RAISE NOTICE '==================================================';
END $$;

ROLLBACK;

