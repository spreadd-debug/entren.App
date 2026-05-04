-- ══════════════════════════════════════════════════════════════════════════════
-- entrenApp: Garmin Connect integration (Personal Life Tracker)
--
-- Reemplaza Strava como fuente de actividades personales del superadmin y
-- agrega 2 áreas nuevas que Strava no daba: sleep stages y daily metrics
-- (steps, calorías totales, HR rest, stress, body battery).
--
-- Usa la lib unofficial `garmin-connect` (Pythe1337N en npm) que se loguea
-- con email+password. Las credenciales se guardan encriptadas con AES-256-GCM
-- usando GARMIN_CREDS_SECRET.
--
-- Ejecutar en Supabase SQL Editor.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. personal_activities: ampliar source check para aceptar 'garmin' ──────
ALTER TABLE personal_activities
  DROP CONSTRAINT IF EXISTS personal_activities_source_check;
ALTER TABLE personal_activities
  ADD CONSTRAINT personal_activities_source_check
  CHECK (source IN ('manual', 'strava', 'garmin'));

-- ── 2. garmin_connections ────────────────────────────────────────────────────
-- Una fila por personal_profile. Credenciales encriptadas (no plaintext).
CREATE TABLE IF NOT EXISTS garmin_connections (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id         UUID        NOT NULL UNIQUE
                     REFERENCES personal_profiles(id) ON DELETE CASCADE,
  email_encrypted    TEXT        NOT NULL,        -- AES-256-GCM ciphertext (base64)
  email_iv           TEXT        NOT NULL,        -- IV (base64)
  email_tag          TEXT        NOT NULL,        -- GCM auth tag (base64)
  password_encrypted TEXT        NOT NULL,
  password_iv        TEXT        NOT NULL,
  password_tag       TEXT        NOT NULL,
  display_name       TEXT        NULL,            -- nombre del usuario Garmin (para UI)
  last_sync_at       TIMESTAMPTZ NULL,
  last_sync_error    TEXT        NULL,
  connected_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. personal_sleep ────────────────────────────────────────────────────────
-- Un row por noche (sleep_date = fecha del despertar).
CREATE TABLE IF NOT EXISTS personal_sleep (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID        NOT NULL REFERENCES personal_profiles(id) ON DELETE CASCADE,
  sleep_date          DATE        NOT NULL,
  start_at            TIMESTAMPTZ NULL,
  end_at              TIMESTAMPTZ NULL,
  total_seconds       INTEGER     NULL,
  deep_seconds        INTEGER     NULL,
  light_seconds       INTEGER     NULL,
  rem_seconds         INTEGER     NULL,
  awake_seconds       INTEGER     NULL,
  sleep_score         INTEGER     NULL,            -- 0–100 (Garmin's overall score)
  avg_hr_bpm          INTEGER     NULL,
  avg_hrv_ms          INTEGER     NULL,
  body_battery_change INTEGER     NULL,            -- delta de body battery durante la noche
  raw                 JSONB       NULL,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, sleep_date)
);
CREATE INDEX IF NOT EXISTS idx_personal_sleep_profile_date
  ON personal_sleep (profile_id, sleep_date DESC);

-- ── 4. personal_daily_metrics ────────────────────────────────────────────────
-- Un row por día calendario.
CREATE TABLE IF NOT EXISTS personal_daily_metrics (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id               UUID        NOT NULL REFERENCES personal_profiles(id) ON DELETE CASCADE,
  metric_date              DATE        NOT NULL,
  steps                    INTEGER     NULL,
  steps_goal               INTEGER     NULL,
  total_kcal               INTEGER     NULL,    -- BMR + active
  active_kcal              INTEGER     NULL,
  bmr_kcal                 INTEGER     NULL,
  resting_hr_bpm           INTEGER     NULL,
  max_hr_bpm               INTEGER     NULL,
  avg_stress               INTEGER     NULL,    -- 0–100
  body_battery_high        INTEGER     NULL,
  body_battery_low         INTEGER     NULL,
  body_battery_current     INTEGER     NULL,
  intensity_minutes        INTEGER     NULL,
  raw                      JSONB       NULL,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, metric_date)
);
CREATE INDEX IF NOT EXISTS idx_personal_daily_metrics_profile_date
  ON personal_daily_metrics (profile_id, metric_date DESC);

-- ── 5. RLS permisivo (consistente con el resto del repo) ─────────────────────
ALTER TABLE garmin_connections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_sleep          ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_daily_metrics  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_garmin_connections"     ON garmin_connections      USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_personal_sleep"         ON personal_sleep          USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_personal_daily_metrics" ON personal_daily_metrics  USING (true) WITH CHECK (true);

-- ── 6. Cleanup de la conexión Strava personal (si la creaste durante pruebas)
-- Las funciones backend de Strava personal quedan en código por reversibilidad,
-- pero la conexión activa la borramos para evitar imports duplicados con Garmin.
DELETE FROM strava_connections WHERE owner_kind = 'personal';
