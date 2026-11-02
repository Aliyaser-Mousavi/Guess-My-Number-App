-- ==============================================================================
-- Test Script: rls_validation.sql
-- Purpose: Complete positive & negative security tests for public.profiles RLS
-- Execution: Run in Supabase SQL Editor
--
-- PREREQUISITES FOR RUNNING:
-- 1. Run migration 0001_initial_profiles.sql first.
-- 2. In your Supabase Dashboard > Authentication > Users (or via Auth API),
--    create two temporary test accounts:
--    - Test User A (e.g. hunter_test_a@example.com)
--    - Test User B (e.g. hunter_test_b@example.com)
-- 3. Replace the placeholder UUIDs below with their actual auth.users UUIDs:
--    - v_test_user_a
--    - v_test_user_b
-- 4. Execute this script in SQL Editor.
--
-- SAFETY & ISOLATION:
-- This script runs inside a transaction and terminates with ROLLBACK, ensuring
-- that any permitted update tests (e.g. updating display name on User A) are
-- completely rolled back and leave test accounts untouched.
-- ==============================================================================

BEGIN;

DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'STARTING GUESS MY NUMBER RLS & PERMISSION AUDIT';
  RAISE NOTICE '==================================================';
END $$;

-- -----------------------------------------------------------------------------
-- 1. VERIFY TEST FIXTURES EXIST IN SUPABASE AUTH & PROFILES
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  -- >>> CONFIGURE YOUR TWO TEST USER UUIDS HERE <<<
  v_test_user_a UUID := '00000000-0000-0000-0000-000000000001'::UUID;
  v_test_user_b UUID := '00000000-0000-0000-0000-000000000002'::UUID;
BEGIN
  -- Verify users exist in Supabase auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_test_user_a) OR
     NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_test_user_b) THEN
    RAISE EXCEPTION 'TEST SETUP FAILED: Test users (%) or (%) not found in auth.users. Please create two test accounts in Supabase Auth and configure their UUIDs at the top of this script.', v_test_user_a, v_test_user_b;
  END IF;

  -- Verify matching profile records exist in public.profiles
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_test_user_a) OR
     NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_test_user_b) THEN
    RAISE EXCEPTION 'TEST SETUP FAILED: public.profiles records not found for test users. Ensure migration 0001_initial_profiles.sql has been executed.', v_test_user_a, v_test_user_b;
  END IF;

  RAISE NOTICE '[SETUP] Verified test accounts (%) and (%) exist in auth.users and public.profiles.', v_test_user_a, v_test_user_b;
END $$;

-- -----------------------------------------------------------------------------
-- 2. TEST SUITE: ANONYMOUS ROLE PERMISSIONS & RESTRICTIONS
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  -- >>> CONFIGURE MATCHING TEST USER UUID HERE <<<
  v_test_user_a UUID := '00000000-0000-0000-0000-000000000001'::UUID;

  v_count INTEGER;
  v_test_failed BOOLEAN;
  v_error_caught BOOLEAN;
  v_sqlstate TEXT;
  v_error_message TEXT;
  v_passed_count INTEGER := 0;
