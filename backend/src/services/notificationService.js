// Notification Service — Phase 5
// Firebase FCM push notifications + Twilio SMS digest
// FCM: daily reminders, milestones, teacher alerts
// Twilio: weekly parent SMS/email digest

const admin = require('firebase-admin');
const { query } = require('../config/database');

// ─── FCM Push Notification ─────────────────────────────────────────────────────
const sendPush = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) return { skipped: true, reason: 'no_fcm_token' };

  const messaging = admin.messaging();
  const message = {
    token: fcmToken,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    android: {
      priority: 'high',
      notification: { channelId: 'ld_platform_default', sound: 'default' },
    },
  };

  try {
    const response = await messaging.send(message);
    return { success: true, messageId: response };
  } catch (err) {
    if (err.code === 'messaging/registration-token-not-registered') {
      // Token stale — clear it
      await query(`UPDATE users SET fcm_token = NULL WHERE fcm_token = $1`, [fcmToken]);
    }
    return { success: false, error: err.message };
  }
};

// ─── Send to multiple tokens (batch) ──────────────────────────────────────────
const sendBatchPush = async (tokens, title, body, data = {}) => {
  if (!tokens.length) return;
  const results = await Promise.allSettled(tokens.map((t) => sendPush(t, title, body, data)));
  const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
  console.log(`[FCM] Batch: ${succeeded}/${tokens.length} sent`);
};

// ─── Daily Exercise Reminder ───────────────────────────────────────────────────
// Sent each morning to students who haven't done any exercise today
const sendDailyExerciseReminder = async () => {
  console.log('[FCM] Sending daily exercise reminders…');
  try {
    const result = await query(
      `SELECT u.fcm_token, u.name
       FROM users u
       JOIN students s ON s.user_id = u.id
       WHERE u.fcm_token IS NOT NULL
         AND u.role = 'student'
         AND NOT EXISTS (
           SELECT 1 FROM practice_sessions ps
           WHERE ps.student_id = u.id
             AND ps.completed_at::date = CURRENT_DATE
         )`,
    );

    for (const row of result.rows) {
      await sendPush(
        row.fcm_token,
        `Time to practice, ${row.name?.split(' ')[0] || 'there'}! 📚`,
        'Your daily exercise is waiting. Even 10 minutes makes a big difference!',
        { screen: 'PracticeHome' },
      );
    }
    console.log(`[FCM] Daily reminders sent to ${result.rows.length} students.`);
  } catch (err) {
    console.error('[FCM] Daily reminder job failed:', err.message);
  }
};

// ─── Milestone Alert ───────────────────────────────────────────────────────────
// Called inline when a student unlocks a new level or hits a streak milestone
const sendMilestoneAlert = async (userId, milestoneType, details = {}) => {
  const userResult = await query(`SELECT fcm_token, name FROM users WHERE id = $1`, [userId]);
  if (!userResult.rows.length) return;
  const { fcm_token, name } = userResult.rows[0];

  const messages = {
    level_unlocked: {
      title: `Level ${details.level} Unlocked! 🎉`,
      body: `Great work, ${name?.split(' ')[0]}! You've reached ${details.levelLabel}.`,
    },
    streak_milestone: {
      title: `${details.days}-Day Streak! 🔥`,
      body: `Amazing! You've practised ${details.days} days in a row. Keep it up!`,
    },
    test_passed: {
      title: 'Test Passed! ⭐',
      body: `You scored ${details.score}%! You've unlocked the next level.`,
    },
  };

  const msg = messages[milestoneType];
  if (!msg) return;

  await sendPush(fcm_token, msg.title, msg.body, { screen: 'Dashboard', type: milestoneType });
};

