-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Routine Builder v2 — Block-based routines with independent sets
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. routines ──────────────────────────────────────────────────────────────
-- Replaces workout_plans with richer metadata

CREATE TABLE IF NOT EXISTS routines (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id        UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  description   TEXT,
  is_template   BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── 2. routine_days ──────────────────────────────────────────────────────────
-- Multi-day routine support (Día 1, Día 2, etc.)

CREATE TABLE IF NOT EXISTS routine_days (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id  UUID    NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  label       TEXT    NOT NULL DEFAULT 'Día 1',
  "order"     INTEGER NOT NULL DEFAULT 0
);

-- ── 3. routine_blocks ────────────────────────────────────────────────────────
-- Groups exercises. Normal block = 1 exercise. Superset = 2+.

CREATE TABLE IF NOT EXISTS routine_blocks (
  id                    UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_day_id        UUID    NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
  block_type            TEXT    NOT NULL DEFAULT 'normal'
                                CHECK (block_type IN ('normal','superset','triset','circuit')),
  "order"               INTEGER NOT NULL DEFAULT 0,
  rest_after_block_sec  INTEGER
);

-- ── 4. routine_exercises ─────────────────────────────────────────────────────
-- Exercise within a block. Links to exercise_library for the catalog.

CREATE TABLE IF NOT EXISTS routine_exercises (
  id                    UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  block_id              UUID    NOT NULL REFERENCES routine_blocks(id) ON DELETE CASCADE,
  exercise_library_id   UUID    REFERENCES exercise_library(id) ON DELETE SET NULL,
  exercise_name         TEXT    NOT NULL,
  "order"               INTEGER NOT NULL DEFAULT 0,
  notes                 TEXT,
  rest_between_sets_sec INTEGER,
  tempo                 TEXT
);

-- ── 5. routine_sets ──────────────────────────────────────────────────────────
-- Each set is an independent row with its own values.

CREATE TABLE IF NOT EXISTS routine_sets (
  id                    UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_exercise_id   UUID    NOT NULL REFERENCES routine_exercises(id) ON DELETE CASCADE,
  set_number            INTEGER NOT NULL DEFAULT 1,
  set_type              TEXT    NOT NULL DEFAULT 'normal'
                                CHECK (set_type IN ('normal','warmup','dropset','failure','backoff')),
  reps                  INTEGER,
  reps_max              INTEGER,
  time_sec              INTEGER,
  weight_kg             REAL,
  weight_type           TEXT    NOT NULL DEFAULT 'absolute'
                                CHECK (weight_type IN ('absolute','bodyweight','rpe_target','percentage_1rm','band','not_specified')),
  rpe_target            REAL,
  rir_target            INTEGER,
  notes                 TEXT
);

-- ── 6. routine_assignments ───────────────────────────────────────────────────
-- Assigns a routine to a student with day mapping.

CREATE TABLE IF NOT EXISTS routine_assignments (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id  UUID        NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  student_id  UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  day_mapping JSONB       DEFAULT '{}'::jsonb,
  assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  active      BOOLEAN     NOT NULL DEFAULT true
);

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS Policies (permissive, same pattern as rest of project)
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE routines            ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_days        ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_blocks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises   ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_sets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_routines"            ON routines            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_routine_days"        ON routine_days        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_routine_blocks"      ON routine_blocks      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_routine_exercises"   ON routine_exercises   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_routine_sets"        ON routine_sets        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_routine_assignments" ON routine_assignments FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- Performance indexes
-- ═══���══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_routines_gym          ON routines(gym_id);
CREATE INDEX IF NOT EXISTS idx_routine_days_routine   ON routine_days(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_blocks_day     ON routine_blocks(routine_day_id);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_block ON routine_exercises(block_id);
CREATE INDEX IF NOT EXISTS idx_routine_sets_exercise   ON routine_sets(routine_exercise_id);
CREATE INDEX IF NOT EXISTS idx_routine_assignments_routine ON routine_assignments(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_assignments_student ON routine_assignments(student_id);
