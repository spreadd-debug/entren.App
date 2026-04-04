-- ══════════════════════════════════════════════════════════════════
-- DEMO GYM SEED DATA
-- gym_id: 11111111-1111-1111-1111-111111111111
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- Limpiar datos anteriores del gym demo (por si ya existían)
DELETE FROM payments  WHERE gym_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM students  WHERE gym_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM plans     WHERE gym_id = '11111111-1111-1111-1111-111111111111';

-- ── 1. PLANES ─────────────────────────────────────────────────────

INSERT INTO plans (id, gym_id, nombre, precio, duracion_dias, clases_por_semana, activo)
VALUES
  ('aaaa0001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Plan Básico',   8000,  30, 3, true),
  ('aaaa0001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Plan Full',    14000,  30, 6, true),
  ('aaaa0001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Plan Premium', 20000,  30, NULL, true);

-- ── 2. ALUMNOS ACTIVOS (10) ───────────────────────────────────────
-- status = 'activo', next_due_date en el futuro, cobra_cuota = true

INSERT INTO students (id, gym_id, plan_id, nombre, apellido, telefono, status, cobra_cuota, recordatorio_automatico, whatsapp_opt_in, last_payment_date, next_due_date, observaciones)
VALUES
  ('bbbb0001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000002', 'Lucía',    'Fernández', '1155001111', 'activo', true, true, true,  '2026-03-01', '2026-04-01', NULL),

  ('bbbb0001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000001', 'Matías',   'González',  '1155002222', 'activo', true, true, true,  '2026-03-05', '2026-04-05', NULL),

  ('bbbb0001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000003', 'Valentina','López',     '1155003333', 'activo', true, false, true, '2026-03-10', '2026-04-10', 'Paga en efectivo'),

  ('bbbb0001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000002', 'Sebastián','Martínez',  '1155004444', 'activo', true, true, true,  '2026-03-08', '2026-04-08', NULL),

  ('bbbb0001-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000001', 'Carolina', 'Rodríguez', '1155005555', 'activo', true, true, false, '2026-03-12', '2026-04-12', NULL),

  ('bbbb0001-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000003', 'Ignacio',  'Pérez',     '1155006666', 'activo', true, true, true,  '2026-03-03', '2026-04-03', 'Descuento docente'),

  ('bbbb0001-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000002', 'Florencia','García',    '1155007777', 'activo', true, true, true,  '2026-03-15', '2026-04-15', NULL),

  ('bbbb0001-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000001', 'Tomás',    'Sánchez',   '1155008888', 'activo', true, false, false,'2026-03-07', '2026-04-07', NULL),

  ('bbbb0001-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000003', 'Agustina', 'Torres',    '1155009999', 'activo', true, true, true,  '2026-03-20', '2026-04-20', NULL),

  ('bbbb0001-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000002', 'Nicolás',  'Díaz',      '1155010000', 'activo', true, true, true,  '2026-03-18', '2026-04-18', 'Alumno nuevo');

-- ── 3. ALUMNOS DEUDORES (10) ──────────────────────────────────────
-- status = 'activo', next_due_date en el PASADO (así aparecen como deudores)

INSERT INTO students (id, gym_id, plan_id, nombre, apellido, telefono, status, cobra_cuota, recordatorio_automatico, whatsapp_opt_in, last_payment_date, next_due_date, observaciones)
VALUES
  ('cccc0001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000001', 'Pablo',    'Romero',    '1166001111', 'activo', true, true, true,  '2026-01-05', '2026-02-05', 'No responde mensajes'),

  ('cccc0001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000002', 'Marina',   'Vargas',    '1166002222', 'activo', true, true, false, '2026-01-10', '2026-02-10', NULL),

  ('cccc0001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000001', 'Diego',    'Morales',   '1166003333', 'activo', true, false, true, '2026-01-15', '2026-02-15', 'Prometió pagar el viernes'),

  ('cccc0001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000003', 'Natalia',  'Jiménez',   '1166004444', 'activo', true, true, true,  '2025-12-20', '2026-01-20', '2 meses sin pagar'),

  ('cccc0001-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000002', 'Andrés',   'Herrera',   '1166005555', 'activo', true, true, false, '2026-02-01', '2026-03-01', NULL),

  ('cccc0001-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000001', 'Camila',   'Castro',    '1166006666', 'activo', true, true, true,  '2026-02-05', '2026-03-05', 'Beca parcial vigente'),

  ('cccc0001-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000003', 'Rodrigo',  'Ruiz',      '1166007777', 'activo', true, false, true, '2025-12-01', '2026-01-01', '3 meses de deuda'),

  ('cccc0001-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000002', 'Luciana',  'Ortiz',     '1166008888', 'activo', true, true, true,  '2026-01-25', '2026-02-25', NULL),

  ('cccc0001-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000001', 'Facundo',  'Mendoza',   '1166009999', 'activo', true, true, false, '2026-02-10', '2026-03-10', 'Lesionado, espera volver'),

  ('cccc0001-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111',
    'aaaa0001-0000-0000-0000-000000000002', 'Sofía',    'Reyes',     '1166010000', 'activo', true, true, true,  '2026-02-12', '2026-03-12', NULL);

