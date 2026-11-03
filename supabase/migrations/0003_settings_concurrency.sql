-- ==============================================================================
-- Migration: 0003_settings_concurrency.sql
-- Description: Additive Migration for Database-Managed Settings Versioning & OCC
-- Enforces atomic database-controlled version increments and prevents client spoofing
-- ==============================================================================

-- 1. Automatic version increment and timestamp trigger for user_settings
CREATE OR REPLACE FUNCTION public.handle_user_settings_versioning()
RETURNS TRIGGER AS $$
BEGIN
  -- Strictly enforce database-managed version increment on every update
  NEW.version = OLD.version + 1;
  -- Strictly enforce server-managed updated_at timestamp
  NEW.updated_at = now();
  -- Protect user_id against accidental alteration
  NEW.user_id = OLD.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 2. Enforce clean initial version and timestamp on insert
CREATE OR REPLACE FUNCTION public.handle_user_settings_insert()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = 1;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Attach triggers to public.user_settings
DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
DROP TRIGGER IF EXISTS trg_user_settings_versioning ON public.user_settings;
CREATE TRIGGER trg_user_settings_versioning
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_settings_versioning();

DROP TRIGGER IF EXISTS trg_user_settings_insert ON public.user_settings;
CREATE TRIGGER trg_user_settings_insert
  BEFORE INSERT ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_settings_insert();

-- 3. Stored Procedure for Atomic Optimistic Settings Updates
-- Rejects stale updates if expected_version does not match current database version.
CREATE OR REPLACE FUNCTION public.update_user_settings_optimistic(
  p_expected_version INTEGER,
  p_theme_id TEXT DEFAULT NULL,
  p_number_style TEXT DEFAULT NULL,
  p_number_animation TEXT DEFAULT NULL,
  p_text_size TEXT DEFAULT NULL,
  p_haptics BOOLEAN DEFAULT NULL,
  p_haptic_intensity TEXT DEFAULT NULL,
  p_sound_enabled BOOLEAN DEFAULT NULL,
  p_sound_volume REAL DEFAULT NULL,
  p_show_proximity BOOLEAN DEFAULT NULL,
  p_show_timer BOOLEAN DEFAULT NULL,
  p_show_range_bar BOOLEAN DEFAULT NULL,
  p_tutorial_completed BOOLEAN DEFAULT NULL,
  p_high_contrast BOOLEAN DEFAULT NULL,
  p_color_blind_mode TEXT DEFAULT NULL,
  p_reduced_motion BOOLEAN DEFAULT NULL,
  p_left_handed_controls BOOLEAN DEFAULT NULL,
  p_language TEXT DEFAULT NULL,
  p_digit_format TEXT DEFAULT NULL,
  p_notifications JSONB DEFAULT NULL,
  p_client_modified_at TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_current_version INTEGER;
  v_updated_row public.user_settings%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  -- Lock row to check expected version
  SELECT version INTO v_current_version
  FROM public.user_settings
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'conflict', false,
      'error', 'Settings record not found'
    );
  END IF;

  -- Detect concurrency collision / stale update
  IF v_current_version != p_expected_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'conflict', true,
      'expected_version', p_expected_version,
      'current_version', v_current_version,
      'error', 'Optimistic concurrency conflict: Version mismatch'
    );
  END IF;

  -- Apply partial updates (only non-null arguments)
  UPDATE public.user_settings
  SET
    theme_id = COALESCE(p_theme_id, theme_id),
    number_style = COALESCE(p_number_style, number_style),
    number_animation = COALESCE(p_number_animation, number_animation),
    text_size = COALESCE(p_text_size, text_size),
    haptics = COALESCE(p_haptics, haptics),
    haptic_intensity = COALESCE(p_haptic_intensity, haptic_intensity),
    sound_enabled = COALESCE(p_sound_enabled, sound_enabled),
    sound_volume = COALESCE(p_sound_volume, sound_volume),
    show_proximity = COALESCE(p_show_proximity, show_proximity),
    show_timer = COALESCE(p_show_timer, show_timer),
    show_range_bar = COALESCE(p_show_range_bar, show_range_bar),
    tutorial_completed = COALESCE(p_tutorial_completed, tutorial_completed),
    high_contrast = COALESCE(p_high_contrast, high_contrast),
    color_blind_mode = COALESCE(p_color_blind_mode, color_blind_mode),
    reduced_motion = COALESCE(p_reduced_motion, reduced_motion),
    left_handed_controls = COALESCE(p_left_handed_controls, left_handed_controls),
    language = COALESCE(p_language, language),
    digit_format = COALESCE(p_digit_format, digit_format),
    notifications = COALESCE(p_notifications, notifications),
    client_modified_at = COALESCE(p_client_modified_at, now())
  WHERE user_id = v_user_id
  RETURNING * INTO v_updated_row;

  RETURN jsonb_build_object(
    'success', true,
    'conflict', false,
    'new_version', v_updated_row.version,
    'updated_at', v_updated_row.updated_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.update_user_settings_optimistic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_settings_optimistic TO authenticated;

