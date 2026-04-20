-- ─── Columna `source` en client_goals ────────────────────────────────────────
-- Distingue goals creados manualmente desde GoalsPanel vs los auto-creados
-- al guardar el PlanProfileWizard. El único wizard-goal por alumno se
-- upsertea desde el cliente tras guardar el plan profile.

ALTER TABLE client_goals
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
  CHECK (source IN ('manual', 'plan_wizard'));

-- Un solo wizard-goal por alumno (habilita el upsert por student_id + source)
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_goals_wizard_unique
  ON client_goals(student_id)
  WHERE source = 'plan_wizard';