BEGIN
  -- Switch session to anonymous client role
  SET LOCAL ROLE anon;
  SET LOCAL "request.jwt.claims" = '{"role": "anon"}';

  -- ---------------------------------------------------------------------------
  -- Test 1A (Positive): Anonymous read allowed on public.public_profiles view
  -- ---------------------------------------------------------------------------
  BEGIN
    SELECT COUNT(*) INTO v_count FROM public.public_profiles WHERE id = v_test_user_a;
    IF v_count = 1 THEN
      v_passed_count := v_passed_count + 1;
      RAISE NOTICE '[PASS] Test 1A: Anonymous read allowed on public.public_profiles view.';
    ELSE
      RAISE EXCEPTION 'Query returned % rows, expected 1.', v_count;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '[FAIL] Test 1A: Anonymous failed to read public.public_profiles: %', SQLERRM;
  END;

  -- ---------------------------------------------------------------------------
  -- Test 1B (Negative): Anonymous DIRECT read on base public.profiles blocked
  -- ---------------------------------------------------------------------------
  v_test_failed := false;
  v_error_caught := false;
  v_sqlstate := '';
  v_error_message := '';
  BEGIN
    SELECT COUNT(*) INTO v_count FROM public.profiles WHERE id = v_test_user_a;
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test 1B: Anonymous was allowed direct SELECT on base public.profiles!';
  ELSIF NOT v_error_caught OR v_sqlstate != '42501' THEN
    RAISE EXCEPTION '[FAIL] Test 1B: Expected SQLSTATE 42501 (insufficient_privilege), got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 1B: Direct anonymous SELECT on public.profiles blocked with SQLSTATE 42501.';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Test 1C (Negative): Anonymous INSERT on public.profiles blocked
  -- (Uses existing valid auth UUID to verify failure is driven by 42501 privilege denial)
  -- ---------------------------------------------------------------------------
  v_test_failed := false;
  v_error_caught := false;
  v_sqlstate := '';
  v_error_message := '';
  BEGIN
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (v_test_user_a, 'anon_hacker', 'Hacker');
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test 1C: Anonymous was allowed to INSERT into public.profiles!';
  ELSIF NOT v_error_caught OR v_sqlstate != '42501' THEN
    RAISE EXCEPTION '[FAIL] Test 1C: Expected SQLSTATE 42501 (insufficient_privilege), got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 1C: Anonymous INSERT blocked with SQLSTATE 42501.';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Test 1D (Negative): Anonymous UPDATE on public.profiles blocked
  -- ---------------------------------------------------------------------------
  v_test_failed := false;
  v_error_caught := false;
  v_sqlstate := '';
  v_error_message := '';
  BEGIN
    UPDATE public.profiles SET display_name = 'Anon Defaced' WHERE id = v_test_user_a;
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test 1D: Anonymous was allowed to UPDATE public.profiles!';
  ELSIF NOT v_error_caught OR v_sqlstate != '42501' THEN
    RAISE EXCEPTION '[FAIL] Test 1D: Expected SQLSTATE 42501 (insufficient_privilege), got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 1D: Anonymous UPDATE blocked with SQLSTATE 42501.';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Test 1E (Negative): Anonymous DELETE on public.profiles blocked
  -- ---------------------------------------------------------------------------
  v_test_failed := false;
  v_error_caught := false;
  v_sqlstate := '';
  v_error_message := '';
  BEGIN
    DELETE FROM public.profiles WHERE id = v_test_user_a;
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test 1E: Anonymous was allowed to DELETE from public.profiles!';
  ELSIF NOT v_error_caught OR v_sqlstate != '42501' THEN
    RAISE EXCEPTION '[FAIL] Test 1E: Expected SQLSTATE 42501 (insufficient_privilege), got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 1E: Anonymous DELETE blocked with SQLSTATE 42501.';
  END IF;

  -- Reset role and claims cleanly before next test block
  RESET ROLE;
  SET LOCAL "request.jwt.claims" = '';

  RAISE NOTICE '--- Anonymous Suite Passed: % / 5 checks ---', v_passed_count;
END $$;

-- -----------------------------------------------------------------------------
-- 3. TEST SUITE: AUTHENTICATED USER PERMISSIONS & BOUNDARIES
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  -- >>> CONFIGURE MATCHING TEST USER UUIDS HERE <<<
  v_test_user_a UUID := '00000000-0000-0000-0000-000000000001'::UUID;
  v_test_user_b UUID := '00000000-0000-0000-0000-000000000002'::UUID;

  v_rows_affected INTEGER;
  v_test_failed BOOLEAN;
  v_error_caught BOOLEAN;
  v_sqlstate TEXT;
  v_error_message TEXT;
  v_updated_val TEXT;
  v_passed_count INTEGER := 0;
