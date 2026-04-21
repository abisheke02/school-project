// Cron Jobs — All scheduled background tasks for LD Platform
// Phase 3: Nightly AI error pattern detection
// Phase 4: Weekly student/teacher/parent recommendations + question variant generation
// Phase 2: Re-screening flag check
//
// Schedule (IST = UTC+5:30):
//   Nightly error analysis    → 02:00 IST daily     = 20:30 UTC
//   Weekly student recs       → Sunday 22:00 IST     = 16:30 UTC Sun
//   Weekly teacher recs       → Monday 06:00 IST     = 00:30 UTC Mon
//   Question variant refresh  → Wednesday 03:00 IST  = 21:30 UTC Tue
//   Re-screening check        → 03:30 IST daily      = 22:00 UTC

const cron = require('node-cron');
const { query } = require('../config/database');
const { detectErrorPatterns } = require('../services/claudeService');
const {
  generateForStudent,
  generateForTeacher,
  generateForParent,
} = require('../services/recommendationService');
const { generateQuestionVariants } = require('../services/questionVariantService');
const {
  sendDailyExerciseReminder,
  sendTeacherInactivityAlerts,
  sendWeeklyParentSMS,
} = require('../services/notificationService');

// ─── Nightly Error Pattern Detection ──────────────────────────────────────────
// Runs at 02:00 IST (20:30 UTC) — for every student who had errors in last 24h
const runNightlyErrorPatterns = async () => {
  console.log('[CRON] Starting nightly error pattern detection…');
  try {
    // Get all students with errors in the last 24 hours (batch)
    const studentsResult = await query(
      `SELECT DISTINCT student_id FROM student_errors
       WHERE timestamp > NOW() - INTERVAL '24 hours'`
    );

    let processed = 0;
    for (const row of studentsResult.rows) {
      try {
        await analyseStudentErrors(row.student_id);
        processed++;
      } catch (err) {
        console.error(`[CRON] Error analysing student ${row.student_id}:`, err.message);
      }
    }
    console.log(`[CRON] Nightly error patterns done. Processed ${processed} students.`);
  } catch (err) {
    console.error('[CRON] Nightly error pattern job failed:', err.message);
  }
};

const analyseStudentErrors = async (studentId) => {
  // Pull errors from last 30 days
  const errorsResult = await query(
    `SELECT se.student_answer, se.correct_answer, se.error_type,
            se.response_time_ms, se.timestamp,
            e.title as exercise_title
     FROM student_errors se
     LEFT JOIN exercises e ON e.id = se.exercise_id
     WHERE se.student_id = $1
       AND se.timestamp > NOW() - INTERVAL '30 days'
     ORDER BY se.timestamp DESC
     LIMIT 50`,
    [studentId]
  );

  if (!errorsResult.rows.length) return;

  // Format for Claude
  const errorLogs = errorsResult.rows.map((e) => ({
    question_text: e.exercise_title || 'Unknown exercise',
    student_answer: e.student_answer,
    correct_answer: e.correct_answer,
    error_type: e.error_type,
    frequency: 1,
    response_time_ms: e.response_time_ms,
  }));

  const patterns = await detectErrorPatterns(errorLogs);

  // Upsert error patterns table
  for (const p of patterns) {
    await query(
      `INSERT INTO error_patterns (id, student_id, pattern_type, frequency, description, detected_at)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, NOW())
       ON CONFLICT (student_id, pattern_type)
       DO UPDATE SET
         frequency = EXCLUDED.frequency,
         description = EXCLUDED.description,
         detected_at = NOW()`,
      [
        studentId,
        p.pattern_name,
        p.frequency,
        JSON.stringify({ confidence: p.confidence, ld_indicator: p.ld_indicator,
          teacher_intervention: p.teacher_intervention, student_tip: p.student_tip }),
      ]
    );
  }
};

// ─── Weekly Student Recommendations ───────────────────────────────────────────
// Runs Sunday 22:00 IST (16:30 UTC) — for all active students
const runWeeklyStudentRecs = async () => {
  console.log('[CRON] Starting weekly student recommendations…');
  try {
    const result = await query(
      `SELECT u.id FROM users u
       JOIN students s ON s.user_id = u.id
       WHERE u.role = 'student'
         AND EXISTS (
           SELECT 1 FROM practice_sessions ps
           WHERE ps.student_id = u.id
             AND ps.completed_at > NOW() - INTERVAL '7 days'
         )`
    );

    let done = 0;
    for (const row of result.rows) {
      try {
        await generateForStudent(row.id);
        done++;
      } catch (err) {
        console.error(`[CRON] Student rec failed for ${row.id}:`, err.message);
      }
    }
    console.log(`[CRON] Student recs done. Generated for ${done} students.`);
  } catch (err) {
    console.error('[CRON] Weekly student recs job failed:', err.message);
  }
};

