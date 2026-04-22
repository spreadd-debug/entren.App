-- ══════════════════════════════════════════════════════════════════════════════
-- entrenApp: Running module (atletas híbridos — Fase 1)
-- Permite marcar a un alumno como atleta multidisciplina y registrar corridas
-- libres (log) cargadas tanto por el PT como por el alumno desde su portal.
-- Run this ONCE in the Supabase SQL Editor.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. student_disciplines ────────────────────────────────────────────────────
-- Tabla N:N entre student y disciplina. Diseñada para extenderse a futuro
-- (natación, ciclismo, etc.) sin migraciones nuevas — solo se relaja el CHECK.
CREATE TABLE IF NOT EXISTS student_disciplines (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id  UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  discipline  TEXT        NOT NULL CHECK (discipline IN ('gym', 'running')),
  started_at  DATE        NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, discipline)
);

CREATE INDEX IF NOT EXISTS idx_student_disciplines_gym
  ON student_disciplines (gym_id, discipline);

-- ── 2. running_sessions ──────────────────────────────────────────────────────
-- Una fila por corrida. pace_seconds_per_km es columna generada para queries
-- y orden por ritmo sin recalcular en el cliente.
CREATE TABLE IF NOT EXISTS running_sessions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id                UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id            UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_date          DATE        NOT NULL,
  distance_km           NUMERIC(6,2) NOT NULL CHECK (distance_km > 0),
  duration_seconds      INTEGER     NOT NULL CHECK (duration_seconds > 0),
  pace_seconds_per_km   INTEGER     GENERATED ALWAYS AS (
                                      ROUND(duration_seconds::numeric / NULLIF(distance_km, 0))
                                    ) STORED,
  avg_hr_bpm            INTEGER     NULL CHECK (avg_hr_bpm IS NULL OR (avg_hr_bpm BETWEEN 30 AND 250)),
  perceived_effort      SMALLINT    NULL CHECK (perceived_effort IS NULL OR (perceived_effort BETWEEN 1 AND 10)),
  session_type          TEXT        NOT NULL DEFAULT 'easy'
                                    CHECK (session_type IN ('easy', 'long', 'tempo', 'intervals', 'race', 'other')),
  notes                 TEXT        NULL,
  logged_by             TEXT        NOT NULL DEFAULT 'pt'
                                    CHECK (logged_by IN ('pt', 'student')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para las queries típicas: historial por alumno y filtro por tipo
CREATE INDEX IF NOT EXISTS idx_running_sessions_student_date
  ON running_sessions (gym_id, student_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_running_sessions_student_type
  ON running_sessions (student_id, session_type);

-- ── 3. RLS (consistente con el resto de tablas del módulo PT) ────────────────
ALTER TABLE student_disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE running_sessions    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_student_disciplines"
  ON student_disciplines USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_running_sessions"
  ON running_sessions USING (true) WITH CHECK (true);
