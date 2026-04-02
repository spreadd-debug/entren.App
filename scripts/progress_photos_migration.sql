-- Progress Photos Migration
-- Run this in Supabase SQL Editor

-- 1. Create progress_photos table
CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  photo_date DATE NOT NULL DEFAULT CURRENT_DATE,
  storage_path TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  angle TEXT NOT NULL DEFAULT 'front',  -- front, side_left, side_right, back
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_progress_photos_student
  ON progress_photos(student_id, photo_date DESC);

-- 2. RLS
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_progress_photos"
  ON progress_photos FOR ALL USING (true) WITH CHECK (true);

-- 3. Create storage bucket (run these via Supabase Dashboard > Storage if SQL doesn't work)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('progress-photos', 'progress-photos', true)
-- ON CONFLICT (id) DO NOTHING;

-- NOTE: You may need to create the bucket manually in the Supabase Dashboard:
-- 1. Go to Storage > New Bucket
-- 2. Name: "progress-photos"
-- 3. Public: Yes (so photo URLs work without auth tokens)
-- 4. Add policy: Allow authenticated uploads (or allow all for simplicity)
