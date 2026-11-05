-- ==============================================================================
-- Migration: 0008_group10_strategy_coach.sql
-- Description: Group 10 - AI Strategy Coach & Intelligent Practice System.
--              Stores user tactical efficiency scores, coaching snapshots, and
--              personalized training recommendations for cross-device sync.
-- Application: Guess My Number (Expo React Native & Supabase)
-- Notes: Idempotent additive migration. Fully functional offline as well.
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. COACH SNAPSHOTS TABLE
-- Stores historical analytical evaluations and efficiency ratings.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  efficiency_score INTEGER NOT NULL DEFAULT 50,
  suboptimal_guess_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  boundary_waste_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  average_seconds_per_guess NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  hint_reliance_ratio NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  recommendations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  coaching_summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_eval_user_created ON public.coach_evaluations(user_id, created_at DESC);

ALTER TABLE public.coach_evaluations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.coach_evaluations FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.coach_evaluations TO authenticated;

DROP POLICY IF EXISTS "Users can view own coach evaluations" ON public.coach_evaluations;
CREATE POLICY "Users can view own coach evaluations"
  ON public.coach_evaluations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own coach evaluations" ON public.coach_evaluations;
CREATE POLICY "Users can insert own coach evaluations"
  ON public.coach_evaluations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own coach evaluations" ON public.coach_evaluations;
CREATE POLICY "Users can update own coach evaluations"
  ON public.coach_evaluations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

