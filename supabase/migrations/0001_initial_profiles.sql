-- ==============================================================================
-- Migration: 0001_initial_profiles.sql
-- Description: Create public.profiles table, triggers, immutability guards, view, and RLS
-- Application: Guess My Number (Expo React Native)
-- ==============================================================================

-- 1. Create Profiles Table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_id TEXT NOT NULL DEFAULT 'oracle_orb',
  title_id TEXT NOT NULL DEFAULT 'apprentice_hunter',
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  rank TEXT NOT NULL DEFAULT 'Beginner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Username constraints: lowercase alphanumeric and underscores, 3-20 chars
  CONSTRAINT username_unique UNIQUE (username),
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]+$'),

  -- Display name constraints: 2-30 chars
  CONSTRAINT display_name_length CHECK (char_length(display_name) >= 2 AND char_length(display_name) <= 30),

  -- Avatar ID constraint: valid catalog identifier
  CONSTRAINT valid_avatar_id CHECK (avatar_id IN (
    'oracle_orb',
    'neon_spark',
    'cipher_cube',
    'arcade_star',
    'cyber_crown',
    'neon_fox',
    'quantum_core',
    'mystic_eye',
    'cybernetic_mind',
    'golden_hunter',
    'void_sovereign',
    'grandmaster_glyph'
  )),

  -- Title ID constraint: canonical snake_case catalog identifier only
  CONSTRAINT valid_title_id CHECK (title_id IN (
    'apprentice_hunter',
    'number_seeker',
    'skilled_guesser',
    'code_breaker',
    'intuition_expert',
    'oracle_whisperer',
    'master_mind',
    'arcade_legend',
    'master_tactician',
    'grandmaster_mind',
    'arcade_legend_title',
    'arcade_sovereign',
    'omniscient_oracle',
    'living_legend',
    'speed_demon_title',
    'flawless_hunter',
    'champion'
  )),

  -- Progression integrity constraints
  CONSTRAINT level_range CHECK (level >= 1 AND level <= 100),
  CONSTRAINT xp_non_negative CHECK (xp >= 0)
);

-- 2. Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON public.profiles(level DESC);

-- 3. Trigger for automatic updated_at timestamp maintenance
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Server-Authoritative Immutability Guard Trigger
-- Enforces that server-controlled progression fields (level, xp, rank) and system fields
-- (id, created_at, username) cannot be tampered with by client-side UPDATE statements.
-- Validates cosmetic unlock requirements against server-authoritative level and rank.
CREATE OR REPLACE FUNCTION public.enforce_profile_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Immutable identity and audit fields
  IF (OLD.id IS DISTINCT FROM NEW.id) THEN
    RAISE EXCEPTION 'Field "id" is immutable.';
  END IF;

  IF (OLD.created_at IS DISTINCT FROM NEW.created_at) THEN
    RAISE EXCEPTION 'Field "created_at" is immutable.';
  END IF;

  -- Username is locked after registration to prevent handle squatting / hijacking
  IF (OLD.username IS DISTINCT FROM NEW.username) THEN
    RAISE EXCEPTION 'Field "username" cannot be modified directly.';
  END IF;

  -- Server-Authoritative Progression Fields:
  -- Client requests via Supabase PostgREST always carry auth.role() IN ('authenticated', 'anon').
  -- Clients can NEVER modify level, xp, or rank directly.
  IF (auth.role() = 'authenticated' OR auth.role() = 'anon') THEN
    IF (OLD.level IS DISTINCT FROM NEW.level OR 
        OLD.xp IS DISTINCT FROM NEW.xp OR 
        OLD.rank IS DISTINCT FROM NEW.rank) THEN
      RAISE EXCEPTION 'Fields "level", "xp", and "rank" are server-authoritative and cannot be modified by client requests.';
    END IF;
  END IF;

  -- Server-side cosmetic avatar unlock validation against server-authoritative level and rank
  IF (OLD.avatar_id IS DISTINCT FROM NEW.avatar_id) THEN
    IF NEW.avatar_id = 'quantum_core' AND OLD.level < 5 THEN
      RAISE EXCEPTION 'Avatar "quantum_core" requires level 5.';
    ELSIF NEW.avatar_id = 'mystic_eye' AND OLD.level < 10 THEN
      RAISE EXCEPTION 'Avatar "mystic_eye" requires level 10.';
    ELSIF NEW.avatar_id = 'cybernetic_mind' AND OLD.level < 15 THEN
      RAISE EXCEPTION 'Avatar "cybernetic_mind" requires level 15.';
    ELSIF NEW.avatar_id = 'golden_hunter' AND (OLD.level < 25 OR OLD.rank NOT IN ('Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster')) THEN
      RAISE EXCEPTION 'Avatar "golden_hunter" requires level 25 and Gold rank.';
    ELSIF NEW.avatar_id = 'void_sovereign' AND OLD.level < 50 THEN
      RAISE EXCEPTION 'Avatar "void_sovereign" requires level 50.';
    ELSIF NEW.avatar_id = 'grandmaster_glyph' AND OLD.rank != 'Grandmaster' THEN
      RAISE EXCEPTION 'Avatar "grandmaster_glyph" requires Grandmaster rank.';
    END IF;
  END IF;

  -- Server-side cosmetic title unlock validation against server-authoritative level and unlock authority
  IF (OLD.title_id IS DISTINCT FROM NEW.title_id) THEN
    IF NEW.title_id = 'number_seeker' AND OLD.level < 2 THEN
      RAISE EXCEPTION 'Title "%" requires level 2.', NEW.title_id;
    ELSIF NEW.title_id = 'skilled_guesser' AND OLD.level < 5 THEN
      RAISE EXCEPTION 'Title "%" requires level 5.', NEW.title_id;
    ELSIF NEW.title_id = 'code_breaker' AND OLD.level < 10 THEN
      RAISE EXCEPTION 'Title "%" requires level 10.', NEW.title_id;
    ELSIF NEW.title_id = 'intuition_expert' AND OLD.level < 15 THEN
      RAISE EXCEPTION 'Title "%" requires level 15.', NEW.title_id;
    ELSIF NEW.title_id = 'oracle_whisperer' AND OLD.level < 18 THEN
      RAISE EXCEPTION 'Title "%" requires level 18.', NEW.title_id;
    ELSIF NEW.title_id = 'master_mind' AND OLD.level < 20 THEN
      RAISE EXCEPTION 'Title "%" requires level 20.', NEW.title_id;
    ELSIF NEW.title_id = 'arcade_legend' AND OLD.level < 25 THEN
      RAISE EXCEPTION 'Title "%" requires level 25.', NEW.title_id;
    ELSIF NEW.title_id = 'master_tactician' AND OLD.level < 40 THEN
      RAISE EXCEPTION 'Title "%" requires level 40.', NEW.title_id;
    ELSIF (NEW.title_id = 'grandmaster_mind' OR NEW.title_id = 'arcade_legend_title') AND OLD.level < 50 THEN
      RAISE EXCEPTION 'Title "%" requires level 50.', NEW.title_id;
    ELSIF NEW.title_id = 'arcade_sovereign' AND OLD.level < 60 THEN
      RAISE EXCEPTION 'Title "%" requires level 60.', NEW.title_id;
    ELSIF NEW.title_id = 'omniscient_oracle' AND OLD.level < 75 THEN
      RAISE EXCEPTION 'Title "%" requires level 75.', NEW.title_id;
    ELSIF NEW.title_id = 'living_legend' AND OLD.level < 100 THEN
      RAISE EXCEPTION 'Title "%" requires level 100.', NEW.title_id;
    ELSIF NEW.title_id IN ('speed_demon_title', 'flawless_hunter', 'champion') THEN
      IF (auth.role() = 'authenticated' OR auth.role() = 'anon') THEN
        RAISE EXCEPTION 'Achievement title "%" requires verified server-side achievement unlock authority.', NEW.title_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_enforce_profile_immutability ON public.profiles;
