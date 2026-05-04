-- ══════════════════════════════════════════════════════════════════════════════
-- entrenApp: Personal Finance — Fase 2.1 (tarjetas multi-moneda)
--
-- Las tarjetas de crédito en Argentina manejan compras en pesos y dólares
-- en la MISMA tarjeta, con dos resúmenes separados (uno por moneda).
--
-- Cambios:
--   - personal_credit_cards: drop column `currency` (la tarjeta es agnóstica).
--   - personal_card_statements: add column `currency` (NOT NULL).
--   - UNIQUE constraint pasa de (card_id, period_end) a
--     (card_id, period_end, currency) — ahora puede haber statement ARS y
--     statement USD del mismo período.
--
-- Backfill: existing statements quedan en 'ARS' (que era el único valor
-- soportado hasta ahora).
--
-- Ejecutar en Supabase SQL Editor.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Statements: agregar currency con default 'ARS' (backfill automático)
ALTER TABLE personal_card_statements
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'ARS';

-- 2. Reemplazar UNIQUE (card_id, period_end) por (card_id, period_end, currency)
-- El nombre del constraint en Postgres por default es <tabla>_<col1>_<col2>_key.
-- Lo dropeamos por nombre o por DROP CONSTRAINT IF EXISTS para ser idempotente.
ALTER TABLE personal_card_statements
  DROP CONSTRAINT IF EXISTS personal_card_statements_card_id_period_end_key;
ALTER TABLE personal_card_statements
  DROP CONSTRAINT IF EXISTS personal_card_statements_card_period_end_key;
ALTER TABLE personal_card_statements
  ADD CONSTRAINT personal_card_statements_card_period_currency_key
  UNIQUE (card_id, period_end, currency);

-- 3. Tarjetas: drop currency (agnóstica)
ALTER TABLE personal_credit_cards
  DROP COLUMN IF EXISTS currency;
