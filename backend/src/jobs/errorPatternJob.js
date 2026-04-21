// Nightly Error Pattern Job — Phase 3
// Runs nightly at 01:00 IST (19:30 UTC)
// Aggregates student_errors → calls Claude → stores in error_patterns table

const { query } = require('../config/database');
const { detectErrorPatterns } = require('../services/claudeService');

const runErrorPatternJob = async () => {
  console.log('[ErrorPatternJob] Starting at', new Date().toISOString());

  try {
    // Get all students who have had errors in the last 7 days
    const studentsResult = await query(
      `SELECT DISTINCT student_id
       FROM student_errors
       WHERE timestamp > NOW() - INTERVAL '7 days'`
    );
    const students = studentsResult.rows;
    console.log(`[ErrorPatternJob] Processing ${students.length} students`);

    let processed = 0;
    let failed = 0;

    for (const { student_id } of students) {
      try {
        // Pull recent errors for this student
        const errorsResult = await query(
          `SELECT error_type, student_answer, correct_answer,
                  response_time_ms, context_json, timestamp
           FROM student_errors
           WHERE student_id = $1
             AND timestamp > NOW() - INTERVAL '7 days'
           ORDER BY timestamp DESC
           LIMIT 100`,
          [student_id]
        );

        if (!errorsResult.rows.length) continue;

        // Format for Claude
        const errorLogs = errorsResult.rows.map((e) => ({
          errorType: e.error_type,
          studentAnswer: e.student_answer,
          correctAnswer: e.correct_answer,
          responseTimeMs: e.response_time_ms,
          context: e.context_json,
          timestamp: e.timestamp,
        }));

        // Claude detects top patterns
        const patterns = await detectErrorPatterns(errorLogs);

        // Upsert each pattern
        for (const pattern of patterns) {
          await query(
            `INSERT INTO error_patterns
               (id, student_id, pattern_type, frequency, description, detected_at)
             VALUES (uuid_generate_v4(), $1, $2, $3, $4, NOW())
             ON CONFLICT (student_id, pattern_type)
             DO UPDATE SET
               frequency = error_patterns.frequency + $3,
               description = $4,
               detected_at = NOW()`,
            [student_id, pattern.type, pattern.frequency || 1, pattern.description]
          );
        }

        processed++;
      } catch (err) {
        console.error(`[ErrorPatternJob] Failed for student ${student_id}:`, err.message);
        failed++;
      }
    }

    console.log(`[ErrorPatternJob] Done. Processed: ${processed}, Failed: ${failed}`);
    return { processed, failed, total: students.length };
  } catch (err) {
    console.error('[ErrorPatternJob] Fatal error:', err.message);
    throw err;
  }
};

// Schedule at 19:30 UTC = 01:00 IST
if (require.main === module) {
  const RUN_AT_UTC = '19:30';
  console.log(`[ErrorPatternJob] Scheduled for ${RUN_AT_UTC} UTC daily`);

  const scheduleDaily = () => {
    const now = new Date();
    const [h, m] = RUN_AT_UTC.split(':').map(Number);
    const next = new Date();
    next.setUTCHours(h, m, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const msUntilNext = next - now;
    console.log(`[ErrorPatternJob] Next run in ${Math.round(msUntilNext / 60000)} minutes`);
    setTimeout(async () => {
      await runErrorPatternJob();
      scheduleDaily();
    }, msUntilNext);
  };

  scheduleDaily();
}

module.exports = { runErrorPatternJob };
