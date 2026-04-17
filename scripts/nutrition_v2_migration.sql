-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Nutrition v2
--
-- Reemplaza el schema de nutrición original (nutrition_plans + nutrition_items).
-- Confirmado con el usuario que las tablas legacy están vacías (0 rows),
-- por lo que el DROP es destructivo sin backup.
--
-- Cambios vs. v1:
--   • nutrition_plans: se agregan detail_level, flags show_*, snapshot TMB (9 cols)
--   • nutrition_plan_meals: nueva tabla — comidas del día con macros agregados
--   • nutrition_plan_foods: nueva tabla — alimentos específicos por comida
--   • nutrition_checkins: nueva tabla — adherencia del alumno por comida/día
--
-- Ejecutar en Supabase SQL Editor.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 0. Drop legacy (confirmado vacío) ────────────────────────────────────────

DROP TABLE IF EXISTS nutrition_items CASCADE;
DROP TABLE IF EXISTS nutrition_plans CASCADE;

-- ── 1. nutrition_plans ───────────────────────────────────────────────────────

CREATE TABLE nutrition_plans (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id              UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id          UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title               TEXT        NOT NULL,
  description         TEXT        NULL,

  detail_level        TEXT        NOT NULL DEFAULT 'macros'
                      CHECK (detail_level IN ('macros', 'meals', 'detailed')),

  -- Targets diarios
  calories_target     INTEGER     NULL,
  protein_g           INTEGER     NULL,
  carbs_g             INTEGER     NULL,
  fat_g               INTEGER     NULL,
  fiber_g             INTEGER     NULL,
  water_ml            INTEGER     NULL,

  -- Flags de visibilidad para el alumno
  show_calories       BOOLEAN     NOT NULL DEFAULT TRUE,
  show_protein        BOOLEAN     NOT NULL DEFAULT TRUE,
  show_carbs          BOOLEAN     NOT NULL DEFAULT TRUE,
  show_fat            BOOLEAN     NOT NULL DEFAULT TRUE,
  show_fiber          BOOLEAN     NOT NULL DEFAULT FALSE,
  show_water          BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Snapshot de la calculadora TMB (valores usados al armar el plan)
  tmb_kcal            INTEGER     NULL,
  tdee_kcal           INTEGER     NULL,
  activity_level      TEXT        NULL
                      CHECK (activity_level IS NULL OR activity_level IN
                        ('sedentary', 'light', 'moderate', 'high', 'very_high')),
  tmb_goal_type       TEXT        NULL
                      CHECK (tmb_goal_type IS NULL OR tmb_goal_type IN
                        ('lose_fat', 'maintain', 'gain_muscle')),
  goal_adjustment_pct INTEGER     NULL,
  calc_weight_kg      NUMERIC     NULL,
  calc_height_cm      NUMERIC     NULL,
  calc_age            INTEGER     NULL,
  calc_biological_sex TEXT        NULL
                      CHECK (calc_biological_sex IS NULL OR calc_biological_sex IN ('male', 'female')),

  status              TEXT        NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'archived')),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. nutrition_plan_meals ──────────────────────────────────────────────────

CREATE TABLE nutrition_plan_meals (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id         UUID        NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,

  day_of_week     INTEGER     NULL
                  CHECK (day_of_week IS NULL OR (day_of_week BETWEEN 0 AND 6)),  -- 0=Dom .. 6=Sáb, NULL = todos los días
  meal_type       TEXT        NOT NULL,       -- 'desayuno' | 'media_mañana' | 'almuerzo' | 'merienda' | 'cena' | 'pre_entreno' | 'post_entreno' | 'snack'
  order_index     INTEGER     NOT NULL DEFAULT 0,
  name            TEXT        NULL,
  time_hint       TEXT        NULL,           -- ej: "08:00"

  -- Macros agregados de la comida (para nivel 'meals') o sumatoria de foods (para 'detailed')
  calories        INTEGER     NULL,
  protein_g       INTEGER     NULL,
  carbs_g         INTEGER     NULL,
  fat_g           INTEGER     NULL,

  notes           TEXT        NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. nutrition_plan_foods ──────────────────────────────────────────────────

CREATE TABLE nutrition_plan_foods (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_id         UUID        NOT NULL REFERENCES nutrition_plan_meals(id) ON DELETE CASCADE,

  food_name       TEXT        NOT NULL,
  amount          NUMERIC     NULL,
  unit            TEXT        NULL,           -- 'g' | 'ml' | 'unidad' | 'taza' | 'cda' | 'cdita' | 'porcion'
  calories        INTEGER     NULL,
  protein_g       INTEGER     NULL,
  carbs_g         INTEGER     NULL,
  fat_g           INTEGER     NULL,
  notes           TEXT        NULL,
  order_index     INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. nutrition_checkins — adherencia del alumno ────────────────────────────

CREATE TABLE nutrition_checkins (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id          UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id      UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  plan_id         UUID        NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,

  -- meal_id NULL = check-in diario global (usado cuando el plan es detail_level='macros' sin meals)
  meal_id         UUID        NULL REFERENCES nutrition_plan_meals(id) ON DELETE CASCADE,

  checkin_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  completed       BOOLEAN     NOT NULL DEFAULT FALSE,
  notes           TEXT        NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique por comida (cuando meal_id existe) y uno global diario por plan (cuando meal_id IS NULL)
CREATE UNIQUE INDEX idx_nutrition_checkins_meal_unique
  ON nutrition_checkins(student_id, meal_id, checkin_date)
  WHERE meal_id IS NOT NULL;

CREATE UNIQUE INDEX idx_nutrition_checkins_daily_unique
  ON nutrition_checkins(student_id, plan_id, checkin_date)
  WHERE meal_id IS NULL;

-- ── 5. RLS ───────────────────────────────────────────────────────────────────
-- TODO(tech-debt): actualmente usamos policies permisivas como el resto del repo.
-- Migrar a policies reales por gym_id cuando se encare la deuda técnica global de RLS.

ALTER TABLE nutrition_plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_plan_meals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_plan_foods   ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_checkins     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_nutrition_plans"       ON nutrition_plans        USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_nutrition_plan_meals"  ON nutrition_plan_meals   USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_nutrition_plan_foods"  ON nutrition_plan_foods   USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_nutrition_checkins"    ON nutrition_checkins     USING (true) WITH CHECK (true);

-- ── 6. Índices ───────────────────────────────────────────────────────────────

CREATE INDEX idx_nutrition_plans_student_status
  ON nutrition_plans(student_id, status);

CREATE INDEX idx_nutrition_plan_meals_plan
  ON nutrition_plan_meals(plan_id, day_of_week, order_index);

CREATE INDEX idx_nutrition_plan_foods_meal
  ON nutrition_plan_foods(meal_id, order_index);

CREATE INDEX idx_nutrition_checkins_student_date
  ON nutrition_checkins(student_id, checkin_date DESC);

CREATE INDEX idx_nutrition_checkins_plan_date
  ON nutrition_checkins(plan_id, checkin_date DESC);
