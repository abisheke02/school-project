-- Phase 2: Screening questions table
-- Run BEFORE 002_screening_questions_seed.sql

CREATE TABLE IF NOT EXISTS screening_questions (
  id               VARCHAR(10) PRIMARY KEY,
  category         VARCHAR(50) NOT NULL,   -- letter_recognition, rhyme_detection, phoneme_blending, number_sense
  ld_target        VARCHAR(30) NOT NULL,   -- dyslexia, dyscalculia, dysgraphia
  question_text    TEXT NOT NULL,
  question_type    VARCHAR(20) NOT NULL DEFAULT 'mcq',
  options_json     JSONB NOT NULL,
  correct_answer   TEXT NOT NULL,
  audio_prompt     VARCHAR(100),           -- reference key for TTS audio asset
  difficulty       SMALLINT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  age_min          SMALLINT DEFAULT 5,
  age_max          SMALLINT DEFAULT 14,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_sq_category_ld ON screening_questions(category, ld_target, is_active);
