-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: V2 Routine Session Support
-- Allows workout_sessions to work with v2 routines (routine_builder)
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Make workout_plan_id nullable + add routine columns ──────────────────

ALTER TABLE workout_sessions
  DROP CONSTRAINT IF EXISTS workout_sessions_workout_plan_id_fkey;

ALTER TABLE workout_sessions
  ALTER COLUMN workout_plan_id DROP NOT NULL;

ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS routine_id UUID NULL,
  ADD COLUMN IF NOT EXISTS routine_day_id UUID NULL;

-- Re-add FK as optional (only validates when workout_plan_id is not null)
ALTER TABLE workout_sessions
  ADD CONSTRAINT workout_sessions_workout_plan_id_fkey
  FOREIGN KEY (workout_plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE;

-- ── 2. Make workout_exercise_id nullable + add v2 exercise metadata ─────────

-- Drop unique constraint that requires workout_exercise_id
ALTER TABLE workout_session_exercises
  DROP CONSTRAINT IF EXISTS workout_session_exercises_session_id_workout_exercise_id_key;

-- Drop FK constraint
ALTER TABLE workout_session_exercises
  DROP CONSTRAINT IF EXISTS workout_session_exercises_workout_exercise_id_fkey;

ALTER TABLE workout_session_exercises
  ALTER COLUMN workout_exercise_id DROP NOT NULL;

-- Add v2 metadata columns (cached so we don't need joins)
ALTER TABLE workout_session_exercises
  ADD COLUMN IF NOT EXISTS routine_exercise_id UUID NULL,
  ADD COLUMN IF NOT EXISTS exercise_name_cache TEXT NULL,
  ADD COLUMN IF NOT EXISTS sets_planned_cache INTEGER NULL,
  ADD COLUMN IF NOT EXISTS reps_planned_cache TEXT NULL,
  ADD COLUMN IF NOT EXISTS weight_planned_cache TEXT NULL,
  ADD COLUMN IF NOT EXISTS exercise_order_cache INTEGER NOT NULL DEFAULT 0;

-- ── 3. Indexes ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_workout_sessions_routine
  ON workout_sessions(routine_id) WHERE routine_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workout_session_exercises_routine_ex
  ON workout_session_exercises(routine_exercise_id) WHERE routine_exercise_id IS NOT NULL;
