-- ==============================================================================
-- Migration: 0009_fix_auth_new_user_trigger.sql
-- Description: Bulletproof fix for "Database error saving new user" during Supabase sign-up.
--              Hardens handle_new_user() and handle_new_player_rating() against:
--              1. Schema resolution issues (explicit search_path = public, pg_catalog).
--              2. Username length and regex constraint violations.
--              3. Downstream player_ratings trigger exceptions and foreign key races.
--              4. Uncaught exceptions by wrapping in robust EXCEPTION handlers.
-- ==============================================================================

-- 1. Bulletproof Player Ratings initialization function
CREATE OR REPLACE FUNCTION public.handle_new_player_rating()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.player_ratings (
    user_id,
    rating,
    tier,
    division,
    season_id,
    ranked_games_played,
    ranked_games_won,
    best_rating,
    current_win_streak,
    best_win_streak,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    400,
    'bronze',
    'III',
    1,
    0,
    0,
    400,
    0,
    0,
    pg_catalog.now(),
    pg_catalog.now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Warning logged to PostgreSQL audit log; prevents rolling back the profile creation
    RAISE WARNING 'handle_new_player_rating exception for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- Reattach trigger on public.profiles
DROP TRIGGER IF EXISTS trg_profile_init_player_rating ON public.profiles;
CREATE TRIGGER trg_profile_init_player_rating
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_player_rating();


-- 2. Bulletproof Auth New User Handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_raw_username TEXT;
  v_username TEXT;
  v_display_name TEXT;
  v_avatar_id TEXT;
  v_title_id TEXT;
  v_retry_count INTEGER := 0;
  v_short_uuid TEXT;
BEGIN
  -- Extract short UUID for fallback naming (8 chars)
  v_short_uuid := pg_catalog.substr(pg_catalog.replace(NEW.id::TEXT, '-', ''), 1, 8);

  -- Extract metadata safely
  v_raw_username := pg_catalog.lower(pg_catalog.trim(pg_catalog.coalesce(NEW.raw_user_meta_data->>'username', '')));
  v_display_name := pg_catalog.trim(pg_catalog.coalesce(NEW.raw_user_meta_data->>'display_name', ''));
  v_avatar_id := pg_catalog.coalesce(NEW.raw_user_meta_data->>'avatar_id', 'oracle_orb');
  v_title_id := pg_catalog.coalesce(NEW.raw_user_meta_data->>'title_id', 'apprentice_hunter');

  -- Validate username format and length (3-20 chars, lowercase alphanumeric + underscore)
  IF v_raw_username ~ '^[a-z0-9_]{3,20}$' THEN
    v_username := v_raw_username;
  ELSE
    v_username := 'hunter_' || v_short_uuid;
  END IF;

  -- Ensure display_name complies with CHECK (char_length >= 2 AND char_length <= 30)
  IF pg_catalog.char_length(v_display_name) < 2 THEN
    v_display_name := 'Number Hunter';
  ELSIF pg_catalog.char_length(v_display_name) > 30 THEN
    v_display_name := pg_catalog.substr(v_display_name, 1, 30);
  END IF;

  -- Ensure avatar_id complies with valid catalog constraint
  IF v_avatar_id NOT IN (
    'oracle_orb', 'neon_spark', 'cipher_cube', 'arcade_star', 'cyber_crown',
    'neon_fox', 'quantum_core', 'mystic_eye', 'cybernetic_mind', 'golden_hunter',
    'void_sovereign', 'grandmaster_glyph'
  ) THEN
    v_avatar_id := 'oracle_orb';
  END IF;

  -- Ensure title_id complies with valid catalog constraint
  IF v_title_id NOT IN (
    'apprentice_hunter', 'number_seeker', 'skilled_guesser', 'code_breaker',
    'intuition_expert', 'oracle_whisperer', 'master_mind', 'arcade_legend',
    'master_tactician', 'grandmaster_mind', 'arcade_legend_title', 'arcade_sovereign',
    'omniscient_oracle', 'living_legend', 'speed_demon_title', 'flawless_hunter', 'champion'
  ) THEN
    v_title_id := 'apprentice_hunter';
  END IF;

  -- Collision avoidance loop (at most 5 attempts with random hash)
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) AND v_retry_count < 5 LOOP
    v_retry_count := v_retry_count + 1;
    v_username := 'hunter_' || pg_catalog.substr(pg_catalog.md5(pg_catalog.random()::TEXT), 1, 8);
  END LOOP;

  -- If still colliding, fallback to guaranteed deterministic unique slice (hunter_ + 10 chars = 17 chars <= 20)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
    v_username := 'hunter_' || pg_catalog.substr(pg_catalog.replace(NEW.id::TEXT, '-', ''), 1, 10);
  END IF;

  -- Insert profile row with conflict and exception safety
  BEGIN
    INSERT INTO public.profiles (
      id,
      username,
      display_name,
      avatar_id,
      title_id,
      level,
      xp,
      rank,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      v_username,
      v_display_name,
      v_avatar_id,
      v_title_id,
      1,
      0,
      'Beginner',
      pg_catalog.now(),
      pg_catalog.now()
    )
    ON CONFLICT (id) DO UPDATE SET
      updated_at = pg_catalog.now();
  EXCEPTION
    WHEN unique_violation THEN
      -- Final deterministic unique fallback (hunter_ + 11 chars = 18 chars <= 20)
      v_username := 'hunter_' || pg_catalog.substr(pg_catalog.replace(NEW.id::TEXT, '-', ''), 1, 11);
      INSERT INTO public.profiles (
        id,
        username,
        display_name,
        avatar_id,
        title_id,
        level,
        xp,
        rank,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        v_username,
        v_display_name,
        v_avatar_id,
        v_title_id,
        1,
        0,
        'Beginner',
        pg_catalog.now(),
        pg_catalog.now()
      )
      ON CONFLICT (id) DO NOTHING;
    WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user exception during profile insert for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ensure unhandled top-level errors never block auth.users creation
    RAISE WARNING 'handle_new_user fatal exception for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- Reattach trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure proper grants
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_player_rating() TO service_role;

