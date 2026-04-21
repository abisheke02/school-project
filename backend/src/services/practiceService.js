// Practice Service — Phase 3
// Adaptive difficulty engine (Elo-style), session management, mistake storage

const { query } = require('../config/database');
const { get, set } = require('../config/redis');

// ─── Adaptive Difficulty Engine ───────────────────────────────────────────────
// score > 80% → move difficulty up (within same level)
// score < 50% → move difficulty down
// 50-80%     → hold
const DIFFICULTY_UP_THRESHOLD = 80;
const DIFFICULTY_DOWN_THRESHOLD = 50;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 3;

const computeNextDifficulty = (currentDifficulty, scorePercent) => {
  if (scorePercent >= DIFFICULTY_UP_THRESHOLD) {
    return Math.min(currentDifficulty + 1, MAX_DIFFICULTY);
  }
  if (scorePercent < DIFFICULTY_DOWN_THRESHOLD) {
    return Math.max(currentDifficulty - 1, MIN_DIFFICULTY);
  }
  return currentDifficulty;
};

// ─── Get exercises for a student ─────────────────────────────────────────────
const getExercisesForStudent = async (studentId, exerciseType = null) => {
  const cacheKey = `exercises:${studentId}:${exerciseType || 'all'}`;
  const cached = await get(cacheKey);
  if (cached) return cached;

  // Get student's current level + LD type
  const studentResult = await query(
    `SELECT s.current_level, s.ld_type, s.ld_risk_score
     FROM students s WHERE s.user_id = $1`,
    [studentId]
  );
  if (!studentResult.rows.length) throw new Error('Student not found');
  const { current_level, ld_type } = studentResult.rows[0];

  // Get student's current difficulty preference from adaptive state
  const adaptiveResult = await query(
    `SELECT exercise_type, current_difficulty
     FROM student_adaptive_state WHERE student_id = $1`,
    [studentId]
  );
  const adaptiveMap = {};
  adaptiveResult.rows.forEach((r) => {
    adaptiveMap[r.exercise_type] = r.current_difficulty;
  });

  // Build exercise query
  let exerciseQuery = `
    SELECT e.*,
      COALESCE(pas.attempts, 0) as past_attempts,
      COALESCE(pas.avg_score, 0) as past_avg_score
    FROM exercises e
    LEFT JOIN (
      SELECT exercise_id, COUNT(*) as attempts, AVG(score_percent) as avg_score
      FROM practice_session_exercises pse
      JOIN practice_sessions ps ON ps.id = pse.session_id
      WHERE ps.student_id = $1
        AND ps.completed_at > NOW() - INTERVAL '7 days'
      GROUP BY exercise_id
    ) pas ON pas.exercise_id = e.id
    WHERE e.level = $2
      AND e.is_active = true
  `;
  const params = [studentId, current_level];

  if (exerciseType) {
    exerciseQuery += ` AND e.exercise_type = $${params.length + 1}`;
    params.push(exerciseType);
  }

  if (ld_type && ld_type !== 'not_detected') {
    // Prioritise exercises targeting this LD type
    exerciseQuery += ` ORDER BY
      CASE WHEN e.ld_target = $${params.length + 1} THEN 0 ELSE 1 END,
      pas.attempts ASC NULLS FIRST,
      RANDOM()
    LIMIT 10`;
    params.push(ld_type);
  } else {
    exerciseQuery += ` ORDER BY pas.attempts ASC NULLS FIRST, RANDOM() LIMIT 10`;
  }

  const result = await query(exerciseQuery, params);
  const exercises = result.rows.map((ex) => ({
    ...ex,
    content: typeof ex.content === 'string' ? JSON.parse(ex.content) : ex.content,
    current_difficulty: adaptiveMap[ex.exercise_type] || 1,
  }));

  await set(cacheKey, exercises, 300); // cache 5 min
  return exercises;
};

// ─── Start a practice session ─────────────────────────────────────────────────
const startPracticeSession = async (studentId, sessionType = 'practice') => {
  const result = await query(
    `INSERT INTO practice_sessions (id, student_id, session_type, started_at)
     VALUES (uuid_generate_v4(), $1, $2, NOW())
     RETURNING id`,
    [studentId, sessionType]
  );
  return result.rows[0].id;
};