// ─── Weekly Teacher Recommendations ───────────────────────────────────────────
// Runs Monday 06:00 IST (00:30 UTC)
const runWeeklyTeacherRecs = async () => {
  console.log('[CRON] Starting weekly teacher recommendations…');
  try {
    const result = await query(
      `SELECT DISTINCT u.id FROM users u WHERE u.role IN ('teacher', 'admin')`
    );

    for (const row of result.rows) {
      try {
        await generateForTeacher(row.id);
      } catch (err) {
        console.error(`[CRON] Teacher rec failed for ${row.id}:`, err.message);
      }
    }
    console.log('[CRON] Teacher recs done.');
  } catch (err) {
    console.error('[CRON] Weekly teacher recs job failed:', err.message);
  }
};

// ─── Weekly Parent Tips ────────────────────────────────────────────────────────
// Runs Sunday 22:00 IST alongside student recs
const runWeeklyParentTips = async () => {
  console.log('[CRON] Starting weekly parent tips…');
  try {
    const result = await query(
      `SELECT DISTINCT u.id FROM users u WHERE u.role = 'parent'`
    );

    for (const row of result.rows) {
      try {
        await generateForParent(row.id);
      } catch (err) {
        console.error(`[CRON] Parent tip failed for ${row.id}:`, err.message);
      }
    }
    console.log('[CRON] Parent tips done.');
  } catch (err) {
    console.error('[CRON] Weekly parent tips job failed:', err.message);
  }
};

// ─── Re-screening Flag Check ───────────────────────────────────────────────────
// Runs 03:30 IST daily — flags students due for re-screening and sends notification
const runRescreeningCheck = async () => {
  console.log('[CRON] Checking re-screening schedule…');
  try {
    const result = await query(
      `SELECT u.id, u.name, u.fcm_token, s.next_screening_at
       FROM students s
       JOIN users u ON u.id = s.user_id
       WHERE s.next_screening_at <= NOW() + INTERVAL '3 days'
         AND s.next_screening_at > NOW()
       LIMIT 200`
    );

    for (const student of result.rows) {
      // Insert a notification
      try {
        await query(
          `INSERT INTO notifications (id, user_id, type, title, body, sent_at)
           VALUES (uuid_generate_v4(), $1, 'rescreening_due',
            'Time for your quarterly check-up! 📝',
            'Your learning check-up is due in the next 3 days. It only takes 10 minutes!',
            NOW())`,
          [student.id]
        );
      } catch (err) {
        // ignore duplicate notifications
      }
    }
    console.log(`[CRON] Re-screening check done. ${result.rows.length} students flagged.`);
  } catch (err) {
    console.error('[CRON] Re-screening check failed:', err.message);
  }
};

// ─── Question Variant Generation ──────────────────────────────────────────────
// Runs Wednesday 03:00 IST (21:30 UTC Tue) — weekly, generates new test variants
const runQuestionVariants = async () => {
  console.log('[CRON] Starting question variant generation…');
  try {
    if (generateQuestionVariants) {
      await generateQuestionVariants();
    }
    console.log('[CRON] Question variants done.');
  } catch (err) {
    console.error('[CRON] Question variant job failed:', err.message);
  }
};

// ─── Register all cron jobs ────────────────────────────────────────────────────
const startCronJobs = () => {
  if (process.env.NODE_ENV === 'test') return;

  // Nightly at 20:30 UTC (02:00 IST)
  cron.schedule('30 20 * * *', runNightlyErrorPatterns, { timezone: 'UTC' });

  // Weekly student recs: Sunday 16:30 UTC
  cron.schedule('30 16 * * 0', () => {
    runWeeklyStudentRecs();
    runWeeklyParentTips();
  }, { timezone: 'UTC' });

  // Weekly teacher recs: Monday 00:30 UTC
  cron.schedule('30 0 * * 1', runWeeklyTeacherRecs, { timezone: 'UTC' });

  // Question variants: Wednesday 21:30 UTC
  cron.schedule('30 21 * * 2', runQuestionVariants, { timezone: 'UTC' });

  // Re-screening: Daily 22:00 UTC (03:30 IST)
  cron.schedule('0 22 * * *', runRescreeningCheck, { timezone: 'UTC' });

  // Daily exercise reminder: 03:30 UTC (09:00 IST) — students who haven't practised today
  cron.schedule('30 3 * * *', sendDailyExerciseReminder, { timezone: 'UTC' });

  // Teacher inactivity alerts: Daily 04:00 UTC (09:30 IST)
  cron.schedule('0 4 * * *', sendTeacherInactivityAlerts, { timezone: 'UTC' });

  // Weekly parent SMS digest: Sunday 17:00 UTC (22:30 IST)
  cron.schedule('0 17 * * 0', sendWeeklyParentSMS, { timezone: 'UTC' });

  console.log('[CRON] All cron jobs registered.');
};

module.exports = {
  startCronJobs,
  // Expose for manual triggers via admin API
  runNightlyErrorPatterns,
  runWeeklyStudentRecs,
  runWeeklyTeacherRecs,
  runRescreeningCheck,
  runQuestionVariants,
  sendDailyExerciseReminder,
  sendTeacherInactivityAlerts,
  sendWeeklyParentSMS,
};