CREATE TRIGGER trg_enforce_profile_immutability
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_immutability();

-- 5. Trigger for automatic profile creation when an Auth User is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_raw_username TEXT;
  v_username TEXT;
  v_display_name TEXT;
  v_avatar_id TEXT;
  v_title_id TEXT;
  v_retry_count INTEGER := 0;
BEGIN
  -- Extract metadata provided during signUp
  v_raw_username := pg_catalog.lower(pg_catalog.trim(pg_catalog.coalesce(NEW.raw_user_meta_data->>'username', '')));
  v_display_name := pg_catalog.trim(pg_catalog.coalesce(NEW.raw_user_meta_data->>'display_name', ''));
  v_avatar_id := pg_catalog.coalesce(NEW.raw_user_meta_data->>'avatar_id', 'oracle_orb');
  v_title_id := pg_catalog.coalesce(NEW.raw_user_meta_data->>'title_id', 'apprentice_hunter');

  -- Generate valid fallback username if none provided or invalid format
  IF v_raw_username ~ '^[a-z0-9_]{3,20}$' THEN
    v_username := v_raw_username;
  ELSE
    v_username := 'hunter_' || pg_catalog.substring(pg_catalog.replace(NEW.id::TEXT, '-', '') FROM 1 FOR 8);
  END IF;

  -- Ensure fallback display name
  IF pg_catalog.char_length(v_display_name) < 2 THEN
    v_display_name := 'Number Hunter';
  ELSIF pg_catalog.char_length(v_display_name) > 30 THEN
    v_display_name := pg_catalog.substring(v_display_name FROM 1 FOR 30);
  END IF;

  -- Validate starter avatar: only free starter avatars are permitted at registration
  IF NOT (v_avatar_id IN ('oracle_orb', 'arcade_star', 'cyber_crown', 'neon_fox', 'neon_spark', 'cipher_cube')) THEN
    v_avatar_id := 'oracle_orb';
  END IF;

  -- Validate starter title: only free starter title is permitted at registration
  IF NOT (v_title_id = 'apprentice_hunter') THEN
    v_title_id := 'apprentice_hunter';
  END IF;

  -- Safe collision pre-check loop bounded to 5 attempts
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) AND v_retry_count < 5 LOOP
    v_retry_count := v_retry_count + 1;
    v_username := 'hunter_' || pg_catalog.substring(pg_catalog.md5(pg_catalog.random()::TEXT) FROM 1 FOR 8);
  END LOOP;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
    v_username := 'hunter_' || pg_catalog.substring(pg_catalog.replace(NEW.id::TEXT, '-', '') FROM 1 FOR 10);
  END IF;

  -- Transactionally consistent insertion with concurrent collision recovery
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
      now(),
      now()
    );
  EXCEPTION
    WHEN unique_violation THEN
      v_username := 'hunter_' || pg_catalog.substring(pg_catalog.replace(NEW.id::TEXT, '-', '') FROM 1 FOR 12);
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
        now(),
        now()
      );
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Row Level Security (RLS) Configuration on Base Table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. Database Permissions
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (display_name, avatar_id, title_id) ON public.profiles TO authenticated;

-- 8. RLS Policies on Base Table
DROP POLICY IF EXISTS "Public profiles are viewable by all users" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 9. Dedicated Public Profiles View
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT
    id,
    username,
    display_name,
    avatar_id,
    title_id,
    level,
    xp,
    rank,
    created_at
  FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
