-- ══════════════════════════════════════════════════════════════════════════════
-- entrenApp: Personal Finance — Fase 2 (tarjetas de crédito + statements)
--
-- Las tarjetas son entidades propias (no se reusa personal_accounts).
-- Cada compra con tarjeta vive en personal_transactions con credit_card_id +
-- statement_id, y NO afecta el balance de ninguna cuenta hasta que se paga
-- el resumen (ahí sí, una transacción 'expense' desde la cuenta elegida sale
-- y actualiza statement.paid_amount).
--
-- Statements se crean lazy: la primera transacción con tarjeta de un período
-- crea el statement correspondiente. No hace falta cron para pre-crearlos.
--
-- Cuotas (compras en N) quedan FUERA de esta fase — Fase 3.
--
-- Ejecutar en Supabase SQL Editor.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. personal_credit_cards ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS personal_credit_cards (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID        NOT NULL REFERENCES personal_profiles(id) ON DELETE CASCADE,
  name                TEXT        NOT NULL,                  -- 'Visa Galicia', 'Amex Black', ...
  bank                TEXT        NULL,                      -- 'Galicia', 'Santander', 'Brubank', ...
  last_4              TEXT        NULL,                      -- últimos 4 dígitos para display ('•••• 1234')
  currency            TEXT        NOT NULL DEFAULT 'ARS',
  credit_limit        NUMERIC(14,2) NULL,
  -- Ciclo de facturación (día del mes, 1..31)
  closing_day         INTEGER     NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day             INTEGER     NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  -- Cuenta default desde la que se paga el resumen
  pay_from_account_id UUID        NULL REFERENCES personal_accounts(id) ON DELETE SET NULL,
  -- Visual (gradient para la card física)
  color_a             TEXT        NULL,
  color_b             TEXT        NULL,
  archived            BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order          INTEGER     NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_credit_cards_profile_sort
  ON personal_credit_cards (profile_id, archived, sort_order);

-- ── 2. personal_card_statements ──────────────────────────────────────────────
-- Un row por (card, período de facturación). Se crea lazy al asignar la
-- primera transacción del período. status:
--   - open:     todavía no cerró el ciclo
--   - closed:   ya cerró pero no se pagó aún
--   - partial:  pagado parcialmente
--   - paid:     pagado en su totalidad
CREATE TABLE IF NOT EXISTS personal_card_statements (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id       UUID        NOT NULL REFERENCES personal_credit_cards(id) ON DELETE CASCADE,
  profile_id    UUID        NOT NULL REFERENCES personal_profiles(id) ON DELETE CASCADE,
  period_start  DATE        NOT NULL,
  period_end    DATE        NOT NULL,                     -- closing_day del mes correspondiente
  due_date      DATE        NOT NULL,                     -- due_day del mes siguiente
  total_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,
  status        TEXT        NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'closed', 'partial', 'paid')),
  closed_at     TIMESTAMPTZ NULL,
  paid_at       TIMESTAMPTZ NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (card_id, period_end)
);

CREATE INDEX IF NOT EXISTS idx_personal_card_statements_card_period
  ON personal_card_statements (card_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_personal_card_statements_due
  ON personal_card_statements (profile_id, due_date)
  WHERE status IN ('closed', 'partial');

-- ── 3. personal_transactions: linkear a tarjeta y statement ──────────────────
ALTER TABLE personal_transactions
  ADD COLUMN IF NOT EXISTS credit_card_id UUID NULL
    REFERENCES personal_credit_cards(id) ON DELETE SET NULL;
ALTER TABLE personal_transactions
  ADD COLUMN IF NOT EXISTS statement_id UUID NULL
    REFERENCES personal_card_statements(id) ON DELETE SET NULL;

-- account_id pasa a opcional: las compras con tarjeta NO tienen account
-- asociada hasta que se paga el resumen (donde se crea OTRA transacción
-- con account_id apuntando a la cuenta que pagó).
ALTER TABLE personal_transactions
  ALTER COLUMN account_id DROP NOT NULL;

-- Constraint: una transacción debe tener O account_id O credit_card_id
-- (al menos uno de los dos).
ALTER TABLE personal_transactions
  DROP CONSTRAINT IF EXISTS chk_transactions_has_origin;
ALTER TABLE personal_transactions
  ADD CONSTRAINT chk_transactions_has_origin
  CHECK (account_id IS NOT NULL OR credit_card_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_personal_transactions_card
  ON personal_transactions (credit_card_id, occurred_at DESC)
  WHERE credit_card_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_personal_transactions_statement
  ON personal_transactions (statement_id) WHERE statement_id IS NOT NULL;

-- ── 4. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE personal_credit_cards     ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_card_statements  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_personal_credit_cards"    ON personal_credit_cards    USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_personal_card_statements" ON personal_card_statements USING (true) WITH CHECK (true);
