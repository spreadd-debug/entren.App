-- ============================================================
--  entrenApp – Sistema de Turnos
--  Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Configuración del gimnasio
CREATE TABLE IF NOT EXISTS gym_settings (
  gym_id     uuid PRIMARY KEY,
  shifts_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Turnos
CREATE TABLE IF NOT EXISTS shifts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id       uuid NOT NULL,
  name         text NOT NULL,
  day_of_week  integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time   time NOT NULL,
  end_time     time NOT NULL,
  capacity     integer NOT NULL DEFAULT 20,
  created_at   timestamptz DEFAULT now()
);

-- 3. Alumnos por turno
CREATE TABLE IF NOT EXISTS shift_students (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id   uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (shift_id, student_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_shifts_gym_id
  ON shifts (gym_id);

CREATE INDEX IF NOT EXISTS idx_shift_students_shift_id
  ON shift_students (shift_id);

CREATE INDEX IF NOT EXISTS idx_shift_students_student_id
  ON shift_students (student_id);

-- Row Level Security
ALTER TABLE gym_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_students  ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas (ajustar según tus reglas de auth)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gym_settings' AND policyname = 'allow_all_gym_settings'
  ) THEN
    CREATE POLICY allow_all_gym_settings ON gym_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shifts' AND policyname = 'allow_all_shifts'
  ) THEN
    CREATE POLICY allow_all_shifts ON shifts FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shift_students' AND policyname = 'allow_all_shift_students'
  ) THEN
    CREATE POLICY allow_all_shift_students ON shift_students FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Fila inicial para el gimnasio demo
INSERT INTO gym_settings (gym_id, shifts_enabled)
VALUES ('11111111-1111-1111-1111-111111111111', false)
ON CONFLICT (gym_id) DO NOTHING;