-- ── 4. PAGOS RECIENTES (para los alumnos activos) ─────────────────

INSERT INTO payments (gym_id, student_id, monto, metodo_pago, fecha_pago, notes)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'bbbb0001-0000-0000-0000-000000000001', 14000, 'transferencia', '2026-03-01', NULL),
  ('11111111-1111-1111-1111-111111111111', 'bbbb0001-0000-0000-0000-000000000002',  8000, 'efectivo',      '2026-03-05', NULL),
  ('11111111-1111-1111-1111-111111111111', 'bbbb0001-0000-0000-0000-000000000003', 20000, 'transferencia', '2026-03-10', NULL),
  ('11111111-1111-1111-1111-111111111111', 'bbbb0001-0000-0000-0000-000000000004', 14000, 'mercado_pago',  '2026-03-08', NULL),
  ('11111111-1111-1111-1111-111111111111', 'bbbb0001-0000-0000-0000-000000000005',  8000, 'efectivo',      '2026-03-12', NULL),
  ('11111111-1111-1111-1111-111111111111', 'bbbb0001-0000-0000-0000-000000000006', 20000, 'transferencia', '2026-03-03', 'Precio especial docente'),
  ('11111111-1111-1111-1111-111111111111', 'bbbb0001-0000-0000-0000-000000000007', 14000, 'mercado_pago',  '2026-03-15', NULL),
  ('11111111-1111-1111-1111-111111111111', 'bbbb0001-0000-0000-0000-000000000008',  8000, 'efectivo',      '2026-03-07', NULL),
  ('11111111-1111-1111-1111-111111111111', 'bbbb0001-0000-0000-0000-000000000009', 20000, 'transferencia', '2026-03-20', NULL),
  ('11111111-1111-1111-1111-111111111111', 'bbbb0001-0000-0000-0000-000000000010', 14000, 'transferencia', '2026-03-18', 'Primer pago'),
  -- Pagos anteriores (historial)
  ('11111111-1111-1111-1111-111111111111', 'bbbb0001-0000-0000-0000-000000000001', 14000, 'transferencia', '2026-02-01', NULL),
  ('11111111-1111-1111-1111-111111111111', 'bbbb0001-0000-0000-0000-000000000003', 20000, 'transferencia', '2026-02-10', NULL),
  ('11111111-1111-1111-1111-111111111111', 'bbbb0001-0000-0000-0000-000000000006', 20000, 'transferencia', '2026-02-03', NULL),
  -- Último pago de los deudores (antes de caer en deuda)
  ('11111111-1111-1111-1111-111111111111', 'cccc0001-0000-0000-0000-000000000001',  8000, 'efectivo',      '2026-01-05', NULL),
  ('11111111-1111-1111-1111-111111111111', 'cccc0001-0000-0000-0000-000000000002', 14000, 'transferencia', '2026-01-10', NULL),
  ('11111111-1111-1111-1111-111111111111', 'cccc0001-0000-0000-0000-000000000004', 20000, 'mercado_pago',  '2025-12-20', NULL),
  ('11111111-1111-1111-1111-111111111111', 'cccc0001-0000-0000-0000-000000000007', 20000, 'efectivo',      '2025-12-01', NULL);

-- ── 5. PLAN DE ENTRENAMIENTO DEMO ──────────────────────────────────
-- Rutina asignada al primer alumno activo para mostrar en la vista del alumno

INSERT INTO workout_plans (id, gym_id, name, description)
VALUES (
  'eeee0001-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'Fullbody Principiante',
  'Rutina de cuerpo completo 3 veces por semana. Ideal para ganar base muscular.'
);

INSERT INTO workout_exercises (workout_plan_id, exercise_name, sets, reps, weight, video_url, exercise_order)
VALUES
  ('eeee0001-0000-0000-0000-000000000001', 'Sentadilla',          3, '12', '40 kg',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Squats.jpg/480px-Squats.jpg', 1),

  ('eeee0001-0000-0000-0000-000000000001', 'Press de banca',      3, '10', '50 kg',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Bench_press_arching.jpg/480px-Bench_press_arching.jpg', 2),

  ('eeee0001-0000-0000-0000-000000000001', 'Peso muerto',         3, '8',  '60 kg',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Conventional_deadlift.jpg/480px-Conventional_deadlift.jpg', 3),

  ('eeee0001-0000-0000-0000-000000000001', 'Remo con barra',      3, '10', '40 kg',
   NULL, 4),

  ('eeee0001-0000-0000-0000-000000000001', 'Plancha',             3, '30 seg', NULL,
   'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Plank_exercise.jpg/480px-Plank_exercise.jpg', 5);

-- Asignar la rutina al primer alumno activo (Juan García)
INSERT INTO student_workout_assignments (gym_id, student_id, workout_plan_id, active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'bbbb0001-0000-0000-0000-000000000001',
  'eeee0001-0000-0000-0000-000000000001',
  true
);

