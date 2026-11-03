-- ==============================================================================
-- Test Script: cloud_sync_validation.sql
-- Purpose: Complete 20-Point Security & Correctness Audit for 0002_cloud_sync.sql
-- Execution: Run in Supabase SQL Editor
-- Security: Wraps in a transaction and issues ROLLBACK at the end so test data
--           is never permanently written to the database.
-- ==============================================================================

BEGIN;

DO $$
BEGIN
  RAISE NOTICE '===========================================================';
  RAISE NOTICE 'STARTING GUESS MY NUMBER CLOUD SYNC & REWARD SECURITY AUDIT';
  RAISE NOTICE '===========================================================';
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
    RAISE EXCEPTION 'TEST SETUP FAILED: Test users not found in auth.users. Configure valid UUIDs.';
  END IF;

  RAISE NOTICE '[SETUP] Verified test accounts exist for Cloud Sync validation.';
END $$;

-- -----------------------------------------------------------------------------
-- 2. COMPREHENSIVE 20-POINT TEST SUITE
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_test_user_a UUID := '00000000-0000-0000-0000-000000000001'::UUID;
  v_test_user_b UUID := '00000000-0000-0000-0000-000000000002'::UUID;

  v_session_a UUID;
  v_session_b UUID;
  v_session_verified UUID;
  v_count INTEGER;
  v_test_failed BOOLEAN;
  v_error_caught BOOLEAN;
  v_sqlstate TEXT;
  v_error_message TEXT;
  v_reward_result JSONB;
  v_status TEXT;
  v_processed BOOLEAN;
  v_xp_awarded INTEGER;
  v_profile RECORD;
  v_passed_count INTEGER := 0;
