-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Módulo Personal Trainer
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Tipo de gym ───────────────────────────────────────────────────────────
ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS gym_type TEXT NOT NULL DEFAULT 'gym'
  CHECK (gym_type IN ('gym', 'personal_trainer'));

COMMENT ON COLUMN gyms.gym_type
  IS 'Tipo de cuenta: gym = gimnasio tradicional, personal_trainer = entrenador personal';

-- ── 2. Antropometría del cliente (historial) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS client_anthropometry (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id          UUID        NOT NULL,
  student_id      UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  measured_at     DATE        NOT NULL DEFAULT CURRENT_DATE,
  height_cm       NUMERIC(5,1)  NULL,
  weight_kg       NUMERIC(5,1)  NULL,
  body_fat_pct    NUMERIC(4,1)  NULL,
  muscle_mass_kg  NUMERIC(5,1)  NULL,
  bmi             NUMERIC(4,1)  NULL,
  notes           TEXT          NULL,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_anthropometry_student
  ON client_anthropometry(student_id, measured_at DESC);

ALTER TABLE client_anthropometry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_client_anthropometry"
  ON client_anthropometry FOR ALL USING (true) WITH CHECK (true);

-- ── 3. Mediciones corporales (historial) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_measurements (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id          UUID        NOT NULL,
  student_id      UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  measured_at     DATE        NOT NULL DEFAULT CURRENT_DATE,
  chest_cm        NUMERIC(5,1) NULL,
  waist_cm        NUMERIC(5,1) NULL,
  hips_cm         NUMERIC(5,1) NULL,
  bicep_l_cm      NUMERIC(5,1) NULL,
  bicep_r_cm      NUMERIC(5,1) NULL,
  thigh_l_cm      NUMERIC(5,1) NULL,
  thigh_r_cm      NUMERIC(5,1) NULL,
  calf_l_cm       NUMERIC(5,1) NULL,
  calf_r_cm       NUMERIC(5,1) NULL,
  shoulders_cm    NUMERIC(5,1) NULL,
  neck_cm         NUMERIC(5,1) NULL,
  notes           TEXT          NULL,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_measurements_student
  ON client_measurements(student_id, measured_at DESC);

ALTER TABLE client_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_client_measurements"
  ON client_measurements FOR ALL USING (true) WITH CHECK (true);

-- ── 4. Objetivos del cliente ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_goals (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id          UUID        NOT NULL,
  student_id      UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  goal_type       TEXT        NOT NULL
                  CHECK (goal_type IN ('lose_weight','gain_muscle','rehab','flexibility',
                                       'endurance','strength','general_fitness','other')),
  description     TEXT        NULL,
  target_value    TEXT        NULL,
  target_date     DATE        NULL,
  status          TEXT        NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','achieved','paused','abandoned')),
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_goals_student
  ON client_goals(student_id, status);

ALTER TABLE client_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_client_goals"
  ON client_goals FOR ALL USING (true) WITH CHECK (true);

-- ── 5. Notas de sesión / progreso ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_notes (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id          UUID        NOT NULL,
  student_id      UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id      UUID        NULL REFERENCES workout_sessions(id) ON DELETE SET NULL,
  note_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  content         TEXT        NOT NULL,
  category        TEXT        NULL
                  CHECK (category IN ('progress','injury','nutrition','motivation','other')),
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_notes_student
  ON session_notes(student_id, note_date DESC);

ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_session_notes"
  ON session_notes FOR ALL USING (true) WITH CHECK (true);

