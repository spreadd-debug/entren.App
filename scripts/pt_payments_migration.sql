-- PT Shift Payments Migration
-- Tracks per-shift payment status for each student on each date
-- Run this in Supabase SQL Editor

-- 1. Create pt_shift_payments table
CREATE TABLE IF NOT EXISTS pt_shift_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,               -- the actual date of the shift occurrence
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash', -- cash, transfer, mercadopago
  status TEXT NOT NULL DEFAULT 'paid',       -- paid, unpaid
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Unique: one payment record per shift+student+date
CREATE UNIQUE INDEX IF NOT EXISTS idx_pt_shift_payments_unique
  ON pt_shift_payments(shift_id, student_id, payment_date);

-- Fast lookups by gym and date
CREATE INDEX IF NOT EXISTS idx_pt_shift_payments_gym_date
  ON pt_shift_payments(gym_id, payment_date DESC);

-- Fast lookups by student
CREATE INDEX IF NOT EXISTS idx_pt_shift_payments_student
  ON pt_shift_payments(student_id, payment_date DESC);

-- 2. RLS
ALTER TABLE pt_shift_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_pt_shift_payments"
  ON pt_shift_payments FOR ALL USING (true) WITH CHECK (true);