// ─── Record a single exercise attempt ────────────────────────────────────────
const recordExerciseAttempt = async ({
  sessionId,
  studentId,
  exerciseId,
  exerciseType,
  answers,          // [{ questionId, studentAnswer, correctAnswer, isCorrect, responseTimeMs }]
  scorePercent,
  timeTakenMs,
}) => {
  // 1. Insert session-exercise record
  await query(
    `INSERT INTO practice_session_exercises
       (id, session_id, exercise_id, answers_json, score_percent, time_taken_ms, attempted_at)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, NOW())`,
    [sessionId, exerciseId, JSON.stringify(answers), scorePercent, timeTakenMs]
  );

  // 2. Store wrong answers in student_errors
  const wrongAnswers = answers.filter((a) => !a.isCorrect);
  for (const wa of wrongAnswers) {
    await query(
      `INSERT INTO student_errors
         (id, student_id, exercise_id, question_id, student_answer, correct_answer,
          error_type, response_time_ms, context_json, timestamp)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        studentId,
        exerciseId,
        wa.questionId || null,
        wa.studentAnswer,
        wa.correctAnswer,
        wa.errorType || exerciseType,
        wa.responseTimeMs || 0,
        JSON.stringify({ exerciseType, scorePercent }),
      ]
    );
  }

  // 3. Update adaptive difficulty state
  const nextDifficulty = computeNextDifficulty(
    await getCurrentDifficulty(studentId, exerciseType),
    scorePercent
  );
  await query(
    `INSERT INTO student_adaptive_state (student_id, exercise_type, current_difficulty, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (student_id, exercise_type)
     DO UPDATE SET current_difficulty = $3, updated_at = NOW()`,
    [studentId, exerciseType, nextDifficulty]
  );

  return { nextDifficulty, wrongCount: wrongAnswers.length };
};

// ─── Complete a session + update streak + daily stats ─────────────────────────
const completePracticeSession = async (studentId, sessionId, totalScore) => {
  await query(
    `UPDATE practice_sessions
     SET completed_at = NOW(), total_score = $1
     WHERE id = $2`,
    [totalScore, sessionId]
  );

  // Upsert daily stats
  await query(
    `INSERT INTO daily_stats (id, student_id, date, score, exercises_done, updated_at)
     VALUES (uuid_generate_v4(), $1, CURRENT_DATE, $2, 1, NOW())
     ON CONFLICT (student_id, date)
     DO UPDATE SET
       score = (daily_stats.score * daily_stats.exercises_done + $2) / (daily_stats.exercises_done + 1),
       exercises_done = daily_stats.exercises_done + 1,
       updated_at = NOW()`,
    [studentId, totalScore]
  );

  // Update streak
  const streakResult = await query(
    `SELECT streak_count FROM students WHERE user_id = $1`,
    [studentId]
  );
  const current = streakResult.rows[0]?.streak_count || 0;

  const yesterdayResult = await query(
    `SELECT 1 FROM daily_stats
     WHERE student_id = $1 AND date = CURRENT_DATE - 1`,
    [studentId]
  );
  const newStreak = yesterdayResult.rows.length ? current + 1 : 1;

  await query(
    `UPDATE students SET streak_count = $1 WHERE user_id = $2`,
    [newStreak, studentId]
  );

  // Invalidate exercise cache
  await require('../config/redis').del(`exercises:${studentId}:all`);

  return { newStreak, totalScore };
};

// ─── Get student's practice history ──────────────────────────────────────────
const getPracticeHistory = async (studentId, limit = 10) => {
  const result = await query(
    `SELECT ps.id, ps.session_type, ps.started_at, ps.completed_at,
            ps.total_score,
            COUNT(pse.id) as exercise_count
     FROM practice_sessions ps
     LEFT JOIN practice_session_exercises pse ON pse.session_id = ps.id
     WHERE ps.student_id = $1 AND ps.completed_at IS NOT NULL
     GROUP BY ps.id
     ORDER BY ps.completed_at DESC
     LIMIT $2`,
    [studentId, limit]
  );
  return result.rows;
};

// ─── Get error summary for a student ────────────────────────────────────────
const getErrorSummary = async (studentId) => {
  const result = await query(
    `SELECT error_type, COUNT(*) as count,
            AVG(response_time_ms) as avg_response_ms
     FROM student_errors
     WHERE student_id = $1
       AND timestamp > NOW() - INTERVAL '30 days'
     GROUP BY error_type
     ORDER BY count DESC`,
    [studentId]
  );
  return result.rows;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getCurrentDifficulty = async (studentId, exerciseType) => {
  const result = await query(
    `SELECT current_difficulty FROM student_adaptive_state
     WHERE student_id = $1 AND exercise_type = $2`,
    [studentId, exerciseType]
  );
  return result.rows[0]?.current_difficulty || 1;
};

module.exports = {
  getExercisesForStudent,
  startPracticeSession,
  recordExerciseAttempt,
  completePracticeSession,
  getPracticeHistory,
  getErrorSummary,
  computeNextDifficulty,
};
