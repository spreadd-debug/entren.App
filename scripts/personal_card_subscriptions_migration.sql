-- ══════════════════════════════════════════════════════════════════════════════
-- entrenApp: Personal Finance — Pagos automáticos por tarjeta de crédito
--
-- Una "subscription" representa un débito recurrente (gym, Netflix, servicio,
-- etc.) que cae todos los meses en una tarjeta. El cron diario las
-- materializa: si hoy es >= day_of_month y todavía no se cargó este mes,
-- crea una transacción 'expense' con credit_card_id en el statement
-- correspondiente y marca last_charged_period = 'YYYY-MM' para idempotencia.
--
-- day_of_month limitado a 1..28 para evitar edge cases de meses cortos.
--
-- Ejecutar en Supabase SQL Editor.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS personal_card_subscriptions (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id           UUID          NOT NULL REFERENCES personal_profiles(id) ON DELETE CASCADE,
  credit_card_id       UUID          NOT NULL REFERENCES personal_credit_cards(id) ON DELETE CASCADE,
  category_id          UUID          NULL REFERENCES personal_categories(id) ON DELETE SET NULL,
  description          TEXT          NOT NULL,
  amount               NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency             TEXT          NOT NULL DEFAULT 'ARS',
  day_of_month         INTEGER       NOT NULL CHECK (day_of_month BETWEEN 1 AND 28),
  active               BOOLEAN       NOT NULL DEFAULT TRUE,
  -- 'YYYY-MM' del último período en el que se materializó. Idempotencia para
  -- el cron — si vuelve a correr el mismo mes, skipea.
  last_charged_period  TEXT          NULL,
  starts_on            DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_card_subscriptions_card
  ON personal_card_subscriptions (credit_card_id, active);
CREATE INDEX IF NOT EXISTS idx_personal_card_subscriptions_profile
  ON personal_card_subscriptions (profile_id, active);

-- subscription_id en personal_transactions: liga la tx materializada con la sub
-- que la generó. Útil para auditar y para evitar duplicados.
ALTER TABLE personal_transactions
  ADD COLUMN IF NOT EXISTS subscription_id UUID NULL
    REFERENCES personal_card_subscriptions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_personal_transactions_subscription
  ON personal_transactions (subscription_id) WHERE subscription_id IS NOT NULL;

-- RLS permisivo (consistente con el resto del repo).
ALTER TABLE personal_card_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_personal_card_subscriptions"
  ON personal_card_subscriptions USING (true) WITH CHECK (true);
