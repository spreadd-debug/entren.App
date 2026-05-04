-- ══════════════════════════════════════════════════════════════════════════════
-- entrenApp: Personal Finance v2 (Fase 1 — Accounts + multi-currency)
--
-- Reemplaza el módulo simple de expensas (personal_expenses + categories) por
-- una foundation financiera real: cuentas con balance, transacciones tipadas
-- (income/expense/transfer), multi-moneda, y snapshots de cotizaciones para
-- conversión ARS↔USD via dolarapi.com.
--
-- DESTRUCTIVO: drops personal_expenses + personal_expense_categories.
-- Confirmado con el usuario que la data actual era de prueba.
--
-- Ejecutar en Supabase SQL Editor.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 0. Drop tablas viejas ────────────────────────────────────────────────────
DROP TABLE IF EXISTS personal_expenses CASCADE;
DROP TABLE IF EXISTS personal_expense_categories CASCADE;

-- ── 1. personal_accounts ─────────────────────────────────────────────────────
-- Cuentas donde vive la plata. current_balance se mantiene en sync vía service
-- (no trigger — más fácil de debuggear y de hacer rollback manual si algo falla).
CREATE TABLE IF NOT EXISTS personal_accounts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID        NOT NULL REFERENCES personal_profiles(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  kind            TEXT        NOT NULL DEFAULT 'cash'
                  CHECK (kind IN ('cash', 'bank', 'wallet', 'investment', 'other')),
  currency        TEXT        NOT NULL DEFAULT 'ARS',
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- Gradient para la UI: array de 2-3 hex colors (override del default por kind/currency)
  color_a         TEXT        NULL,
  color_b         TEXT        NULL,
  icon            TEXT        NULL,                -- nombre lucide
  archived        BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_accounts_profile_sort
  ON personal_accounts (profile_id, archived, sort_order);

-- ── 2. personal_categories ───────────────────────────────────────────────────
-- Categorías para clasificar transacciones. kind separa expense vs income para
-- no mezclarlas al mostrar en pickers.
CREATE TABLE IF NOT EXISTS personal_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        NOT NULL REFERENCES personal_profiles(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  kind        TEXT        NOT NULL DEFAULT 'expense'
              CHECK (kind IN ('expense', 'income')),
  icon        TEXT        NULL,                    -- nombre lucide
  color       TEXT        NULL,                    -- hex
  archived    BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, kind, name)
);

-- ── 3. personal_transactions ─────────────────────────────────────────────────
-- Tabla principal. kind = 'expense'|'income'|'transfer_out'|'transfer_in'.
-- Las transferencias son 2 rows linkeadas por transfer_group_id (un UUID
-- compartido). Si las cuentas son de monedas distintas, fx_rate guarda
-- el tipo de cambio aplicado.
CREATE TABLE IF NOT EXISTS personal_transactions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id         UUID        NOT NULL REFERENCES personal_profiles(id) ON DELETE CASCADE,
  account_id         UUID        NOT NULL REFERENCES personal_accounts(id) ON DELETE CASCADE,
  category_id        UUID        NULL REFERENCES personal_categories(id) ON DELETE SET NULL,
  kind               TEXT        NOT NULL
                     CHECK (kind IN ('expense', 'income', 'transfer_out', 'transfer_in')),
  amount             NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  currency           TEXT        NOT NULL,
  occurred_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  description        TEXT        NULL,
  transfer_group_id  UUID        NULL,             -- compartido entre las 2 patas de una transferencia
  fx_rate            NUMERIC(14,6) NULL,           -- tipo de cambio aplicado en transferencias multi-moneda
  raw                JSONB       NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_transactions_profile_occurred
  ON personal_transactions (profile_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_personal_transactions_account
  ON personal_transactions (account_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_personal_transactions_transfer_group
  ON personal_transactions (transfer_group_id) WHERE transfer_group_id IS NOT NULL;

-- ── 4. fx_rate_snapshots ─────────────────────────────────────────────────────
-- Cache de cotizaciones traídas de dolarapi.com. Un row por (captured_at, name).
-- Se persiste cada vez que el FxRateService hace un fetch fresco (TTL 1h en
-- memoria + un snapshot diario via cron para tener historial).
CREATE TABLE IF NOT EXISTS fx_rate_snapshots (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  source       TEXT        NOT NULL DEFAULT 'dolarapi',
  pair         TEXT        NOT NULL DEFAULT 'USD/ARS',
  name         TEXT        NOT NULL,                -- 'oficial' | 'blue' | 'mep' | 'ccl' | 'tarjeta' | ...
  buy          NUMERIC(14,4) NULL,
  sell         NUMERIC(14,4) NULL,
  raw          JSONB       NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fx_rate_snapshots_name_captured
  ON fx_rate_snapshots (name, captured_at DESC);

-- ── 5. personal_profiles: cotización preferida ───────────────────────────────
ALTER TABLE personal_profiles
  ADD COLUMN IF NOT EXISTS preferred_fx_name TEXT NOT NULL DEFAULT 'blue';

-- ── 6. RLS permisivo ─────────────────────────────────────────────────────────
ALTER TABLE personal_accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fx_rate_snapshots      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_personal_accounts"     ON personal_accounts     USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_personal_categories"   ON personal_categories   USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_personal_transactions" ON personal_transactions USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_fx_rate_snapshots"     ON fx_rate_snapshots     USING (true) WITH CHECK (true);
