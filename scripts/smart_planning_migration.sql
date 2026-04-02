-- Smart Planning System: AI Analyses table
-- For storing AI-generated post-session analyses (future Claude API integration)

CREATE TABLE IF NOT EXISTS ai_analyses (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id          UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id      UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id      UUID        NULL REFERENCES workout_sessions(id) ON DELETE SET NULL,
  analysis_type   TEXT        NOT NULL CHECK (analysis_type IN ('post_session', 'weekly_review')),
  content         TEXT        NOT NULL,
  model_used      TEXT        NOT NULL DEFAULT 'gemini-2.0-flash',
  tokens_used     INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_ai_analyses" ON ai_analyses
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_student
  ON ai_analyses(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_session
  ON ai_analyses(session_id);
