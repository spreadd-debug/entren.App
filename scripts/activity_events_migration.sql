-- ============================================================
-- entrenApp: Gym activity events (instrumentación de onboarding/retención)
-- Tabla genérica de eventos por gym. Se usa para:
--  - Retención D1 / D7 / D30 (cohortes por fecha de registro)
--  - Drop-off del funnel de activación
--  - Time to first value por evento específico
-- Run this ONCE in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS gym_activity_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id     TEXT,
  event_type  TEXT        NOT NULL,
  event_data  JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para las queries típicas del SuperAdmin
CREATE INDEX IF NOT EXISTS idx_gym_activity_events_gym_type
  ON gym_activity_events (gym_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gym_activity_events_type_date
  ON gym_activity_events (event_type, created_at DESC);

-- Evita duplicar logins del mismo gym en el mismo día calendario (UTC),
-- para que el conteo de retención sea por-día-único sin tener que deduplicar
-- en el cliente.
CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_activity_events_login_daily_unique
  ON gym_activity_events (gym_id, event_type, (DATE(created_at)))
  WHERE event_type = 'login';

-- Evita registrar dos veces el mismo "first_*" para un gym.
CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_activity_events_firsts_unique
  ON gym_activity_events (gym_id, event_type)
  WHERE event_type IN ('gym_registered', 'first_student_created', 'first_payment_registered', 'gym_activated');
