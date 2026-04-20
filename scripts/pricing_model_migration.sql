-- Pricing Model Migration
-- Adds explicit pricing_model per student + student_packages table for session-based packages.
-- Run this in Supabase SQL Editor.

-- 1. Add pricing_model + session_rate to students
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS pricing_model TEXT
    CHECK (pricing_model IN ('mensual', 'por_sesion', 'paquete', 'libre'))
    DEFAULT 'mensual';

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS session_rate NUMERIC;

COMMENT ON COLUMN students.pricing_model IS
  'How this student is billed: mensual (plan + due date), por_sesion (session_rate per class), paquete (student_packages table), libre (not billed).';

COMMENT ON COLUMN students.session_rate IS
  'Per-session rate for students with pricing_model=por_sesion. In ARS.';

-- Backfill: anyone with cobra_cuota=false becomes libre. Everyone else stays mensual (default).
UPDATE students
  SET pricing_model = 'libre'
  WHERE cobra_cuota IS FALSE AND pricing_model = 'mensual';

-- 2. Create student_packages table
CREATE TABLE IF NOT EXISTS student_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL,
  sessions_total INTEGER NOT NULL CHECK (sessions_total > 0),
  sessions_used INTEGER NOT NULL DEFAULT 0 CHECK (sessions_used >= 0),
  price_paid NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  purchased_at DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE student_packages IS
  'Session packages for students with pricing_model=paquete. Each row is one purchased package; sessions_used tracks consumption.';

-- Only one active package per student at a time (simplifies consume logic).
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_packages_one_active
  ON student_packages(student_id)
  WHERE active;

-- Fast history lookup
CREATE INDEX IF NOT EXISTS idx_student_packages_student
  ON student_packages(student_id, purchased_at DESC);

-- Fast gym-wide queries
CREATE INDEX IF NOT EXISTS idx_student_packages_gym
  ON student_packages(gym_id, active);

-- 3. RLS
ALTER TABLE student_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_student_packages"
  ON student_packages FOR ALL USING (true) WITH CHECK (true);
