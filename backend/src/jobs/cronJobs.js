const cron = require('node-cron');
const { query } = require('../config/database');

const startCronJobs = () => {
  // Daily fee reconciliation 8 PM
  cron.schedule('0 20 * * *', async () => {
    console.log('[CRON] Fee reconciliation...');
    try { await query(`UPDATE fee_outstanding SET updated_at=NOW() WHERE due_amount > 0`); } catch (err) { console.error('[CRON] Fee error:', err.message); }
  });

  // Weekly fee reminders Monday 8 AM
  cron.schedule('0 8 * * 1', async () => {
    console.log('[CRON] Fee reminders...');
    try {
      const { rows } = await query(`SELECT fo.student_id, s.name FROM fee_outstanding fo JOIN students s ON s.id=fo.student_id WHERE fo.due_amount > 0 AND fo.due_date < NOW() + INTERVAL '7 days' LIMIT 100`);
      console.log(`[CRON] ${rows.length} students with upcoming fees`);
    } catch (err) { console.error('[CRON] Reminder error:', err.message); }
  });

  // Nightly LD error pattern analysis 1 AM
  cron.schedule('0 1 * * *', async () => {
    console.log('[CRON] Analysing error patterns...');
    try {
      const { rows: students } = await query(`SELECT DISTINCT student_id FROM exercise_attempts WHERE created_at > NOW() - INTERVAL '7 days'`);
      for (const { student_id } of students) {
        const { rows: errors } = await query(`SELECT error_type, COUNT(*)::int AS count FROM exercise_attempts WHERE student_id=$1 AND error_type IS NOT NULL AND created_at > NOW() - INTERVAL '7 days' GROUP BY error_type ORDER BY count DESC LIMIT 3`, [student_id]);
        for (const e of errors) {
          await query(`INSERT INTO error_patterns (student_id, pattern_type, frequency, last_seen_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT DO NOTHING`, [student_id, e.error_type, e.count]).catch(() => {});
        }
      }
      console.log(`[CRON] Error patterns updated for ${students.length} students`);
    } catch (err) { console.error('[CRON] Error pattern job failed:', err.message); }
  });

  // Weekly recommendations Sunday 11 PM
  cron.schedule('0 23 * * 0', async () => {
    console.log('[CRON] Generating recommendations...');
    try {
      const { rows: students } = await query(`SELECT id, ld_type FROM students WHERE is_active=true AND ld_type IS NOT NULL LIMIT 200`);
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split('T')[0];
      for (const s of students) {
        const existing = await query(`SELECT id FROM student_recommendations WHERE student_id=$1 AND week_start=$2`, [s.id, weekStartStr]);
        if (existing.rows.length) continue;
        await query(`INSERT INTO student_recommendations (student_id, week_start, summary, generated_by) VALUES ($1,$2,$3,'auto')`, [s.id, weekStartStr, `Continue working on ${s.ld_type} exercises this week.`]).catch(() => {});
      }
      console.log(`[CRON] Recommendations for ${students.length} students`);
    } catch (err) { console.error('[CRON] Recommendations failed:', err.message); }
  });

  // Daily re-screening check 9 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      const { rows } = await query(`SELECT COUNT(*)::int AS count FROM students WHERE is_active=true AND next_screening_at IS NOT NULL AND next_screening_at <= NOW()`);
      console.log(`[CRON] ${rows[0].count} students due for re-screening`);
    } catch (err) { console.error('[CRON] Re-screening check error:', err.message); }
  });

  console.log('[CRON] All cron jobs scheduled');
};

module.exports = { startCronJobs };
