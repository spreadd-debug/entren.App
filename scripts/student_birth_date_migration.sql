-- ══════════════════════════════════════════════════════════════════════════════
-- entrenApp: birth_date global del alumno
-- Campo universal, reusable por nutrition (calc_age), running (HRmax/Tanaka)
-- y futuras integraciones. Nullable para no romper alumnos existentes.
-- Run this ONCE in the Supabase SQL Editor.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS birth_date DATE NULL
    CHECK (birth_date IS NULL OR birth_date BETWEEN '1900-01-01' AND CURRENT_DATE);
