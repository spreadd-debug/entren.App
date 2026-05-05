-- ══════════════════════════════════════════════════════════════════════════════
-- entrenApp: Personal Finance — Fase 3 (cuotas)
--
-- Una compra en N cuotas se materializa como N transacciones, cada una en el
-- statement que le toca según el closing_day de la tarjeta. Comparten un
-- installment_group_id para poder borrarlas juntas (rollback de la compra).
--
-- - installment_total:   N cuotas (null si fue un solo pago).
-- - installment_number:  Cuál cuota (1..N).
-- - installment_group_id UUID que agrupa las cuotas de la misma compra.
--
-- Ejecutar en Supabase SQL Editor.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE personal_transactions
  ADD COLUMN IF NOT EXISTS installment_total    INTEGER NULL,
  ADD COLUMN IF NOT EXISTS installment_number   INTEGER NULL,
  ADD COLUMN IF NOT EXISTS installment_group_id UUID    NULL;

ALTER TABLE personal_transactions
  DROP CONSTRAINT IF EXISTS chk_transactions_installment_consistency;
ALTER TABLE personal_transactions
  ADD CONSTRAINT chk_transactions_installment_consistency
  CHECK (
    (installment_total IS NULL AND installment_number IS NULL AND installment_group_id IS NULL)
    OR (
      installment_total >= 1
      AND installment_number BETWEEN 1 AND installment_total
      AND installment_group_id IS NOT NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_personal_transactions_installment_group
  ON personal_transactions (installment_group_id)
  WHERE installment_group_id IS NOT NULL;
