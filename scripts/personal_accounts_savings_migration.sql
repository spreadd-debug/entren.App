-- ══════════════════════════════════════════════════════════════════════════════
-- entrenApp: Personal Finance — flag is_savings en cuentas
--
-- Para distinguir cuentas "gastables" (efectivo del día a día, MP, banco
-- corriente) de cuentas que son ahorro intocable (USD billete guardado,
-- inversiones líquidas que no estás dispuesto a usar). Las marcadas como
-- savings NO suman en el balance principal del Dashboard / Money — se
-- listan aparte como "Ahorros" para ver el patrimonio total.
--
-- Default false: cuentas existentes quedan como gastables (compatibilidad).
-- Lo marcás manualmente desde el form de la cuenta.
--
-- Ejecutar en Supabase SQL Editor.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE personal_accounts
  ADD COLUMN IF NOT EXISTS is_savings BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_personal_accounts_savings
  ON personal_accounts (profile_id, is_savings);
