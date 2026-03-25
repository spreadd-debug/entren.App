-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Días de la semana por rutina + Índice de adherencia
-- Ejecutar en Supabase SQL Editor DESPUÉS de workout_sessions_migration.sql
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Días de la semana por asignación ───────────────────────────────────────
-- Permite asignar una rutina a días específicos (0=Dom, 1=Lun, ..., 6=Sáb)
-- NULL = sin restricción de día (el alumno puede usarla cualquier día)

ALTER TABLE student_workout_assignments
  ADD COLUMN IF NOT EXISTS days_of_week INTEGER[] DEFAULT NULL;

COMMENT ON COLUMN student_workout_assignments.days_of_week
  IS 'Días habilitados para esta rutina (0=Dom..6=Sáb). NULL = sin restricción.';

-- ── 2. Índice para consultas por gym_id ──────────────────────────────────────
-- Mejora la carga del tab "Alumnos" en WorkoutPlansView

CREATE INDEX IF NOT EXISTS idx_workout_sessions_gym_date
  ON workout_sessions(gym_id, session_date);
