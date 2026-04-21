-- Phase 3: Practice Engine Schema
-- Drop and recreate tables that were pre-defined with different schemas in 001
DROP TABLE IF EXISTS offline_sync_queue CASCADE;
DROP TABLE IF EXISTS student_adaptive_state CASCADE;
DROP TABLE IF EXISTS error_patterns CASCADE;
DROP TABLE IF EXISTS student_errors CASCADE;
DROP TABLE IF EXISTS practice_session_exercises CASCADE;
DROP TABLE IF EXISTS practice_sessions CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;

-- exercises table
CREATE TABLE IF NOT EXISTS exercises (
  id              VARCHAR(20) PRIMARY KEY,
  exercise_type   VARCHAR(20) NOT NULL CHECK (exercise_type IN ('phonics','reading','writing','math')),
  ld_target       VARCHAR(20) CHECK (ld_target IN ('dyslexia','dysgraphia','dyscalculia','mixed','all')),
  title           VARCHAR(200) NOT NULL,
  instruction     TEXT NOT NULL,
  content         JSONB NOT NULL,          -- questions/items inside the exercise
  level           INT NOT NULL CHECK (level BETWEEN 1 AND 5),
  difficulty      INT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  xp_reward       INT NOT NULL DEFAULT 10,
  audio_prompt    TEXT,                    -- TTS override text
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_type_level ON exercises (exercise_type, level, is_active);
CREATE INDEX IF NOT EXISTS idx_exercises_ld_target  ON exercises (ld_target, level);

-- practice_sessions table
CREATE TABLE IF NOT EXISTS practice_sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_type VARCHAR(20) NOT NULL DEFAULT 'practice' CHECK (session_type IN ('practice','offline')),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_score  NUMERIC(5,2),
  synced       BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_student ON practice_sessions (student_id, completed_at DESC);

-- practice_session_exercises (individual exercise attempts within a session)
CREATE TABLE IF NOT EXISTS practice_session_exercises (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id   UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  exercise_id  VARCHAR(20) NOT NULL REFERENCES exercises(id),
  answers_json JSONB NOT NULL,
  score_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  time_taken_ms INT NOT NULL DEFAULT 0,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pse_session   ON practice_session_exercises (session_id);
CREATE INDEX IF NOT EXISTS idx_pse_exercise  ON practice_session_exercises (exercise_id);

-- student_errors table (every wrong answer)
CREATE TABLE IF NOT EXISTS student_errors (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id      VARCHAR(20) REFERENCES exercises(id),
  question_id      VARCHAR(20),
  student_answer   TEXT,
  correct_answer   TEXT,
  error_type       VARCHAR(50),           -- phonics, reading, writing, math
  response_time_ms INT DEFAULT 0,
  context_json     JSONB,
  timestamp        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_errors_student   ON student_errors (student_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_student_errors_type      ON student_errors (student_id, error_type);

-- error_patterns table (Claude-generated nightly)
CREATE TABLE IF NOT EXISTS error_patterns (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern_type VARCHAR(50) NOT NULL,       -- e.g. 'b_d_reversal', 'short_vowel_confusion'
  frequency    INT NOT NULL DEFAULT 1,
  description  TEXT,
  detected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, pattern_type)
);

CREATE INDEX IF NOT EXISTS idx_error_patterns_student ON error_patterns (student_id, detected_at DESC);

-- student_adaptive_state (per-student, per-exercise-type difficulty)
CREATE TABLE IF NOT EXISTS student_adaptive_state (
  student_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_type    VARCHAR(20) NOT NULL,
  current_difficulty INT NOT NULL DEFAULT 1 CHECK (current_difficulty BETWEEN 1 AND 3),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, exercise_type)
);

-- offline_sync_queue (exercises cached on device for offline use)
CREATE TABLE IF NOT EXISTS offline_sync_queue (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payload_type VARCHAR(30) NOT NULL,       -- 'practice_session', 'error_log'
  payload_json JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_offline_sync_student ON offline_sync_queue (student_id, synced_at);
