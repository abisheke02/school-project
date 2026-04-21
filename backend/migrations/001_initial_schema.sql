-- LD Support Platform — Initial Schema
-- Phase 1: All core tables
-- Run with: psql -U postgres -d ld_platform -f 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- SCHOOLS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(200) NOT NULL,
  location         VARCHAR(200),
  plan_type        VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'basic', 'pro')),
  subscription_expires_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- USERS (all roles in one table)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(100),
  phone            VARCHAR(20) NOT NULL UNIQUE,
  role             VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
  school_id        UUID REFERENCES schools(id) ON DELETE SET NULL,
  fcm_token        TEXT,                    -- Firebase Cloud Messaging token for push notifications
  language_pref    VARCHAR(10) DEFAULT 'en',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);

-- ─────────────────────────────────────────────
-- STUDENTS (extended profile, one row per student user)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  age              SMALLINT CHECK (age BETWEEN 5 AND 18),
  class_grade      SMALLINT CHECK (class_grade BETWEEN 1 AND 10),
  ld_type          VARCHAR(30) CHECK (ld_type IN ('dyslexia', 'dysgraphia', 'dyscalculia', 'mixed', 'not_detected')),
  ld_risk_score    SMALLINT DEFAULT 0 CHECK (ld_risk_score BETWEEN 0 AND 100),
  current_level    SMALLINT NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 5),
  streak_count     INTEGER NOT NULL DEFAULT 0,
  teacher_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  parent_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  last_screened_at TIMESTAMPTZ,
  next_screening_at TIMESTAMPTZ                -- Re-screening every 90 days
);

-- ─────────────────────────────────────────────
-- CLASSES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_name       VARCHAR(100) NOT NULL,
  join_code        VARCHAR(6) NOT NULL UNIQUE,  -- 6-char code students use to join
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_join_code ON classes(join_code);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);

-- ─────────────────────────────────────────────
-- CLASS STUDENTS (many-to-many)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_students (
  class_id         UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (class_id, student_id)
);

-- ─────────────────────────────────────────────
-- SCREENING SESSIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS screening_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  answers_json     JSONB NOT NULL DEFAULT '{}',  -- full quiz answers stored as JSON
  ld_type_result   VARCHAR(30) CHECK (ld_type_result IN ('dyslexia', 'dysgraphia', 'dyscalculia', 'mixed', 'not_detected')),
  risk_score       SMALLINT DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  duration_seconds INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screening_student_id ON screening_sessions(student_id, date);

-- ─────────────────────────────────────────────
-- PRACTICE SESSIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS practice_sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_type         VARCHAR(30) NOT NULL CHECK (module_type IN ('phonics', 'reading', 'writing', 'math', 'listening')),
  difficulty_level    SMALLINT NOT NULL CHECK (difficulty_level BETWEEN 1 AND 10),
  start_time          TIMESTAMPTZ NOT NULL,
  end_time            TIMESTAMPTZ,
  score_percent       NUMERIC(5,2),
  exercises_attempted INTEGER DEFAULT 0,
  exercises_correct   INTEGER DEFAULT 0,
  is_offline          BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_practice_student_id ON practice_sessions(student_id, start_time);

-- ─────────────────────────────────────────────
-- TEST ATTEMPTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_attempts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_level       SMALLINT NOT NULL CHECK (test_level BETWEEN 1 AND 5),
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at     TIMESTAMPTZ,
  score_percent    NUMERIC(5,2),
  passed           BOOLEAN,
  time_taken_seconds INTEGER
);

CREATE INDEX IF NOT EXISTS idx_test_attempts_student_level ON test_attempts(student_id, test_level);

