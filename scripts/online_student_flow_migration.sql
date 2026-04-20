-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Online Student Flow
-- - Marca alumnos PT que entrenan 100% online (pueden loggear sus propias sesiones).
-- - Agrega logged_by en session_sets para distinguir sets cargados por el PT vs
--   por el alumno desde el portal.
-- Ejecutar en Supabase SQL Editor.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. students.is_online ────────────────────────────────────────────────────

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN students.is_online IS
  'True si el alumno entrena online: desde el portal puede iniciar sesión, loggear sets (peso/reps) y finalizarla. Solo relevante para gyms de tipo personal_trainer.';

-- ── 2. session_sets.logged_by ────────────────────────────────────────────────

ALTER TABLE session_sets
  ADD COLUMN IF NOT EXISTS logged_by TEXT NULL
    CHECK (logged_by IS NULL OR logged_by IN ('pt', 'student'));

COMMENT ON COLUMN session_sets.logged_by IS
  'Quién cargó este set: pt (profesor desde la sesión en vivo) o student (alumno online desde el portal). NULL para sets legacy previos a esta columna.';
