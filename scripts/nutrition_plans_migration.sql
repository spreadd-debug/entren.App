-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Nutrition Plans & Items
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. nutrition_plans — plan nutricional por alumno ─────────────────────────

CREATE TABLE IF NOT EXISTS nutrition_plans (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id          UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id      UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  description     TEXT        NULL,
  calories_target INTEGER     NULL,
  protein_g       INTEGER     NULL,
  carbs_g         INTEGER     NULL,
  fat_g           INTEGER     NULL,
  status          TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── 2. nutrition_items — alimentos/comidas sugeridos dentro de un plan ───────

CREATE TABLE IF NOT EXISTS nutrition_items (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id         UUID        NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
  meal_label      TEXT        NOT NULL,       -- "Desayuno", "Almuerzo", "Merienda", "Cena", "Snack"
  food_name       TEXT        NOT NULL,
  portion         TEXT        NULL,           -- "200g", "1 taza", "2 unidades"
  calories        INTEGER     NULL,
  protein_g       INTEGER     NULL,
  carbs_g         INTEGER     NULL,
  fat_g           INTEGER     NULL,
  notes           TEXT        NULL,
  item_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── 3. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_nutrition_plans"
  ON nutrition_plans USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_nutrition_items"
  ON nutrition_items USING (true) WITH CHECK (true);

-- ── 4. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_nutrition_plans_student
  ON nutrition_plans(student_id, status);

CREATE INDEX IF NOT EXISTS idx_nutrition_items_plan
  ON nutrition_items(plan_id, item_order);
