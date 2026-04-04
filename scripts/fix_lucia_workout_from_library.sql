-- ══════════════════════════════════════════════════════════════════
-- FIX: Reemplazar rutina demo de Lucía con ejercicios reales de la librería
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- 1. Borrar asignación activa de Lucía
DELETE FROM student_workout_assignments
WHERE student_id = 'bbbb0001-0000-0000-0000-000000000001';

-- 2. Borrar ejercicios del plan demo hardcodeado
DELETE FROM workout_exercises
WHERE workout_plan_id = 'eeee0001-0000-0000-0000-000000000001';

-- 3. Borrar el plan demo hardcodeado
DELETE FROM workout_plans
WHERE id = 'eeee0001-0000-0000-0000-000000000001';

-- 4. Crear un nuevo plan de entrenamiento
INSERT INTO workout_plans (id, gym_id, name, description)
VALUES (
  'eeee0001-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'Fullbody desde Librería',
  'Rutina de cuerpo completo usando ejercicios de la librería del gimnasio.'
);

-- 5. Insertar 5 ejercicios de la librería.
--    Prioriza los que tienen video/imagen, luego ordena por nombre.
INSERT INTO workout_exercises (workout_plan_id, exercise_name, sets, reps, weight, video_url, exercise_library_id, exercise_order)
SELECT
  'eeee0001-0000-0000-0000-000000000002',
  el.name,
  3,
  '10-12',
  NULL,
  el.video_url,
  el.id,
  ROW_NUMBER() OVER (ORDER BY (el.video_url IS NOT NULL) DESC, el.name)
FROM exercise_library el
LIMIT 5;

-- 6. Asignar el nuevo plan a Lucía
INSERT INTO student_workout_assignments (gym_id, student_id, workout_plan_id, active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'bbbb0001-0000-0000-0000-000000000001',
  'eeee0001-0000-0000-0000-000000000002',
  true
);

-- Verificar resultado
SELECT
  wp.name AS plan,
  we.exercise_name,
  we.sets,
  we.reps,
  CASE WHEN we.video_url IS NOT NULL THEN '✓ tiene imagen' ELSE '✗ sin imagen' END AS media,
  CASE WHEN we.exercise_library_id IS NOT NULL THEN '✓ de librería' ELSE '✗ hardcodeado' END AS origen
FROM student_workout_assignments swa
JOIN workout_plans wp ON wp.id = swa.workout_plan_id
JOIN workout_exercises we ON we.workout_plan_id = wp.id
WHERE swa.student_id = 'bbbb0001-0000-0000-0000-000000000001'
ORDER BY we.exercise_order;
