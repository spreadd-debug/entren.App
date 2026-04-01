-- Add monthly_price column to gym_subscriptions
-- This allows setting a custom price per subscription instead of hardcoded plan tiers

ALTER TABLE gym_subscriptions
ADD COLUMN IF NOT EXISTS monthly_price numeric DEFAULT NULL;

COMMENT ON COLUMN gym_subscriptions.monthly_price IS 'Monthly subscription price in ARS. NULL means not set.';