// ─── Teacher Alert: Student Inactive 3+ Days ──────────────────────────────────
const sendTeacherInactivityAlerts = async () => {
  console.log('[FCM] Checking teacher inactivity alerts…');
  try {
    const result = await query(
      `SELECT DISTINCT t.fcm_token, t.name as teacher_name,
              s.name as student_name, MAX(ps.completed_at) as last_active
       FROM users t
       JOIN classes c ON c.teacher_id = t.id
       JOIN class_students cs ON cs.class_id = c.id
       JOIN users s ON s.id = cs.student_id
       LEFT JOIN practice_sessions ps ON ps.student_id = s.id
       WHERE t.fcm_token IS NOT NULL
         AND t.role = 'teacher'
       GROUP BY t.fcm_token, t.name, s.name
       HAVING MAX(ps.completed_at) < NOW() - INTERVAL '3 days'
          OR MAX(ps.completed_at) IS NULL`,
    );

    // Group by teacher to send one message per teacher
    const byTeacher = {};
    for (const row of result.rows) {
      if (!byTeacher[row.fcm_token]) byTeacher[row.fcm_token] = { name: row.teacher_name, students: [] };
      byTeacher[row.fcm_token].students.push(row.student_name);
    }

    for (const [token, data] of Object.entries(byTeacher)) {
      const count = data.students.length;
      const preview = data.students.slice(0, 2).join(', ');
      await sendPush(
        token,
        `${count} student${count > 1 ? 's' : ''} inactive for 3+ days`,
        `${preview}${count > 2 ? ` and ${count - 2} more` : ''} haven't practised recently.`,
        { screen: 'Dashboard' },
      );
    }
    console.log(`[FCM] Inactivity alerts sent for ${result.rows.length} student-teacher pairs.`);
  } catch (err) {
    console.error('[FCM] Inactivity alert job failed:', err.message);
  }
};

// ─── Twilio SMS Weekly Parent Digest ──────────────────────────────────────────
const sendWeeklyParentSMS = async () => {
  const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    console.warn('[SMS] Twilio not configured — skipping weekly digest');
    return;
  }

  const twilio = require('twilio')(TWILIO_SID, TWILIO_TOKEN);
  console.log('[SMS] Sending weekly parent digest…');

  try {
    // Get parents with their children's weekly stats
    const result = await query(
      `SELECT
         p.id as parent_id, p.name as parent_name, p.phone as parent_phone,
         s_u.name as child_name,
         s.current_level, s.streak_count,
         ROUND(AVG(CASE WHEN ps.completed_at > NOW() - INTERVAL '7 days' THEN pse.score_percent END)::numeric, 0) as this_week_avg,
         ROUND(AVG(CASE WHEN ps.completed_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days' THEN pse.score_percent END)::numeric, 0) as last_week_avg,
         COUNT(DISTINCT CASE WHEN ps.completed_at > NOW() - INTERVAL '7 days' THEN ps.completed_at::date END) as days_active
       FROM users p
       JOIN students s ON s.parent_id = p.id
       JOIN users s_u ON s_u.id = s.user_id
       LEFT JOIN practice_sessions ps ON ps.student_id = s.user_id
       LEFT JOIN practice_session_exercises pse ON pse.session_id = ps.id
       WHERE p.role = 'parent' AND p.phone IS NOT NULL
       GROUP BY p.id, p.name, p.phone, s_u.name, s.current_level, s.streak_count`,
    );

    const LEVEL_LABELS = ['', 'Starter', 'Basic', 'Intermediate', 'Advanced', 'Mastery'];

    let sent = 0;
    for (const row of result.rows) {
      const childFirst = row.child_name?.split(' ')[0] || 'your child';
      const thisWeek = row.this_week_avg ?? '--';
      const lastWeek = row.last_week_avg ?? '--';
      const trend = (row.this_week_avg && row.last_week_avg)
        ? (row.this_week_avg > row.last_week_avg ? `up from ${lastWeek}%` : row.this_week_avg < row.last_week_avg ? `down from ${lastWeek}%` : 'same as last week')
        : '';

      const smsBody = [
        `Hi ${row.parent_name?.split(' ')[0] || 'Parent'}, here is ${childFirst}'s weekly update from LD Platform:`,
        `📊 Score this week: ${thisWeek}%${trend ? ' (' + trend + ')' : ''}`,
        `📅 Days practised: ${row.days_active || 0}/7`,
        `🎯 Current level: ${LEVEL_LABELS[row.current_level] || 'Starter'}`,
        `🔥 Streak: ${row.streak_count || 0} days`,
        `Keep encouraging ${childFirst} to practise daily!`,
      ].join('\n');

      try {
        await twilio.messages.create({
          body: smsBody,
          from: TWILIO_FROM,
          to: row.parent_phone.startsWith('+') ? row.parent_phone : `+91${row.parent_phone}`,
        });
        sent++;
      } catch (err) {
        console.error(`[SMS] Failed for parent ${row.parent_id}:`, err.message);
      }
    }
    console.log(`[SMS] Weekly digest sent to ${sent}/${result.rows.length} parents.`);
  } catch (err) {
    console.error('[SMS] Weekly parent digest job failed:', err.message);
  }
};

module.exports = {
  sendPush,
  sendBatchPush,
  sendMilestoneAlert,
  sendDailyExerciseReminder,
  sendTeacherInactivityAlerts,
  sendWeeklyParentSMS,
};
