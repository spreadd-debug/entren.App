-- ══════════════════════════════════════════════════════════════════════════════
-- entrenApp: Personal Finance — Fase 2.2 (foto real de la tarjeta)
--
-- Permitir subir una imagen de la tarjeta (escaneo/foto) para usar como fondo
-- de la card en la UI, estilo Apple Wallet. Si no hay imagen, fallback al
-- gradient.
--
-- La imagen se guarda en Supabase Storage (bucket 'card-images') y la URL
-- pública se persiste en personal_credit_cards.image_url.
--
-- Setup adicional manual (no se puede hacer con SQL):
--   1. Storage → New bucket → Name: card-images → Public: ON.
--   2. Storage → Policies → bucket card-images → "Allow all" (consistente
--      con el RLS permisivo del resto del repo).
--
-- Ejecutar en Supabase SQL Editor.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE personal_credit_cards
  ADD COLUMN IF NOT EXISTS image_url TEXT NULL;
