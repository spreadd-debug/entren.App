-- ============================================================
-- entrenApp: SuperAdmin improvements — owner phone field
-- Run this ONCE in the Supabase SQL Editor
-- ============================================================

ALTER TABLE gyms ADD COLUMN IF NOT EXISTS owner_phone TEXT;