BEGIN
  -- Switch session to authenticated role pretending to be User A
  SET LOCAL ROLE authenticated;
  EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s", "role": "authenticated"}''', v_test_user_a);

  -- ---------------------------------------------------------------------------
  -- Test 2A (Positive): User A can read their OWN full profile from base table
  -- ---------------------------------------------------------------------------
  BEGIN
    SELECT COUNT(*) INTO v_rows_affected FROM public.profiles WHERE id = v_test_user_a;
    IF v_rows_affected = 1 THEN
      v_passed_count := v_passed_count + 1;
      RAISE NOTICE '[PASS] Test 2A: Authenticated User A can read own profile from public.profiles.';
    ELSE
      RAISE EXCEPTION 'Expected 1 row, got %', v_rows_affected;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '[FAIL] Test 2A: User A failed to read own profile: %', SQLERRM;
  END;

  -- ---------------------------------------------------------------------------
  -- Test 2B (Negative): User A cannot read User B from base table (RLS isolates)
  -- ---------------------------------------------------------------------------
  SELECT COUNT(*) INTO v_rows_affected FROM public.profiles WHERE id = v_test_user_b;
  IF v_rows_affected = 0 THEN
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 2B: User A reading User B from base profiles returned 0 rows (RLS isolated).';
  ELSE
    RAISE EXCEPTION '[FAIL] Test 2B: User A was able to read User B directly from base profiles! (Got % rows)', v_rows_affected;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Test 2C (Positive): User A can read User B through public_profiles view
  -- ---------------------------------------------------------------------------
  BEGIN
    SELECT COUNT(*) INTO v_rows_affected FROM public.public_profiles WHERE id = v_test_user_b;
    IF v_rows_affected = 1 THEN
      v_passed_count := v_passed_count + 1;
      RAISE NOTICE '[PASS] Test 2C: User A can read User B public info through public.public_profiles.';
    ELSE
      RAISE EXCEPTION 'Expected 1 row, got %', v_rows_affected;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '[FAIL] Test 2C: User A failed to read User B public view: %', SQLERRM;
  END;

  -- ---------------------------------------------------------------------------
  -- Test 2D (Negative): User A modifying User B profile must affect 0 rows
  -- ---------------------------------------------------------------------------
  UPDATE public.profiles
  SET display_name = 'Hacked by User A'
  WHERE id = v_test_user_b;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  IF v_rows_affected = 0 THEN
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 2D: User A modifying User B affected 0 rows (Blocked by RLS).';
  ELSE
    RAISE EXCEPTION '[FAIL] Test 2D: User A modified User B profile! (Affected % rows)', v_rows_affected;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Test 2E (Negative): Authenticated direct INSERT on public.profiles is blocked
  -- (Uses existing valid auth UUID to verify failure is 42501 privilege denial)
  -- ---------------------------------------------------------------------------
  v_test_failed := false;
  v_error_caught := false;
  v_sqlstate := '';
  v_error_message := '';
  BEGIN
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (v_test_user_b, 'manual_insert', 'Direct Insert');
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test 2E: Authenticated client was allowed direct INSERT into public.profiles!';
  ELSIF NOT v_error_caught OR v_sqlstate != '42501' THEN
    RAISE EXCEPTION '[FAIL] Test 2E: Expected SQLSTATE 42501 (insufficient_privilege), got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 2E: Authenticated direct INSERT blocked with SQLSTATE 42501.';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Test 2F (Negative): User A modifying server-controlled progression (level/xp/rank)
  -- ---------------------------------------------------------------------------
  v_test_failed := false;
  v_error_caught := false;
  v_sqlstate := '';
  v_error_message := '';
  BEGIN
    EXECUTE format('UPDATE public.profiles SET level = 100, xp = 999999 WHERE id = ''%s''::UUID', v_test_user_a);
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test 2F: User A was allowed to modify server-authoritative level/xp!';
  ELSIF NOT v_error_caught OR (v_sqlstate != '42501' AND v_sqlstate != 'P0001') THEN
    RAISE EXCEPTION '[FAIL] Test 2F: Expected SQLSTATE 42501 or P0001, got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 2F: Client modification of level/xp blocked (SQLSTATE: %).', v_sqlstate;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Test 2G (Negative): User A attempting to equip level-locked avatar
  -- User A is Level 1; void_sovereign requires Level 50. Must be blocked by trigger.
  -- ---------------------------------------------------------------------------
  v_test_failed := false;
  v_error_caught := false;
  v_sqlstate := '';
  v_error_message := '';
  BEGIN
    UPDATE public.profiles SET avatar_id = 'void_sovereign' WHERE id = v_test_user_a;
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test 2G: User A was allowed to equip locked avatar void_sovereign!';
  ELSIF NOT v_error_caught OR v_sqlstate != 'P0001' THEN
    RAISE EXCEPTION '[FAIL] Test 2G: Expected SQLSTATE P0001 (raise_exception), got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 2G: Level-locked avatar equip blocked with SQLSTATE P0001: %', v_error_message;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Test 2H (Negative): User A attempting to set an arbitrary non-catalog title
  -- Must be rejected by CHECK constraint valid_title_id (SQLSTATE 23514)
  -- ---------------------------------------------------------------------------
  v_test_failed := false;
  v_error_caught := false;
  v_sqlstate := '';
  v_error_message := '';
  BEGIN
    UPDATE public.profiles SET title_id = 'god_mode_title' WHERE id = v_test_user_a;
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test 2H: User A was allowed to set arbitrary invalid title!';
  ELSIF NOT v_error_caught OR v_sqlstate != '23514' THEN
    RAISE EXCEPTION '[FAIL] Test 2H: Expected SQLSTATE 23514 (check_violation), got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 2H: Arbitrary title rejected by CHECK constraint with SQLSTATE 23514.';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Test 2I (Negative): User A attempting to equip level-locked title
  -- User A is Level 1; code_breaker requires Level 10. Must be blocked by trigger.
  -- ---------------------------------------------------------------------------
  v_test_failed := false;
  v_error_caught := false;
  v_sqlstate := '';
  v_error_message := '';
  BEGIN
    UPDATE public.profiles SET title_id = 'code_breaker' WHERE id = v_test_user_a;
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test 2I: User A was allowed to equip locked title code_breaker!';
  ELSIF NOT v_error_caught OR v_sqlstate != 'P0001' THEN
    RAISE EXCEPTION '[FAIL] Test 2I: Expected SQLSTATE P0001 (raise_exception), got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 2I: Level-locked title equip blocked with SQLSTATE P0001: %', v_error_message;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Test 2J (Negative): User A attempting to equip achievement title without server unlock
  -- ---------------------------------------------------------------------------
  v_test_failed := false;
  v_error_caught := false;
  v_sqlstate := '';
  v_error_message := '';
  BEGIN
    UPDATE public.profiles SET title_id = 'speed_demon_title' WHERE id = v_test_user_a;
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test 2J: User A was allowed to equip achievement title without server authority!';
  ELSIF NOT v_error_caught OR v_sqlstate != 'P0001' THEN
    RAISE EXCEPTION '[FAIL] Test 2J: Expected SQLSTATE P0001 (raise_exception), got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 2J: Direct achievement title equip blocked with SQLSTATE P0001: %', v_error_message;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Test 2K (Positive): User A updating permitted presentation fields
  -- User A updates display_name, valid starter avatar (arcade_star), and starter title
  -- ---------------------------------------------------------------------------
  BEGIN
    UPDATE public.profiles
    SET display_name = 'Alpha Champion',
        avatar_id = 'arcade_star',
        title_id = 'apprentice_hunter'
    WHERE id = v_test_user_a;
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    IF v_rows_affected = 1 THEN
      SELECT display_name INTO v_updated_val FROM public.profiles WHERE id = v_test_user_a;
      IF v_updated_val = 'Alpha Champion' THEN
        v_passed_count := v_passed_count + 1;
        RAISE NOTICE '[PASS] Test 2K: User A successfully updated permitted presentation fields.';
      ELSE
        RAISE EXCEPTION 'Updated display_name mismatch.';
      END IF;
    ELSE
      RAISE EXCEPTION 'Update affected % rows, expected 1.', v_rows_affected;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '[FAIL] Test 2K: Permitted update failed: %', SQLERRM;
  END;

  -- ---------------------------------------------------------------------------
  -- Test 2L (Negative): Direct DELETE on public.profiles is blocked
  -- ---------------------------------------------------------------------------
  v_test_failed := false;
  v_error_caught := false;
  v_sqlstate := '';
  v_error_message := '';
  BEGIN
    DELETE FROM public.profiles WHERE id = v_test_user_a;
    v_test_failed := true;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
  END;

  IF v_test_failed THEN
    RAISE EXCEPTION '[FAIL] Test 2L: User A was allowed direct DELETE on public.profiles!';
  ELSIF NOT v_error_caught OR v_sqlstate != '42501' THEN
    RAISE EXCEPTION '[FAIL] Test 2L: Expected SQLSTATE 42501 (insufficient_privilege), got %: %', v_sqlstate, v_error_message;
  ELSE
    v_passed_count := v_passed_count + 1;
    RAISE NOTICE '[PASS] Test 2L: Direct DELETE on public.profiles blocked with SQLSTATE 42501.';
  END IF;

  -- Reset role and claims cleanly
  RESET ROLE;
  SET LOCAL "request.jwt.claims" = '';

  RAISE NOTICE '--- Authenticated Suite Passed: % / 12 checks ---', v_passed_count;
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'ALL 17 RLS & SECURITY AUDIT CHECKS PASSED CLEANLY!';
  RAISE NOTICE '==================================================';
END $$;

-- Transaction isolation: discards any test updates on User A and leaves accounts pristine
ROLLBACK;
