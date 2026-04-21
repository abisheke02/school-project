-- Phase 4: Test System Schema
-- Drop and recreate tables pre-defined in 001 with different schemas
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS level_history CASCADE;
DROP TABLE IF EXISTS ai_recommendations CASCADE;
DROP TABLE IF EXISTS test_attempts CASCADE;
DROP TABLE IF EXISTS test_questions CASCADE;

-- test_questions table (separate from screening questions)
CREATE TABLE IF NOT EXISTS test_questions (
  id              VARCHAR(15) PRIMARY KEY,
  level           INT NOT NULL CHECK (level BETWEEN 1 AND 5),
  subject         VARCHAR(20) NOT NULL CHECK (subject IN ('english','math')),
  category        VARCHAR(40) NOT NULL,
  question_text   TEXT NOT NULL,
  question_type   VARCHAR(20) NOT NULL DEFAULT 'mcq',
  options_json    JSONB,
  correct_answer  VARCHAR(200) NOT NULL,
  explanation     TEXT,
  difficulty      INT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_questions_level   ON test_questions (level, subject, is_active);
CREATE INDEX IF NOT EXISTS idx_test_questions_category ON test_questions (level, category);

-- test_attempts table
CREATE TABLE IF NOT EXISTS test_attempts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level           INT NOT NULL CHECK (level BETWEEN 1 AND 5),
  score_percent   NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 20,
  correct_count   INT NOT NULL DEFAULT 0,
  time_taken_ms   INT NOT NULL DEFAULT 0,
  answers_json    JSONB,
  passed          BOOLEAN NOT NULL DEFAULT false,
  ai_feedback     TEXT,
  attempted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_attempts_student ON test_attempts (student_id, level, attempted_at DESC);

-- ai_recommendations table
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  audience        VARCHAR(10) NOT NULL DEFAULT 'student' CHECK (audience IN ('student','teacher','parent')),
  recommendations JSONB NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_ai_recs_student ON ai_recommendations (student_id, audience, generated_at DESC);

-- level_history table (tracks level unlocks)
CREATE TABLE IF NOT EXISTS level_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_level  INT NOT NULL,
  to_level    INT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  test_id     UUID REFERENCES test_attempts(id)
);

CREATE INDEX IF NOT EXISTS idx_level_history_student ON level_history (student_id, unlocked_at DESC);

-- notifications table (if not created in schema 001)
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(40) NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read, sent_at DESC);