BEGIN

  -- ===========================================================================
  -- TEST 1: Anonymous role cannot execute process_game_session_reward (SEC-10)
  -- ===========================================================================
  SET LOCAL ROLE anon;
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
    RAISE EXCEPTION '[FAIL] Test 1: Anonymous caller was able to execute process_game_session_reward!';
  ELSIF NOT v_error_caught OR v_sqlstate != '42501' THEN
    RAISE EXCEPTION '[FAIL] Test 1: Expected SQLSTATE 42501 (permission denied), got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 1: Anon execution of process_game_session_reward blocked with 42501.';
  END IF;

  -- ===========================================================================
  -- TEST 2: Authenticated direct execution of process_game_session_reward denied (SEC-10)
  -- ===========================================================================
  SET LOCAL ROLE authenticated;
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
    RAISE EXCEPTION '[FAIL] Test 2: Authenticated caller was able to directly execute process_game_session_reward!';
  ELSIF NOT v_error_caught OR v_sqlstate != '42501' THEN
    RAISE EXCEPTION '[FAIL] Test 2: Expected SQLSTATE 42501 (permission denied), got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 2: Authenticated direct RPC execution blocked with 42501.';
  END IF;

  -- ===========================================================================
  -- TEST 3: User A inserts game session; trigger enforces client_reported (SEC-01 & SEC-03)
  -- ===========================================================================
  INSERT INTO public.game_sessions (
    user_id, client_session_id, mode, difficulty, won, rounds, score, elapsed_ms, hints_used, user_number,
    verification_status, processed_for_rewards, xp_awarded
  ) VALUES (
    v_test_user_a, 'sess_test_a_001', 'you_guess', 'expert', true, 1, 999999, 100, 0, 42,
    'server_verified', true, 10000 -- Attacker attempts to forge verified status
  ) RETURNING id INTO v_session_a;

  SELECT verification_status, processed_for_rewards, xp_awarded
  INTO v_status, v_processed, v_xp_awarded
  FROM public.game_sessions WHERE id = v_session_a;

  IF v_status = 'client_reported' AND v_processed = false AND v_xp_awarded = 0 THEN
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 3: Insert guard enforced verification_status=client_reported, processed=false, xp=0.';
  ELSE
    RAISE EXCEPTION '[FAIL] Test 3: Insert guard failed! Status: %, Processed: %, XP: %', v_status, v_processed, v_xp_awarded;
  END IF;

  -- ===========================================================================
  -- TEST 4: Users cannot delete their own game sessions (SEC-01)
  -- ===========================================================================
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
    RAISE EXCEPTION '[FAIL] Test 4: User was able to DELETE game session! Append-only policy breached.';
  ELSIF NOT v_error_caught OR v_sqlstate != '42501' THEN
    RAISE EXCEPTION '[FAIL] Test 4: Expected SQLSTATE 42501 on DELETE, got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 4: User DELETE on game_sessions blocked with 42501 (Append-only enforced).';
  END IF;

  -- ===========================================================================
  -- TEST 5: Users cannot update their own game sessions (SEC-01)
  -- ===========================================================================
  v_test_failed := false;
  v_error_caught := false;
  BEGIN
    UPDATE public.game_sessions SET won = true, score = 5000 WHERE id = v_session_a;
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test 5: User was able to UPDATE game session! Immutability breached.';
  ELSIF NOT v_error_caught OR v_sqlstate != '42501' THEN
    RAISE EXCEPTION '[FAIL] Test 5: Expected SQLSTATE 42501 on UPDATE, got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 5: User UPDATE on game_sessions blocked with 42501 (Immutability enforced).';
  END IF;

  -- ===========================================================================
  -- TEST 6: Users cannot self-award achievements directly (SEC-07)
  -- ===========================================================================
  v_test_failed := false;
  v_error_caught := false;
  BEGIN
    INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (v_test_user_a, 'hacked_achievement_001');
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test 6: User was able to insert directly into user_achievements!';
  ELSIF NOT v_error_caught OR v_sqlstate != '42501' THEN
    RAISE EXCEPTION '[FAIL] Test 6: Expected SQLSTATE 42501 on user_achievements INSERT, got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 6: Direct client INSERT to user_achievements blocked with 42501.';
  END IF;

  -- ===========================================================================
  -- TEST 7: Users cannot self-award cosmetic unlocks directly (SEC-02)
  -- ===========================================================================
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
    RAISE EXCEPTION '[FAIL] Test 7: User was able to insert directly into user_cosmetic_unlocks!';
  ELSIF NOT v_error_caught OR v_sqlstate != '42501' THEN
    RAISE EXCEPTION '[FAIL] Test 7: Expected SQLSTATE 42501 on user_cosmetic_unlocks INSERT, got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 7: Direct client INSERT to user_cosmetic_unlocks blocked with 42501.';
  END IF;

  -- ===========================================================================
  -- TEST 8: Users cannot set is_verified = true on legacy import (SEC-09)
  -- ===========================================================================
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
    RAISE EXCEPTION '[FAIL] Test 8: User was able to insert legacy import with is_verified = true!';
  ELSIF NOT v_error_caught OR (v_sqlstate != '23514' AND v_sqlstate != '42501') THEN
    RAISE EXCEPTION '[FAIL] Test 8: Expected check violation (23514), got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 8: Client insertion of is_verified=true blocked by DB constraint.';
  END IF;

  -- ===========================================================================
  -- TEST 9: Legitimate legacy import with is_verified = false succeeds once (SEC-04)
  -- ===========================================================================
  INSERT INTO public.legacy_progress_imports (
    user_id, legacy_stats, legacy_xp, legacy_level, is_verified
  ) VALUES (
    v_test_user_a, '{"gamesPlayed": 20}'::jsonb, 1200, 4, false
  );

  v_passed_count := v_passed_count + 1;
  RAISE NOTICE '[PASS] Test 9: Legacy import with is_verified=false successfully inserted.';

  -- ===========================================================================
  -- TEST 10: Duplicate legacy import blocked by UNIQUE constraint
  -- ===========================================================================
  v_test_failed := false;
  v_error_caught := false;
  BEGIN
    INSERT INTO public.legacy_progress_imports (
      user_id, legacy_stats, legacy_xp, legacy_level, is_verified
    ) VALUES (
      v_test_user_a, '{"gamesPlayed": 25}'::jsonb, 1500, 5, false
    );
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test 10: Duplicate legacy import was permitted!';
  ELSIF NOT v_error_caught OR v_sqlstate != '23505' THEN
    RAISE EXCEPTION '[FAIL] Test 10: Expected unique_violation (23505), got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 10: Duplicate legacy import blocked by unique constraint.';
  END IF;

  -- ===========================================================================
  -- Setup: Switch to User B
  -- ===========================================================================
  EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s", "role": "authenticated"}''', v_test_user_b);

  INSERT INTO public.game_sessions (
    user_id, client_session_id, mode, difficulty, won, rounds, score, elapsed_ms, hints_used, user_number
  ) VALUES (
    v_test_user_b, 'sess_test_b_001', 'oracle', 'hard', true, 6, 920, 25000, 1, 77
  ) RETURNING id INTO v_session_b;

  -- ===========================================================================
  -- TEST 11: User B cannot select User A game sessions (RLS Isolation)
  -- ===========================================================================
  SELECT COUNT(*) INTO v_count FROM public.game_sessions WHERE id = v_session_a;
  IF v_count = 0 THEN
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 11: User B cannot view User A game sessions (0 rows returned via RLS).';
  ELSE
    RAISE EXCEPTION '[FAIL] Test 11: User B was able to view User A game sessions!';
  END IF;

  -- ===========================================================================
  -- TEST 12: User B cannot select User A legacy imports (RLS Isolation)
  -- ===========================================================================
  SELECT COUNT(*) INTO v_count FROM public.legacy_progress_imports WHERE user_id = v_test_user_a;
  IF v_count = 0 THEN
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 12: User B cannot view User A legacy imports (0 rows returned via RLS).';
  ELSE
    RAISE EXCEPTION '[FAIL] Test 12: User B was able to view User A legacy imports!';
  END IF;

  -- ===========================================================================
  -- TEST 13: User B cannot select User A settings (RLS Isolation)
  -- ===========================================================================
  SELECT COUNT(*) INTO v_count FROM public.user_settings WHERE user_id = v_test_user_a;
  IF v_count = 0 THEN
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 13: User B cannot view User A settings (0 rows returned via RLS).';
  ELSE
    RAISE EXCEPTION '[FAIL] Test 13: User B was able to view User A settings!';
  END IF;

  -- ===========================================================================
  -- TEST 14: User B cannot select User A reward ledger (RLS Isolation)
  -- ===========================================================================
  SELECT COUNT(*) INTO v_count FROM public.reward_ledger WHERE user_id = v_test_user_a;
  IF v_count = 0 THEN
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 14: User B cannot view User A reward ledger (0 rows returned via RLS).';
  ELSE
    RAISE EXCEPTION '[FAIL] Test 14: User B was able to view User A reward ledger!';
  END IF;

  -- ===========================================================================
  -- TEST 15: Duplicate client_session_id blocked (SEC-01)
  -- ===========================================================================
  v_test_failed := false;
  v_error_caught := false;
  BEGIN
    INSERT INTO public.game_sessions (
      user_id, client_session_id, mode, difficulty, won, rounds, score, elapsed_ms, hints_used, user_number
    ) VALUES (
      v_test_user_b, 'sess_test_b_001', 'oracle', 'hard', true, 6, 920, 25000, 1, 77
    );
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test 15: Duplicate client_session_id was allowed!';
  ELSIF NOT v_error_caught OR v_sqlstate != '23505' THEN
    RAISE EXCEPTION '[FAIL] Test 15: Expected SQLSTATE 23505 (unique_violation), got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 15: Duplicate client_session_id blocked with SQLSTATE 23505.';
  END IF;

  -- ===========================================================================
  -- Setup: Switch to service_role to test trusted backend reward operations
  -- ===========================================================================
  SET LOCAL ROLE service_role;
  SET LOCAL "request.jwt.claims" = '{"role": "service_role"}';

  -- ===========================================================================
  -- TEST 16: Backend rejects unverified client_reported session for rewards (SEC-03 & SEC-04)
  -- ===========================================================================
  v_test_failed := false;
  v_error_caught := false;
  BEGIN
    PERFORM public.process_game_session_reward(v_session_a);
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test 16: Unverified client_reported session was granted rewards!';
  ELSIF NOT v_error_caught OR v_error_message NOT LIKE '%Cannot reward unverified session%' THEN
    RAISE EXCEPTION '[FAIL] Test 16: Expected unverified session rejection, got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 16: Unverified client_reported session rejected by reward RPC.';
  END IF;

  -- ===========================================================================
  -- TEST 17: Valid server_verified session processes rewards with sanity caps (SEC-03)
  -- ===========================================================================
  -- Insert a legitimate server_verified session directly via service_role
  INSERT INTO public.game_sessions (
    user_id, client_session_id, mode, difficulty, won, rounds, score, elapsed_ms, hints_used, user_number,
    verification_status
  ) VALUES (
    v_test_user_a, 'sess_verified_001', 'you_guess', 'hard', true, 5, 10000000, 18000, 0, 88,
    'server_verified' -- Injected score of 10M
  ) RETURNING id INTO v_session_verified;

  v_reward_result := public.process_game_session_reward(v_session_verified);

  -- XP gained must be capped at 600 max, NOT 800,000! (SEC-03)
  IF (v_reward_result->>'success')::BOOLEAN IS TRUE AND
     (v_reward_result->>'xp_gained')::INTEGER <= 600 THEN
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 17: Server verified reward processed with strict XP ceiling (XP: %).', v_reward_result->>'xp_gained';
  ELSE
    RAISE EXCEPTION '[FAIL] Test 17: Reward cap failed! Result: %', v_reward_result;
  END IF;

  -- ===========================================================================
  -- TEST 18: Reward processing does NOT corrupt competitive rank with level mapping (SEC-08)
  -- ===========================================================================
  SELECT level, xp, rank INTO v_profile FROM public.profiles WHERE id = v_test_user_a;
  -- Profiles rank should remain Beginner (from 0001 initial state), NOT changed to level milestone
  IF v_profile.rank = 'Beginner' THEN
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 18: Competitive rank preserved intact (Rank: %, Level: %).', v_profile.rank, v_profile.level;
  ELSE
    RAISE EXCEPTION '[FAIL] Test 18: Profiles rank was corrupted by level threshold! Rank: %', v_profile.rank;
  END IF;

  -- ===========================================================================
  -- TEST 19: Reward ledger recorded exactly-once entry (SEC-01 & SEC-10)
  -- ===========================================================================
  SELECT COUNT(*) INTO v_count FROM public.reward_ledger WHERE session_id = v_session_verified;
  IF v_count = 1 THEN
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 19: Reward ledger exactly-once audit entry recorded.';
  ELSE
    RAISE EXCEPTION '[FAIL] Test 19: Reward ledger missing entry for session %!', v_session_verified;
  END IF;

  -- ===========================================================================
  -- TEST 20: Idempotent replay reward claim returns already_processed (SEC-10)
  -- ===========================================================================
  v_reward_result := public.process_game_session_reward(v_session_verified);
  IF (v_reward_result->>'already_processed')::BOOLEAN IS TRUE THEN
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 20: Replay reward claim rejected with already_processed=true.';
  ELSE
    RAISE EXCEPTION '[FAIL] Test 20: Duplicate reward claim was not flagged as already processed!';
  END IF;

  -- Reset role cleanly
  RESET ROLE;
  SET LOCAL "request.jwt.claims" = '';

  RAISE NOTICE '===========================================================';
  RAISE NOTICE 'ALL 20 CLOUD SYNC & REWARD SECURITY TESTS PASSED CLEANLY!';
  RAISE NOTICE 'Total Tests Passed: % / 20', v_passed_count;
  RAISE NOTICE '===========================================================';
END $$;

ROLLBACK;
