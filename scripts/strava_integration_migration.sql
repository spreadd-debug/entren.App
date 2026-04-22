-- ══════════════════════════════════════════════════════════════════════════════
-- entrenApp: Strava integration (atletas híbridos — Fase 2)
-- Conecta la cuenta de Strava del alumno (OAuth 2.0), guarda tokens y permite
-- importar corridas automáticamente (backfill + webhook push real-time).
-- Run this ONCE in the Supabase SQL Editor.
--
-- Nota de seguridad: los tokens (access/refresh) se guardan en plaintext.
-- Mitigación v1: RLS activo y el SUPABASE_SERVICE_ROLE_KEY nunca se expone al
-- cliente. Mejora futura: encriptar con pgcrypto.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. strava_connections ────────────────────────────────────────────────────
-- Una fila por alumno conectado. UNIQUE en student_id porque cada persona
-- tiene una sola cuenta Strava activa a la vez.
CREATE TABLE IF NOT EXISTS strava_connections (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id             UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id         UUID        NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  athlete_id         BIGINT      NOT NULL UNIQUE,
  access_token       TEXT        NOT NULL,
  refresh_token      TEXT        NOT NULL,
  expires_at         TIMESTAMPTZ NOT NULL,
  scope              TEXT        NULL,
  athlete_firstname  TEXT        NULL,
  athlete_lastname   TEXT        NULL,
  last_sync_at       TIMESTAMPTZ NULL,
  connected_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strava_connections_gym
  ON strava_connections (gym_id);

-- ── 2. running_sessions: nuevas columnas para origen externo ─────────────────
ALTER TABLE running_sessions
  ADD COLUMN IF NOT EXISTS source             TEXT        NOT NULL DEFAULT 'manual'
                                              CHECK (source IN ('manual', 'strava')),
  ADD COLUMN IF NOT EXISTS external_provider  TEXT        NULL
                                              CHECK (external_provider IS NULL OR external_provider IN ('strava')),
  ADD COLUMN IF NOT EXISTS external_id        TEXT        NULL,
  ADD COLUMN IF NOT EXISTS avg_speed_mps      NUMERIC(5,2) NULL,
  ADD COLUMN IF NOT EXISTS elevation_gain_m   INTEGER     NULL;

-- Idempotencia: si Strava reintenta el webhook, no debemos duplicar la corrida.
-- Usamos UNIQUE constraint (no índice parcial) para que Supabase JS pueda
-- referenciarla en `.upsert({ onConflict: 'external_provider,external_id' })`.
-- Postgres trata (NULL, NULL) como filas distintas, así que las sesiones
-- manuales (que tienen ambas columnas en NULL) siguen pudiendo coexistir.
ALTER TABLE running_sessions
  DROP CONSTRAINT IF EXISTS uq_running_sessions_external;
DROP INDEX IF EXISTS idx_running_sessions_external;
ALTER TABLE running_sessions
  ADD CONSTRAINT uq_running_sessions_external UNIQUE (external_provider, external_id);

-- ── 3. RLS (consistente con el resto del módulo PT) ──────────────────────────
ALTER TABLE strava_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_strava_connections"
  ON strava_connections USING (true) WITH CHECK (true);
