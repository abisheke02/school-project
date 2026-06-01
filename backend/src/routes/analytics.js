const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.get('/overview', requireAuth, async (req, res, next) => {
  try {
    const sid = req.user.schoolId;
    const [students, staff, classes, attendance, fees, ldStats] = await Promise.all([
      query(`SELECT COUNT(*)::int AS count FROM students WHERE school_id=$1 AND is_active=true`, [sid]),
      query(`SELECT COUNT(*)::int AS count FROM staff WHERE school_id=$1 AND is_active=true`, [sid]),
      query(`SELECT COUNT(*)::int AS count FROM classes WHERE school_id=$1`, [sid]),
      query(`SELECT ROUND(AVG(CASE WHEN status='present' THEN 100 ELSE 0 END),1) AS avg_pct FROM student_attendance sa JOIN students s ON s.id=sa.student_id WHERE s.school_id=$1 AND sa.date >= CURRENT_DATE - 30`, [sid]),
      query(`SELECT SUM(total_amount)::numeric AS collected FROM fee_transactions WHERE school_id=$1 AND payment_date >= CURRENT_DATE - 30`, [sid]),
      query(`SELECT COUNT(*) FILTER (WHERE ld_type IS NOT NULL)::int AS with_ld, COUNT(*) FILTER (WHERE screening_status='pending')::int AS unscreened FROM students WHERE school_id=$1 AND is_active=true`, [sid]),
    ]);
    res.json({ students: students.rows[0].count, staff: staff.rows[0].count, classes: classes.rows[0].count, attendance_pct: attendance.rows[0].avg_pct || 0, fees_collected_30d: fees.rows[0].collected || 0, ld_students: ldStats.rows[0].with_ld, unscreened_students: ldStats.rows[0].unscreened });
  } catch (err) { next(err); }
});

router.get('/attendance-trend', requireAuth, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const { rows } = await query(`SELECT sa.date, COUNT(*) FILTER (WHERE sa.status='present')::int AS present, COUNT(*) FILTER (WHERE sa.status='absent')::int AS absent, COUNT(*)::int AS total FROM student_attendance sa JOIN students s ON s.id=sa.student_id WHERE s.school_id=$1 AND sa.date >= CURRENT_DATE - $2 GROUP BY sa.date ORDER BY sa.date`, [req.user.schoolId, days]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/ld-overview', requireAuth, requireRole('teacher', 'school_admin', 'principal', 'super_admin'), async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT ld_type, COUNT(*)::int AS count, ROUND(AVG(risk_score),1) AS avg_risk FROM students WHERE school_id=$1 AND is_active=true GROUP BY ld_type ORDER BY count DESC`, [req.user.schoolId]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/student/:studentId', requireAuth, async (req, res, next) => {
  try {
    const [practice, tests, errors] = await Promise.all([
      query(`SELECT DATE_TRUNC('week', started_at)::date AS week, AVG(score)::numeric AS avg_score, COUNT(*)::int AS sessions FROM practice_sessions WHERE student_id=$1 AND completed_at IS NOT NULL GROUP BY week ORDER BY week DESC LIMIT 8`, [req.params.studentId]),
      query(`SELECT level, score, passed, completed_at FROM test_sessions WHERE student_id=$1 ORDER BY completed_at DESC LIMIT 10`, [req.params.studentId]),
      query(`SELECT error_type, COUNT(*)::int AS count FROM exercise_attempts WHERE student_id=$1 AND error_type IS NOT NULL GROUP BY error_type ORDER BY count DESC LIMIT 5`, [req.params.studentId]),
    ]);
    res.json({ practice_trend: practice.rows, test_history: tests.rows, error_patterns: errors.rows });
  } catch (err) { next(err); }
});

module.exports = router;
