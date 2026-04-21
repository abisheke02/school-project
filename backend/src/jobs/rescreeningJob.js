// Re-screening Cron Job
// Runs nightly at midnight IST (18:30 UTC)
// Flags students due for re-screening (every 90 days)
// Sends push notification via Firebase FCM

const { query } = require('../config/database');
const { sendPushNotification } = require('../config/firebase');

const runRescreeningJob = async () => {
  console.log('[RescreeningJob] Starting at', new Date().toISOString());

  try {
    // Find students whose next_screening_at has passed, or who have never been screened
    const result = await query(
      `SELECT u.id as user_id, u.name, u.fcm_token, s.next_screening_at, s.last_screened_at
       FROM students s
       JOIN users u ON u.id = s.user_id
       WHERE (
         s.next_screening_at <= NOW()
         OR s.last_screened_at IS NULL
       )
       AND u.fcm_token IS NOT NULL
       ORDER BY s.next_screening_at ASC NULLS FIRST
       LIMIT 500`
    );

    const students = result.rows;
    console.log(`[RescreeningJob] ${students.length} students due for re-screening`);

    let notified = 0;
    let failed = 0;

    for (const student of students) {
      try {
        const isFirstTime = !student.last_screened_at;
        const title = isFirstTime
          ? '🧠 Complete your learning quiz!'
          : '🔄 Time for your check-in quiz!';
        const body = isFirstTime
          ? 'Take the 10-minute quiz so we can personalise your learning.'
          : `It's been 90 days! Let's see how much you've grown. Take the quick check-in quiz.`;

        await sendPushNotification(student.fcm_token, title, body, {
          type: 'rescreening_due',
          screen: 'ScreeningIntro',
        });

        // Record the notification in DB
        await query(
          `INSERT INTO notifications (id, user_id, type, title, body, sent_at)
           VALUES (uuid_generate_v4(), $1, 'rescreening_due', $2, $3, NOW())`,
          [student.user_id, title, body]
        );

        notified++;
      } catch (err) {
        console.error(`[RescreeningJob] Failed to notify ${student.user_id}:`, err.message);
        failed++;
      }
    }

    console.log(`[RescreeningJob] Done. Notified: ${notified}, Failed: ${failed}`);
    return { notified, failed, total: students.length };
  } catch (err) {
    console.error('[RescreeningJob] Fatal error:', err.message);
    throw err;
  }
};

// Schedule with native setInterval if run directly (dev mode)
// In production, use AWS EventBridge or a cron service instead
if (require.main === module) {
  const MIDNIGHT_IST_UTC = '18:30'; // 18:30 UTC = 00:00 IST
  console.log(`[RescreeningJob] Scheduled for ${MIDNIGHT_IST_UTC} UTC daily`);

  const scheduleDaily = () => {
    const now = new Date();
    const [h, m] = MIDNIGHT_IST_UTC.split(':').map(Number);
    const next = new Date();
    next.setUTCHours(h, m, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const msUntilNext = next - now;
    console.log(`[RescreeningJob] Next run in ${Math.round(msUntilNext / 60000)} minutes`);
    setTimeout(async () => {
      await runRescreeningJob();
      scheduleDaily(); // reschedule
    }, msUntilNext);
  };

  scheduleDaily();
}

module.exports = { runRescreeningJob };
