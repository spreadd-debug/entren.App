-- ============================================================
-- entrenApp: Gym Subscription Management
-- Run this in the Supabase SQL Editor
-- ============================================================

-- gym_subscriptions: one record per gym, tracks commercial status
CREATE TABLE IF NOT EXISTS gym_subscriptions (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id               UUID        NOT NULL UNIQUE,
  plan_tier            TEXT        NOT NULL DEFAULT 'starter'
                                   CHECK (plan_tier IN ('starter', 'pro', 'business')),
  status               TEXT        NOT NULL DEFAULT 'trial'
                                   CHECK (status IN ('trial', 'active', 'past_due', 'suspended', 'cancelled')),
  trial_ends_at        TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  grace_period_days    INTEGER     NOT NULL DEFAULT 7,
  grace_period_ends_at TIMESTAMPTZ,
  access_enabled       BOOLEAN     NOT NULL DEFAULT TRUE,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- gym_billing_payments: manual payment log per gym
CREATE TABLE IF NOT EXISTS gym_billing_payments (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id         UUID           NOT NULL,
  amount         NUMERIC(10, 2) NOT NULL,
  currency       TEXT           NOT NULL DEFAULT 'ARS',
  period_start   DATE           NOT NULL,
  period_end     DATE           NOT NULL,
  payment_method TEXT           NOT NULL DEFAULT 'transfer'
                                CHECK (payment_method IN ('transfer', 'cash', 'mercadopago', 'other')),
  reference      TEXT,
  notes          TEXT,
  recorded_by    TEXT,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on gym_subscriptions
CREATE OR REPLACE FUNCTION update_gym_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS gym_subscriptions_updated_at ON gym_subscriptions;
CREATE TRIGGER gym_subscriptions_updated_at
  BEFORE UPDATE ON gym_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_gym_subscriptions_updated_at();

-- Seed default trial subscription for the demo gym
-- (safe to run multiple times due to ON CONFLICT DO NOTHING)
INSERT INTO gym_subscriptions (gym_id, plan_tier, status, trial_ends_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'starter',
  'trial',
  NOW() + INTERVAL '30 days'
)
ON CONFLICT (gym_id) DO NOTHING;

