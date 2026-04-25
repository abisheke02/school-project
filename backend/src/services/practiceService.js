// Practice Service — Phase 3
// Adaptive difficulty engine (Elo-style), session management, mistake storage

const { query } = require('../config/database');
const { get, set } = require('../config/redis');

const DEMO_STUDENT_ID = '00000000-0000-0000-0000-000000000002';

// ─── Mock exercises for demo student ─────────────────────────────────────────
const MOCK_EXERCISES = {
  phonics: [
    {
      id: 'demo-ph-01', exercise_type: 'phonics', ld_target: 'dyslexia', level: 1,
      title: 'Letter Sounds: b and d', instruction: 'Tap the letter that makes the sound you hear.',
      content: { type: 'letter_tap', items: [
        { id: 'p1', prompt: 'Which letter makes the /b/ sound?', options: ['b','d','p','q'], correct: 'b' },
        { id: 'p2', prompt: 'Tap the letter at the START of: ball', options: ['b','d','p','q'], correct: 'b' },
        { id: 'p3', prompt: 'Tap the letter at the START of: dog', options: ['b','d','p','q'], correct: 'd' },
        { id: 'p4', prompt: 'Which letter makes the /p/ sound?', options: ['b','d','p','q'], correct: 'p' },
        { id: 'p5', prompt: 'Which letter makes the /q/ sound?', options: ['b','d','p','q'], correct: 'q' },
      ]}, current_difficulty: 1, past_attempts: 0, past_avg_score: 0,
    },
    {
      id: 'demo-ph-02', exercise_type: 'phonics', ld_target: 'dyslexia', level: 1,
      title: 'CVC Words: Short Vowels', instruction: 'Blend the sounds and pick the right word.',
      content: { type: 'word_blend', items: [
        { id: 'p6', sounds: ['c','a','t'], word: 'cat', options: ['cat','bat','rat','hat'], correct: 'cat' },
        { id: 'p7', sounds: ['d','o','g'], word: 'dog', options: ['log','dog','fog','hog'], correct: 'dog' },
        { id: 'p8', sounds: ['b','i','g'], word: 'big', options: ['dig','fig','big','pig'], correct: 'big' },
        { id: 'p9', sounds: ['r','u','n'], word: 'run', options: ['sun','run','fun','bun'], correct: 'run' },
        { id: 'p10', sounds: ['h','e','n'], word: 'hen', options: ['pen','ten','hen','den'], correct: 'hen' },
      ]}, current_difficulty: 1, past_attempts: 0, past_avg_score: 0,
    },
  ],
  reading: [
    {
      id: 'demo-rd-01', exercise_type: 'reading', ld_target: 'dyslexia', level: 1,
      title: 'Word Recognition', instruction: 'Read the sentence and choose the correct missing word.',
      content: { type: 'fill_blank', items: [
        { id: 'r1', sentence: 'The ___ sat on the mat.', options: ['cat','car','can','cap'], correct: 'cat' },
        { id: 'r2', sentence: 'Riya went to the ___ to buy vegetables.', options: ['market','mountain','moon','mud'], correct: 'market' },
        { id: 'r3', sentence: 'The sun rises in the ___.', options: ['west','north','east','south'], correct: 'east' },
        { id: 'r4', sentence: 'Birds have ___ to fly.', options: ['legs','wings','fins','arms'], correct: 'wings' },
        { id: 'r5', sentence: 'We drink ___ when we are thirsty.', options: ['milk','mud','stone','sand'], correct: 'milk' },
      ]}, current_difficulty: 1, past_attempts: 0, past_avg_score: 0,
    },
    {
      id: 'demo-rd-02', exercise_type: 'reading', ld_target: 'dyslexia', level: 1,
      title: 'Choose the Right Word', instruction: 'Pick the correct word for each sentence.',
      content: { type: 'word_choice', items: [
        { id: 'r6', prompt: 'The opposite of HOT is:', options: ['Warm','Cold','Hot','Burn'], correct: 'Cold' },
        { id: 'r7', prompt: 'A baby cow is called a:', options: ['Calf','Foal','Kitten','Puppy'], correct: 'Calf' },
        { id: 'r8', prompt: 'Which is a fruit?', options: ['Carrot','Potato','Mango','Onion'], correct: 'Mango' },
        { id: 'r9', prompt: 'The capital of India is:', options: ['Mumbai','Chennai','New Delhi','Kolkata'], correct: 'New Delhi' },
        { id: 'r10', prompt: 'How many days in a week?', options: ['5','6','7','8'], correct: '7' },
      ]}, current_difficulty: 1, past_attempts: 0, past_avg_score: 0,
    },
  ],
  writing: [
    {
      id: 'demo-wr-01', exercise_type: 'writing', ld_target: 'dysgraphia', level: 1,
      title: 'Word Dictation', instruction: 'Listen carefully and say the word out loud.',
      content: { type: 'dictation', items: [
        { id: 'w1', word: 'cat', hint: 'A small animal that says meow' },
        { id: 'w2', word: 'dog', hint: 'A pet that says woof' },
        { id: 'w3', word: 'sun', hint: 'It shines in the sky' },
        { id: 'w4', word: 'book', hint: 'You read this at school' },
        { id: 'w5', word: 'tree', hint: 'It has leaves and branches' },
      ]}, current_difficulty: 1, past_attempts: 0, past_avg_score: 0,
    },
    {
      id: 'demo-wr-02', exercise_type: 'writing', ld_target: 'dysgraphia', level: 1,
      title: 'Sentence Dictation', instruction: 'Listen and repeat the full sentence.',
      content: { type: 'dictation', items: [
        { id: 'w6', sentence: 'The cat sat on the mat.', hint: 'Say the whole sentence' },
        { id: 'w7', sentence: 'Riya goes to school every day.', hint: 'Say the whole sentence' },
        { id: 'w8', sentence: 'The sun is bright and warm.', hint: 'Say the whole sentence' },
        { id: 'w9', sentence: 'I love to read books.', hint: 'Say the whole sentence' },
        { id: 'w10', sentence: 'Birds can fly in the sky.', hint: 'Say the whole sentence' },
      ]}, current_difficulty: 1, past_attempts: 0, past_avg_score: 0,
    },
  ],
  speaking: [
    {
      id: 'demo-sp-01', exercise_type: 'speaking', ld_target: 'dyslexia', level: 1,
      title: 'Read Aloud: Simple Words', instruction: 'Read the word clearly out loud.',
      content: { type: 'read_aloud', items: [
        { id: 's1', text: 'cat', hint: 'Read this word aloud:' },
        { id: 's2', text: 'dog', hint: 'Read this word aloud:' },
        { id: 's3', text: 'sun', hint: 'Read this word aloud:' },
        { id: 's4', text: 'tree', hint: 'Read this word aloud:' },
        { id: 's5', text: 'book', hint: 'Read this word aloud:' },
      ]}, current_difficulty: 1, past_attempts: 0, past_avg_score: 0,
    },
    {
      id: 'demo-sp-02', exercise_type: 'speaking', ld_target: 'dyslexia', level: 1,
      title: 'Read Aloud: Sentences', instruction: 'Read the full sentence out loud clearly.',
      content: { type: 'read_aloud', items: [
        { id: 's6', text: 'The cat sat on the mat.', hint: 'Read this sentence aloud:' },
        { id: 's7', text: 'Riya goes to school every day.', hint: 'Read this sentence aloud:' },
        { id: 's8', text: 'The sun is big and bright.', hint: 'Read this sentence aloud:' },
        { id: 's9', text: 'I love to read books.', hint: 'Read this sentence aloud:' },
        { id: 's10', text: 'Birds can fly in the sky.', hint: 'Read this sentence aloud:' },
      ]}, current_difficulty: 1, past_attempts: 0, past_avg_score: 0,
    },
  ],
  math: [
    {
      id: 'demo-mt-01', exercise_type: 'math', ld_target: 'dyscalculia', level: 1,
      title: 'Counting Objects', instruction: 'Count the objects and tap the right number.',
      content: { type: 'count_tap', items: [
        { id: 'm1', prompt: '🍎🍎🍎', count: 3, options: [2, 3, 4, 5] },
        { id: 'm2', prompt: '⭐⭐⭐⭐⭐', count: 5, options: [3, 4, 5, 6] },
        { id: 'm3', prompt: '🐢🐢', count: 2, options: [1, 2, 3, 4] },
        { id: 'm4', prompt: '🌸🌸🌸🌸', count: 4, options: [3, 4, 5, 6] },
        { id: 'm5', prompt: '🦋🦋🦋🦋🦋🦋', count: 6, options: [4, 5, 6, 7] },
      ]}, current_difficulty: 1, past_attempts: 0, past_avg_score: 0,
    },
    {
      id: 'demo-mt-02', exercise_type: 'math', ld_target: 'dyscalculia', level: 1,
      title: 'Simple Word Problems', instruction: 'Read and solve the word problem.',
      content: { type: 'word_problem', items: [
        { id: 'm6', problem: 'Arjun has 3 pencils. His teacher gives him 2 more. How many pencils now?', options: [4, 5, 6, 7], correct: 5 },
        { id: 'm7', problem: 'There are 8 birds on a tree. 3 fly away. How many are left?', options: [4, 5, 6, 7], correct: 5 },
        { id: 'm8', problem: 'Priya has 10 sweets. She gives 4 to her friend. How many does she keep?', options: [4, 5, 6, 7], correct: 6 },
        { id: 'm9', problem: 'A school has 20 students. 5 are absent today. How many are present?', options: [13, 14, 15, 16], correct: 15 },
        { id: 'm10', problem: 'Rohan scored 6 in the first game and 7 in the second. Total score?', options: [11, 12, 13, 14], correct: 13 },
      ]}, current_difficulty: 1, past_attempts: 0, past_avg_score: 0,
    },
  ],
};

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
  if (studentId === DEMO_STUDENT_ID) {
    if (exerciseType) return MOCK_EXERCISES[exerciseType] || [];
    return Object.values(MOCK_EXERCISES).flat();
  }

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
