-- ==============================================================================
-- Migration: 0007_group09_number_academy.sql
-- Description: Group 09 - Number Academy (Educational Curriculum, Strategy Metrics,
--              Daily Brain Training Persistence & Mastery Ranking).
-- Application: Guess My Number (Expo React Native & Supabase)
-- Notes: Idempotent additive migration. Works completely offline as well.
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. ACADEMY PROGRESS TABLE
-- Stores completed lessons, challenges, daily brain training, and accuracy metrics.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academy_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  completed_lessons TEXT[] NOT NULL DEFAULT '{}',
  completed_challenges TEXT[] NOT NULL DEFAULT '{}',
  learning_score INTEGER NOT NULL DEFAULT 0,
  optimal_guesses INTEGER NOT NULL DEFAULT 0,
  total_guesses INTEGER NOT NULL DEFAULT 0,
  mastery_rank TEXT NOT NULL DEFAULT 'novice',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academy_progress_score ON public.academy_progress(learning_score DESC);

ALTER TABLE public.academy_progress ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.academy_progress FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.academy_progress TO authenticated;

DROP POLICY IF EXISTS "Users can view own academy progress" ON public.academy_progress;
CREATE POLICY "Users can view own academy progress"
  ON public.academy_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own academy progress" ON public.academy_progress;
CREATE POLICY "Users can insert own academy progress"
  ON public.academy_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own academy progress" ON public.academy_progress;
CREATE POLICY "Users can update own academy progress"
  ON public.academy_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

