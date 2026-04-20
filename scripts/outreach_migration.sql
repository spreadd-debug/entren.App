-- ============================================================
-- entrenApp: SuperAdmin Outreach Tracking
-- Tabla para registro diario de cold outreach a gyms potenciales.
-- Las métricas derivadas (tasa de respuesta, conversación) se calculan
-- en cliente a partir de estos contadores.
-- Run this ONCE in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS outreach_daily_logs (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  date                    DATE        NOT NULL UNIQUE,
  messages_sent           INTEGER     NOT NULL DEFAULT 0 CHECK (messages_sent           >= 0),
  replies_received        INTEGER     NOT NULL DEFAULT 0 CHECK (replies_received        >= 0),
  conversations_started   INTEGER     NOT NULL DEFAULT 0 CHECK (conversations_started   >= 0),
  demos_scheduled         INTEGER     NOT NULL DEFAULT 0 CHECK (demos_scheduled         >= 0),
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_daily_logs_date
  ON outreach_daily_logs (date DESC);

-- Trigger para mantener updated_at al día
CREATE OR REPLACE FUNCTION outreach_daily_logs_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_outreach_daily_logs_updated_at ON outreach_daily_logs;
CREATE TRIGGER trg_outreach_daily_logs_updated_at
  BEFORE UPDATE ON outreach_daily_logs
  FOR EACH ROW EXECUTE FUNCTION outreach_daily_logs_touch_updated_at();
