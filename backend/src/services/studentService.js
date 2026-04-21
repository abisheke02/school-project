const { query } = require('../config/database');

// Complete student profile after first login (onboarding step 1)
const setupProfile = async (userId, { name, age, classGrade, languagePref }) => {
  await query(
    `UPDATE users SET name = $1, language_pref = $2 WHERE id = $3`,
    [name, languagePref || 'en', userId]
  );

  // Check if student record already exists
  const existing = await query('SELECT user_id FROM students WHERE user_id = $1', [userId]);

  if (existing.rows.length === 0) {
    await query(
      `INSERT INTO students (user_id, age, class_grade, current_level, streak_count)
       VALUES ($1, $2, $3, 1, 0)`,
      [userId, age, classGrade]
    );
  } else {
    await query(
      `UPDATE students SET age = $1, class_grade = $2 WHERE user_id = $3`,
      [age, classGrade, userId]
    );
  }

  return getStudentProfile(userId);
};

// Join a school class via the join code teacher shares
const joinSchoolByCode = async (userId, joinCode) => {
  const classResult = await query(
    `SELECT c.id as class_id, c.school_id, c.teacher_id, c.class_name, s.id as school_db_id
     FROM classes c
     JOIN schools s ON s.id = c.school_id
     WHERE c.join_code = $1`,
    [joinCode.toUpperCase()]
  );

  if (classResult.rows.length === 0) {
    throw Object.assign(new Error('Invalid school code'), { status: 404 });
  }

  const { class_id, school_id, teacher_id } = classResult.rows[0];

  // Link student to school and teacher
  await query(
    `UPDATE users SET school_id = $1 WHERE id = $2`,
    [school_id, userId]
  );
  await query(
    `UPDATE students SET teacher_id = $1 WHERE user_id = $2`,
    [teacher_id, userId]
  );

  // Add to class_students join table (ignore if already joined)
  await query(
    `INSERT INTO class_students (class_id, student_id, joined_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (class_id, student_id) DO NOTHING`,
    [class_id, userId]
  );

  return classResult.rows[0];
};

const DEMO_STUDENT_ID = '00000000-0000-0000-0000-000000000002';
const MOCK_STUDENT_PROFILE = {
  id: DEMO_STUDENT_ID,
  name: 'Arjun Sharma',
  phone: '+919876543210',
  language_pref: 'en',
  school_id: '00000000-0000-0000-0000-000000000001',
  age: 10,
  class_grade: 4,
  ld_type: 'dyslexia',
  ld_risk_score: 68,
  current_level: 2,
  streak_count: 7,
  teacher_id: '00000000-0000-0000-0000-000000000000',
};

const getStudentProfile = async (userId) => {
  if (userId === DEMO_STUDENT_ID) return MOCK_STUDENT_PROFILE;

  const result = await query(
    `SELECT u.id, u.name, u.phone, u.language_pref, u.school_id,
            s.age, s.class_grade, s.ld_type, s.ld_risk_score,
            s.current_level, s.streak_count, s.teacher_id
     FROM users u
     LEFT JOIN students s ON s.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw Object.assign(new Error('Student not found'), { status: 404 });
  }

  return result.rows[0];
};

// Update streak: called at end of each practice session
const updateStreak = async (userId) => {
  await query(
    `UPDATE students
     SET streak_count = CASE
       WHEN (SELECT MAX(date) FROM daily_stats WHERE student_id = $1) = CURRENT_DATE - 1
       THEN streak_count + 1
       ELSE 1
     END
     WHERE user_id = $1`,
    [userId]
  );
};

// Record daily activity (upsert — one row per student per day)
const recordDailyActivity = async (userId, { minutesActive, exercisesDone, scoreAvg, level }) => {
  await query(
    `INSERT INTO daily_stats (student_id, date, minutes_active, exercises_done, score_avg, level_at_day_start)
     VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)
     ON CONFLICT (student_id, date)
     DO UPDATE SET
       minutes_active = daily_stats.minutes_active + EXCLUDED.minutes_active,
       exercises_done = daily_stats.exercises_done + EXCLUDED.exercises_done,
       score_avg = (daily_stats.score_avg + EXCLUDED.score_avg) / 2`,
    [userId, minutesActive, exercisesDone, scoreAvg, level]
  );
};

module.exports = { setupProfile, joinSchoolByCode, getStudentProfile, updateStreak, recordDailyActivity };
