-- ─── Check-in Table ──────────────────────────────────────────────────────────
-- Records each time a student scans the gym QR and confirms their attendance.

CREATE TABLE IF NOT EXISTS checkins (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id         uuid        NOT NULL,
  student_id     uuid        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  checked_in_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkins_gym_id     ON checkins (gym_id);
CREATE INDEX IF NOT EXISTS idx_checkins_student_id ON checkins (student_id);
CREATE INDEX IF NOT EXISTS idx_checkins_at         ON checkins (checked_in_at DESC);

-- RLS: allow public insert (check-in page is unauthenticated)
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert checkins"
  ON checkins FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow gym read checkins"
  ON checkins FOR SELECT
  USING (true);
