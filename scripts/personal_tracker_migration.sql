-- ══════════════════════════════════════════════════════════════════════════════
-- entrenApp: Personal Life Tracker (superadmin)
--
-- Tablas dedicadas para que el superadmin trackee su propia vida:
-- workouts (manual + Strava), comidas, expensas, métricas corporales.
-- Sin acoplar al concepto de student/gym.
--
-- También extiende strava_connections con owner_kind/owner_id para soportar
-- conexiones personales (no solo de alumnos).
--
-- Ejecutar en Supabase SQL Editor.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. personal_profiles ─────────────────────────────────────────────────────
-- Una fila por usuario superadmin. Settings (peso, altura, moneda) que el
-- tracker necesita (ej. cálculo de kcal por MET).
CREATE TABLE IF NOT EXISTS personal_profiles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT        NOT NULL UNIQUE,            -- 'Dhitrent4' (currentUser.id)
  display_name  TEXT        NULL,
  weight_kg     NUMERIC(5,2) NULL,
  height_cm     NUMERIC(5,1) NULL,
  birth_date    DATE        NULL,
  timezone      TEXT        NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  currency      TEXT        NOT NULL DEFAULT 'ARS',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. personal_activities ───────────────────────────────────────────────────
-- Workouts: manual o importadas desde Strava.
CREATE TABLE IF NOT EXISTS personal_activities (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID        NOT NULL REFERENCES personal_profiles(id) ON DELETE CASCADE,
  source            TEXT        NOT NULL DEFAULT 'manual'
                    CHECK (source IN ('manual', 'strava')),
  external_id       TEXT        NULL,                   -- strava activity id
  sport_type        TEXT        NOT NULL,               -- 'run' | 'tennis' | 'trail_run' | 'virtual_run' | ...
  started_at        TIMESTAMPTZ NOT NULL,
  duration_seconds  INTEGER     NULL,
  distance_km       NUMERIC(7,2) NULL,
  avg_hr_bpm        INTEGER     NULL,
  elevation_gain_m  INTEGER     NULL,
  calories_kcal     INTEGER     NULL,                   -- estimado por MET si Strava no lo da
  notes             TEXT        NULL,
  raw               JSONB       NULL,                   -- payload original Strava (debug)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotencia para Strava (ver patrón en strava_integration_migration.sql)
ALTER TABLE personal_activities
  DROP CONSTRAINT IF EXISTS uq_personal_activities_external;
ALTER TABLE personal_activities
  ADD CONSTRAINT uq_personal_activities_external UNIQUE (source, external_id);

CREATE INDEX IF NOT EXISTS idx_personal_activities_profile_started
  ON personal_activities (profile_id, started_at DESC);

-- ── 3. personal_meals + personal_meal_foods ──────────────────────────────────
-- Diario de comidas (self-tracking, sin plan prescrito por PT).
CREATE TABLE IF NOT EXISTS personal_meals (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID        NOT NULL REFERENCES personal_profiles(id) ON DELETE CASCADE,
  consumed_at   TIMESTAMPTZ NOT NULL,
  meal_type     TEXT        NULL,                       -- 'desayuno' | 'almuerzo' | ... | 'snack'
  name          TEXT        NULL,
  calories      INTEGER     NULL,
  protein_g     NUMERIC(6,1) NULL,
  carbs_g       NUMERIC(6,1) NULL,
  fat_g         NUMERIC(6,1) NULL,
  fiber_g       NUMERIC(6,1) NULL,
  notes         TEXT        NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_meals_profile_consumed
  ON personal_meals (profile_id, consumed_at DESC);

CREATE TABLE IF NOT EXISTS personal_meal_foods (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id       UUID        NOT NULL REFERENCES personal_meals(id) ON DELETE CASCADE,
  food_name     TEXT        NOT NULL,
  amount        NUMERIC     NULL,
  unit          TEXT        NULL,                       -- 'g' | 'ml' | 'unidad' | ...
  calories      INTEGER     NULL,
  protein_g     NUMERIC(6,1) NULL,
  carbs_g       NUMERIC(6,1) NULL,
  fat_g         NUMERIC(6,1) NULL,
  order_index   INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. personal_expense_categories + personal_expenses ───────────────────────
CREATE TABLE IF NOT EXISTS personal_expense_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        NOT NULL REFERENCES personal_profiles(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  icon        TEXT        NULL,                         -- nombre icon lucide-react
  color       TEXT        NULL,                         -- hex
  archived    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, name)
);

CREATE TABLE IF NOT EXISTS personal_expenses (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID        NOT NULL REFERENCES personal_profiles(id) ON DELETE CASCADE,
  category_id   UUID        NULL REFERENCES personal_expense_categories(id) ON DELETE SET NULL,
  spent_at      DATE        NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  currency      TEXT        NOT NULL DEFAULT 'ARS',
  description   TEXT        NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_expenses_profile_spent
  ON personal_expenses (profile_id, spent_at DESC);

-- ── 5. personal_body_metrics ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS personal_body_metrics (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID        NOT NULL REFERENCES personal_profiles(id) ON DELETE CASCADE,
  measured_at   DATE        NOT NULL,
  weight_kg     NUMERIC(5,2) NULL,
  body_fat_pct  NUMERIC(4,1) NULL,
  waist_cm      NUMERIC(5,1) NULL,
  notes         TEXT        NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_body_metrics_profile_measured
  ON personal_body_metrics (profile_id, measured_at DESC);

-- ── 6. RLS (consistente con el resto del repo: policies permisivas) ──────────
ALTER TABLE personal_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_activities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_meals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_meal_foods          ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_expense_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_expenses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_body_metrics        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_personal_profiles"           ON personal_profiles            USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_personal_activities"         ON personal_activities          USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_personal_meals"              ON personal_meals               USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_personal_meal_foods"         ON personal_meal_foods          USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_personal_expense_categories" ON personal_expense_categories  USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_personal_expenses"           ON personal_expenses            USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_personal_body_metrics"       ON personal_body_metrics        USING (true) WITH CHECK (true);

-- ── 7. strava_connections: soporte para owner_kind=personal ──────────────────
-- Hoy strava_connections está acoplada a students (NOT NULL UNIQUE student_id).
-- Para que el superadmin pueda conectar su propio Strava:
--   • owner_kind='student' (default): student_id obligatorio (flujo actual)
--   • owner_kind='personal':           owner_id apunta a personal_profiles.id
ALTER TABLE strava_connections
  ADD COLUMN IF NOT EXISTS owner_kind TEXT NOT NULL DEFAULT 'student'
    CHECK (owner_kind IN ('student', 'personal'));

ALTER TABLE strava_connections
  ADD COLUMN IF NOT EXISTS owner_id UUID NULL;

-- student_id pasa a ser opcional, pero requerido cuando owner_kind='student'.
-- gym_id también pasa a ser opcional para conexiones personales.
ALTER TABLE strava_connections
  ALTER COLUMN student_id DROP NOT NULL;

ALTER TABLE strava_connections
  ALTER COLUMN gym_id DROP NOT NULL;

-- Backfill: filas existentes son todas de students.
UPDATE strava_connections
   SET owner_kind = 'student',
       owner_id   = student_id
 WHERE owner_id IS NULL;

-- Constraint: coherencia entre owner_kind y columnas pobladas.
ALTER TABLE strava_connections
  DROP CONSTRAINT IF EXISTS chk_strava_connections_owner;
ALTER TABLE strava_connections
  ADD CONSTRAINT chk_strava_connections_owner CHECK (
    (owner_kind = 'student'  AND student_id IS NOT NULL AND gym_id IS NOT NULL) OR
    (owner_kind = 'personal' AND owner_id   IS NOT NULL)
  );

-- Índice para lookup por owner.
CREATE INDEX IF NOT EXISTS idx_strava_connections_owner
  ON strava_connections (owner_kind, owner_id);
