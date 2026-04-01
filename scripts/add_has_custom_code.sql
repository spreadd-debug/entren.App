-- Add has_custom_code flag to students table
-- When false, the student portal will prompt the student to set their own code on login
ALTER TABLE students ADD COLUMN IF NOT EXISTS has_custom_code BOOLEAN DEFAULT false;
