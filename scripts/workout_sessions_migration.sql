-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Workout Sessions, Checklist & Update Requests
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. workout_sessions ────────────────────────────────────────────────────────
-- Una sesión por día por alumno: registra qué rutina eligió hacer ese día.

CREATE TABLE IF NOT EXISTS workout_sessions (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id            UUID        NOT NULL,
  student_id        UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  workout_plan_id   UUID        NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  session_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  completed_at      TIMESTAMPTZ NULL,
  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── 2. workout_session_exercises ───────────────────────────────────────────────
-- Estado de cada ejercicio dentro de una sesión (checklist del alumno).

CREATE TABLE IF NOT EXISTS workout_session_exercises (
  id                    UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id            UUID    NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  workout_exercise_id   UUID    NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  completed             BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(session_id, workout_exercise_id)
);

-- ── 3. workout_update_requests ─────────────────────────────────────────────────
-- Solicitud del alumno para que el profesor actualice su rutina.
-- Evita duplicados: el sistema no deja crear una segunda solicitud pendiente.

CREATE TABLE IF NOT EXISTS workout_update_requests (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id      UUID        NOT NULL,
  student_id  UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'acknowledged', 'resolved')),
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  resolved_at TIMESTAMPTZ NULL
);

-- ── 4. RLS Policies ────────────────────────────────────────────────────────────

ALTER TABLE workout_sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_session_exercises   ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_update_requests     ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas (igual que el resto del proyecto)
CREATE POLICY "allow_all_workout_sessions"
  ON workout_sessions USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_workout_session_exercises"
  ON workout_session_exercises USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_workout_update_requests"
  ON workout_update_requests USING (true) WITH CHECK (true);

-- ── 5. Índices de performance ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_workout_sessions_student_date
  ON workout_sessions(student_id, session_date);

CREATE INDEX IF NOT EXISTS idx_workout_session_exercises_session
  ON workout_session_exercises(session_id);

CREATE INDEX IF NOT EXISTS idx_workout_update_requests_student_status
  ON workout_update_requests(student_id, status);

CREATE INDEX IF NOT EXISTS idx_workout_update_requests_gym_status
  ON workout_update_requests(gym_id, status);

