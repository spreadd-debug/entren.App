-- Student Plan Profiles: PT planning wizard data per student
-- Stores the training context that feeds into AI analysis

CREATE TABLE IF NOT EXISTS student_plan_profiles (
  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id                  UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  student_id              UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Step 1: Who is the student
  student_type            TEXT        NOT NULL DEFAULT 'general'
                                      CHECK (student_type IN ('general','amateur_athlete','competitive_athlete','rehab','senior','postpartum')),
  sport                   TEXT,
  sport_season            TEXT        CHECK (sport_season IS NULL OR sport_season IN ('preseason','in_season','offseason','none')),
  experience_level        TEXT        NOT NULL DEFAULT 'beginner'
                                      CHECK (experience_level IN ('beginner','intermediate','advanced')),
  age                     INTEGER,
  biological_sex          TEXT        CHECK (biological_sex IS NULL OR biological_sex IN ('male','female')),
  injuries_limitations    TEXT,
  available_days          JSONB       DEFAULT '[]'::jsonb,
  sessions_per_week       INTEGER,
  session_duration_min    INTEGER,

  -- Step 2: Goals
  primary_objective       TEXT        NOT NULL DEFAULT 'general_health'
                                      CHECK (primary_objective IN ('fat_loss','hypertrophy','max_strength','recomp','sport_performance','power','endurance','rehab','general_health','competition_prep')),
  secondary_objective     TEXT,
  numeric_goal            TEXT,
  goal_deadline           DATE,
  goal_timeframe          TEXT        CHECK (goal_timeframe IS NULL OR goal_timeframe IN ('1_month','2_months','3_months','6_months','1_year','no_deadline')),

  -- Step 3: Training methodology
  current_phase           TEXT        NOT NULL DEFAULT 'anatomical_adaptation'
                                      CHECK (current_phase IN ('anatomical_adaptation','hypertrophy','max_strength','power','muscular_endurance','peaking','deload','rehab','maintenance')),
  phase_duration_weeks    INTEGER,
  phase_start_date        DATE,
  next_phase              TEXT,
  periodization_model     TEXT        NOT NULL DEFAULT 'none'
                                      CHECK (periodization_model IN ('linear','daily_undulating','weekly_undulating','block','autoregulated','none')),
  progression_method      TEXT        NOT NULL DEFAULT 'session_by_session'
                                      CHECK (progression_method IN ('linear_weight','double_progression','volume','rpe','percentage_1rm','session_by_session')),
  rep_range               TEXT        NOT NULL DEFAULT 'mixed'
                                      CHECK (rep_range IN ('1-5','6-8','8-12','12-15','15-20','mixed')),
  special_techniques      JSONB       DEFAULT '[]'::jsonb,
  methodology_notes       TEXT,

  -- Step 4: Additional context
  nutrition_strategy      TEXT        NOT NULL DEFAULT 'not_managed'
                                      CHECK (nutrition_strategy IN ('deficit','surplus','maintenance','specific_diet','not_managed')),
  nutrition_detail        TEXT,
  lifestyle_factors       TEXT,
  equipment_restrictions  TEXT,
  schedule_considerations TEXT,

  created_at              TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at              TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(student_id)
);

ALTER TABLE student_plan_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_student_plan_profiles" ON student_plan_profiles
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_student_plan_profiles_student
  ON student_plan_profiles(student_id);

CREATE INDEX IF NOT EXISTS idx_student_plan_profiles_gym
  ON student_plan_profiles(gym_id);

-- Add context_json column to ai_analyses to store the full context sent to the AI
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS context_json JSONB;
