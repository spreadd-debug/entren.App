-- ============================================================
-- entrenApp: WhatsApp Reminders — Plan tier rename migration
-- Run this ONCE in the Supabase SQL Editor
-- Renames: basic → starter, enterprise → business
-- ============================================================

-- 1. Drop the old constraint first (allows any value during the migration)
ALTER TABLE gym_subscriptions
  DROP CONSTRAINT IF EXISTS gym_subscriptions_plan_tier_check;

-- 2. Rename existing rows now that there's no constraint blocking
UPDATE gym_subscriptions SET plan_tier = 'starter'  WHERE plan_tier = 'basic';
UPDATE gym_subscriptions SET plan_tier = 'business' WHERE plan_tier = 'enterprise';

-- 3. Add the new constraint with updated tier names
ALTER TABLE gym_subscriptions
  ADD CONSTRAINT gym_subscriptions_plan_tier_check
  CHECK (plan_tier IN ('starter', 'pro', 'business'));

-- 4. Update the column default
ALTER TABLE gym_subscriptions
  ALTER COLUMN plan_tier SET DEFAULT 'starter';

-- ── Reminder tables (create if not already existing) ────────────────────────

-- reminder_rules: when to send a reminder relative to due date
CREATE TABLE IF NOT EXISTS reminder_rules (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id       UUID    NOT NULL,
  name         TEXT    NOT NULL,
  code         TEXT    NOT NULL,
  trigger_type TEXT    NOT NULL CHECK (trigger_type IN ('before', 'on_day', 'after')),
  offset_days  INTEGER NOT NULL DEFAULT 0,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- message_templates: WhatsApp message bodies per gym/rule
CREATE TABLE IF NOT EXISTS message_templates (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id     UUID    NOT NULL,
  title      TEXT    NOT NULL,
  code       TEXT    NOT NULL,
  body       TEXT    NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- reminder_logs: history of sent/pending/failed reminders
CREATE TABLE IF NOT EXISTS reminder_logs (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id          UUID    NOT NULL,
  student_id      UUID    NOT NULL,
  rule_code       TEXT    NOT NULL,
  scheduled_for   DATE    NOT NULL,
  sent_at         TIMESTAMPTZ,
  status          TEXT    NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  channel         TEXT    NOT NULL DEFAULT 'whatsapp'
                          CHECK (channel IN ('whatsapp', 'email')),
  message_preview TEXT,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS reminder_logs_gym_id_idx       ON reminder_logs (gym_id);
CREATE INDEX IF NOT EXISTS reminder_logs_student_id_idx   ON reminder_logs (student_id);
CREATE INDEX IF NOT EXISTS reminder_logs_scheduled_for_idx ON reminder_logs (scheduled_for);
