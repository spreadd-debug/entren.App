-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: PT Session Tracking (set-level registration)
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Extend workout_sessions with PT tracking fields ───────────────────────

ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS started_at      TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS finished_at     TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER     NULL,
  ADD COLUMN IF NOT EXISTS total_volume    NUMERIC     NULL,
  ADD COLUMN IF NOT EXISTS pt_notes        TEXT        NULL,
  ADD COLUMN IF NOT EXISTS status          TEXT        NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed'));

-- Backfill existing completed sessions
UPDATE workout_sessions
  SET status = 'completed'
  WHERE completed_at IS NOT NULL AND status = 'in_progress';

-- ── 2. session_sets — per-set tracking within each exercise ──────────────────

CREATE TABLE IF NOT EXISTS session_sets (
  id                     UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_exercise_id    UUID        NOT NULL REFERENCES workout_session_exercises(id) ON DELETE CASCADE,
  set_number             INTEGER     NOT NULL,
  weight_kg              NUMERIC     NULL,
  reps_done              INTEGER     NULL,
  rpe                    NUMERIC     NULL CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10)),
  rir                    INTEGER     NULL CHECK (rir IS NULL OR (rir >= 0 AND rir <= 10)),
  completed              BOOLEAN     NOT NULL DEFAULT true,
  notes                  TEXT        NULL,
  created_at             TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(session_exercise_id, set_number)
);

-- ── 3. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE session_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_session_sets"
  ON session_sets USING (true) WITH CHECK (true);

-- ── 4. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_session_sets_exercise
  ON session_sets(session_exercise_id);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_status
  ON workout_sessions(student_id, status);
