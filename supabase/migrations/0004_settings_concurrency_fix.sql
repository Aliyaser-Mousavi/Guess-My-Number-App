-- ==============================================================================
-- Migration: 0004_settings_concurrency_fix.sql
-- Description: Additive Migration to Fix NULL Expected Version Bypass in OCC RPC
-- Enforces that a NULL expected_version explicitly returns a conflict error
-- and can never silently bypass optimistic concurrency control.
-- ==============================================================================

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

  -- 1. Guard against NULL expected version: A NULL version must NEVER bypass OCC
  IF p_expected_version IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'conflict', true,
      'expected_version', NULL,
      'error', 'Optimistic concurrency violation: p_expected_version cannot be NULL'
    );
  END IF;

  -- 2. Lock row to check expected version
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

  -- 3. Detect concurrency collision / stale update using null-safe comparison
  IF v_current_version IS DISTINCT FROM p_expected_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'conflict', true,
      'expected_version', p_expected_version,
      'current_version', v_current_version,
      'error', 'Optimistic concurrency conflict: Version mismatch'
    );
  END IF;

  -- 4. Apply partial updates (only non-null arguments)
  -- The trigger trg_user_settings_versioning automatically increments version and updates updated_at
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

