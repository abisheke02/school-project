// DPDP (India Data Protection) & Compliance Routes — Phase 6
// Consent management, data export, right to be forgotten

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

// ─── POST /api/compliance/consent ────────────────────────────────────────────
// Record user consent on signup
router.post('/consent', requireAuth, async (req, res, next) => {
  try {
    const { consentType = 'data_processing', granted = true } = req.body;
    const userId = req.user.userId;

    await query(
      `INSERT INTO consent_records (id, user_id, consent_type, granted, ip_address, granted_at)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, NOW())
       ON CONFLICT DO NOTHING`,
      [userId, consentType, granted, req.ip]
    );
    res.json({ message: 'Consent recorded' });
  } catch (err) { next(err); }
});

// ─── POST /api/compliance/data-export ────────────────────────────────────────
// User requests export of all their data (DPDP right-to-access)
router.post('/data-export', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Create export request
    const result = await query(
      `INSERT INTO data_export_requests (id, user_id, status, requested_at)
       VALUES (uuid_generate_v4(), $1, 'pending', NOW())
       RETURNING id`,
      [userId]
    );

    // Immediately compile export (simple version — returns JSON inline)
    const userData = await compileUserData(userId);

    res.json({
      message: 'Your data export is ready.',
      requestId: result.rows[0].id,
      data: userData,
    });
  } catch (err) { next(err); }
});

// ─── DELETE /api/compliance/delete-account ───────────────────────────────────
// Right to be forgotten — anonymises PII, keeps aggregate data
router.delete('/delete-account', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const anonymisedPhone = `deleted_${Date.now()}`;
    const anonymisedName = 'Deleted User';

    // Anonymise user — don't hard-delete to preserve referential integrity
    await query(
      `UPDATE users
       SET phone = $1, name = $2, email = NULL, fcm_token = NULL
       WHERE id = $3`,
      [anonymisedPhone, anonymisedName, userId]
    );

    // Hard-delete sensitive screening data
    await query(`DELETE FROM screening_sessions WHERE student_id = $1`, [userId]);
    await query(`DELETE FROM student_errors WHERE student_id = $1`, [userId]);
    await query(`DELETE FROM consent_records WHERE user_id = $1`, [userId]);
    await query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
    await query(`DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1`, [userId]);

    res.json({ message: 'Account data anonymised. Aggregate learning data retained for platform improvement.' });
  } catch (err) { next(err); }
});

// ─── GET /api/compliance/consent-status ─────────────────────────────────────
router.get('/consent-status', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT consent_type, granted, granted_at, withdrawn_at
       FROM consent_records
       WHERE user_id = $1
       ORDER BY granted_at DESC`,
      [req.user.userId]
    );
    res.json({ consents: result.rows });
  } catch (err) { next(err); }
});

// ─── Helper: compile all user data for export ────────────────────────────────
const compileUserData = async (userId) => {
  const [profile, sessions, errors, tests, recs] = await Promise.all([
    query(`SELECT id, name, phone, role, language_pref, created_at FROM users WHERE id = $1`, [userId]),
    query(`SELECT id, date, ld_type_result, risk_score, duration_seconds FROM screening_sessions WHERE student_id = $1`, [userId]),
    query(`SELECT student_answer, correct_answer, error_type, timestamp FROM student_errors WHERE student_id = $1`, [userId]),
    query(`SELECT level, score_percent, passed, attempted_at FROM test_attempts WHERE student_id = $1`, [userId]),
    query(`SELECT audience, generated_at FROM ai_recommendations WHERE student_id = $1`, [userId]),
  ]);

  return {
    profile: profile.rows[0] || null,
    screeningSessions: sessions.rows,
    errors: errors.rows,
    testAttempts: tests.rows,
    recommendations: recs.rows,
    exportedAt: new Date().toISOString(),
  };
};

module.exports = router;