-- ─────────────────────────────────────────────
-- STUDENT ERRORS (every wrong answer stored)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_errors (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id       UUID REFERENCES practice_sessions(id) ON DELETE SET NULL,
  question_id      UUID,
  student_answer   TEXT,
  correct_answer   TEXT,
  error_type       VARCHAR(50),  -- reversal, phoneme_confusion, sequencing, omission
  response_time_ms INTEGER,
  timestamp        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_errors_student_timestamp ON student_errors(student_id, timestamp);

-- ─────────────────────────────────────────────
-- ERROR PATTERNS (AI-detected, updated nightly)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_patterns (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  error_type               VARCHAR(50) NOT NULL,
  frequency                INTEGER DEFAULT 1,
  confidence_score         SMALLINT CHECK (confidence_score BETWEEN 0 AND 100),
  last_detected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ai_intervention_suggestion TEXT
);

CREATE INDEX IF NOT EXISTS idx_error_patterns_student ON error_patterns(student_id);

-- ─────────────────────────────────────────────
-- DAILY STATS (one row per student per day — core reporting unit)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_stats (
  student_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date               DATE NOT NULL DEFAULT CURRENT_DATE,
  minutes_active     INTEGER DEFAULT 0,
  exercises_done     INTEGER DEFAULT 0,
  score_avg          NUMERIC(5,2) DEFAULT 0,
  level_at_day_start SMALLINT DEFAULT 1,
  PRIMARY KEY (student_id, date)   -- UNIQUE enforced via primary key
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_student_date ON daily_stats(student_id, date);

-- ─────────────────────────────────────────────
-- LEVEL HISTORY (permanent audit trail)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS level_history (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level            SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 5),
  achieved_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score_at_unlock  NUMERIC(5,2)
);

-- ─────────────────────────────────────────────
-- EXERCISES (content library)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercises (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type             VARCHAR(30) NOT NULL,         -- phonics, reading, writing, math
  ld_target        VARCHAR(30),                  -- dyslexia, dysgraphia, dyscalculia
  difficulty_level SMALLINT NOT NULL CHECK (difficulty_level BETWEEN 1 AND 10),
  content_json     JSONB NOT NULL DEFAULT '{}',  -- exercise content (questions, options, etc.)
  audio_url        TEXT,
  ncert_class      SMALLINT CHECK (ncert_class BETWEEN 1 AND 8),
  ncert_chapter    VARCHAR(100),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_type_difficulty ON exercises(type, difficulty_level, is_active);

-- ─────────────────────────────────────────────
-- TEST QUESTIONS (seed content for 5 levels)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_questions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_level       SMALLINT NOT NULL CHECK (test_level BETWEEN 1 AND 5),
  question_type    VARCHAR(30) NOT NULL,  -- mcq, fill_blank, audio_based, drag_drop
  question_text    TEXT NOT NULL,
  options_json     JSONB,                 -- null for non-MCQ types
  correct_answer   TEXT NOT NULL,
  explanation_text TEXT,
  ld_target        VARCHAR(30),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_questions_level ON test_questions(test_level, is_active);

-- ─────────────────────────────────────────────
-- AI RECOMMENDATIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role                  VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'parent')),
  recommendation_text   TEXT NOT NULL,
  recommendation_type   VARCHAR(50),  -- exercise, strategy, tip
  generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ,
  viewed                BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user ON ai_recommendations(target_user_id, viewed, expires_at);

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type             VARCHAR(50) NOT NULL,  -- daily_reminder, test_result, milestone, at_risk
  title            VARCHAR(200) NOT NULL,
  body             TEXT NOT NULL,
  sent_at          TIMESTAMPTZ,
  read_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);

-- ─────────────────────────────────────────────
-- MESSAGES (teacher-parent in-app messaging)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body             TEXT NOT NULL,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, read_at);

-- ─────────────────────────────────────────────
-- OFFLINE SYNC QUEUE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offline_sync_queue (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type      VARCHAR(50) NOT NULL,  -- submit_exercise, submit_test, record_error
  payload_json     JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at        TIMESTAMPTZ            -- null until synced
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_student ON offline_sync_queue(student_id, synced_at);
