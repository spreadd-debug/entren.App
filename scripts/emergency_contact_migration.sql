-- Migration: add emergency contact fields to students table
-- Run this in Supabase SQL Editor

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS emergency_contact_name  text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text;

ALTER TABLE students
ADD COLUMN IF NOT EXIST emergency_contact_name text;
ADD COLUMN IF NOT EXIST emergency_contact_phone text;
