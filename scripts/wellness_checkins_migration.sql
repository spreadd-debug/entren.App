-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Wellness Check-ins (daily student self-report)
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wellness_checkins (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id          UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id      UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  checkin_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  energy          INTEGER     NOT NULL CHECK (energy BETWEEN 1 AND 5),
  sleep_quality   INTEGER     NOT NULL CHECK (sleep_quality BETWEEN 1 AND 5),
  mood            INTEGER     NOT NULL CHECK (mood BETWEEN 1 AND 5),
  soreness        INTEGER     NOT NULL CHECK (soreness BETWEEN 1 AND 5),
  notes           TEXT        NULL,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Un check-in por alumno por día
  UNIQUE(student_id, checkin_date)
);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE wellness_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_wellness_checkins"
  ON wellness_checkins USING (true) WITH CHECK (true);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_wellness_checkins_student_date
  ON wellness_checkins(student_id, checkin_date DESC);

CREATE INDEX IF NOT EXISTS idx_wellness_checkins_gym
  ON wellness_checkins(gym_id, checkin_date DESC);
