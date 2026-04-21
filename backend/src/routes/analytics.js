// Analytics Routes — Phase 5
// Teacher class dashboards: heatmap data, at-risk detection, 14-day trends
// Student analytics: streak, score trend, level progress, weak areas

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

// ─── GET /api/analytics/class/:classId/heatmap ────────────────────────────────
// Returns student × error-type grid for the class heatmap
router.get('/class/:classId/heatmap', requireAuth, requireRole('teacher', 'admin'), async (req, res, next) => {
  try {
    const { classId } = req.params;

    const result = await query(
      `SELECT
         u.id as student_id,
         u.name,
         s.ld_type,
         s.ld_risk_score,
         s.current_level,
         s.streak_count,
         -- Error counts by type (last 30 days)
         COUNT(CASE WHEN se.error_type = 'phonics'   THEN 1 END) as phonics_errors,
         COUNT(CASE WHEN se.error_type = 'reading'   THEN 1 END) as reading_errors,
         COUNT(CASE WHEN se.error_type = 'writing'   THEN 1 END) as writing_errors,
         COUNT(CASE WHEN se.error_type = 'math'      THEN 1 END) as math_errors,
         -- Recent score (last 7 days avg)
         AVG(CASE WHEN ps.completed_at > NOW() - INTERVAL '7 days' THEN pse.score_percent END) as week_avg_score,
         -- Score from 14 days ago (for trend)
         AVG(CASE
           WHEN ps.completed_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
           THEN pse.score_percent END) as prev_week_avg
       FROM class_students cs
       JOIN users u ON u.id = cs.student_id
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN student_errors se ON se.student_id = u.id
         AND se.timestamp > NOW() - INTERVAL '30 days'
       LEFT JOIN practice_session_exercises pse ON pse.session_id IN (
         SELECT id FROM practice_sessions WHERE student_id = u.id
       )
       LEFT JOIN practice_sessions ps ON ps.id = pse.session_id
       WHERE cs.class_id = $1
       GROUP BY u.id, u.name, s.ld_type, s.ld_risk_score, s.current_level, s.streak_count
       ORDER BY u.name ASC`,
      [classId]
    );

    res.json({ students: result.rows });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/analytics/class/:classId/at-risk ────────────────────────────────
// Students whose 7-day avg score dropped ≥15% vs previous 7-day avg
router.get('/class/:classId/at-risk', requireAuth, requireRole('teacher', 'admin'), async (req, res, next) => {
  try {
    const { classId } = req.params;

    const result = await query(
      `SELECT
         u.id as student_id,
         u.name,
         s.ld_type,
         s.ld_risk_score,
         s.current_level,
         ROUND(AVG(CASE WHEN ps.completed_at > NOW() - INTERVAL '7 days'
           THEN pse.score_percent END)::numeric, 1) as this_week_avg,
         ROUND(AVG(CASE
           WHEN ps.completed_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
           THEN pse.score_percent END)::numeric, 1) as last_week_avg,
         MAX(ps.completed_at) as last_active_at
       FROM class_students cs
       JOIN users u ON u.id = cs.student_id
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN practice_sessions ps ON ps.student_id = u.id
       LEFT JOIN practice_session_exercises pse ON pse.session_id = ps.id
       WHERE cs.class_id = $1
       GROUP BY u.id, u.name, s.ld_type, s.ld_risk_score, s.current_level
       HAVING
         (AVG(CASE WHEN ps.completed_at > NOW() - INTERVAL '7 days' THEN pse.score_percent END)
          < AVG(CASE WHEN ps.completed_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
            THEN pse.score_percent END) - 15)
         OR MAX(ps.completed_at) < NOW() - INTERVAL '3 days'
         OR MAX(ps.completed_at) IS NULL
       ORDER BY this_week_avg ASC NULLS FIRST`,
      [classId]
    );

    res.json({ atRisk: result.rows });
  } catch (err) {
    next(err);
  }
});

const DEMO_STUDENT_ID = '00000000-0000-0000-0000-000000000002';

const MOCK_ANALYTICS = {
  profile: {
    name: 'Arjun Sharma', current_level: 2, streak_count: 7,
    ld_type: 'dyslexia', ld_risk_score: 68, total_minutes_today: 18,
  },
  trend: (() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push({
        date: d.toISOString().split('T')[0],
        avg_score: (45 + Math.round(Math.random() * 35 + i * 1.5)).toString(),
        exercises_done: String(2 + Math.round(Math.random() * 3)),
      });
    }
    return days;
  })(),
  weakAreas: [
    { error_type: 'phonics', count: '24', avg_ms: '3200' },
    { error_type: 'reading', count: '18', avg_ms: '4100' },
    { error_type: 'writing', count: '11', avg_ms: '5800' },
  ],
  levelHistory: [{ from_level: 1, to_level: 2, unlocked_at: new Date(Date.now() - 7 * 86400000).toISOString() }],
  testSummary: [
    { level: 1, best_score: '85', ever_passed: true, attempts: '3' },
    { level: 2, best_score: '62', ever_passed: false, attempts: '2' },
  ],
};

const getStudentAnalytics = async (studentId, res, next) => {
  if (studentId === DEMO_STUDENT_ID) {
    return res.json(MOCK_ANALYTICS);
  }
  try {
    // 14-day daily score trend
    const trendResult = await query(
      `SELECT
         date,
         ROUND(AVG(score_percent)::numeric, 1) as avg_score,
         SUM(exercises_done) as exercises_done
       FROM (
         SELECT
           ps.completed_at::date as date,
           pse.score_percent,
           1 as exercises_done
         FROM practice_sessions ps
         JOIN practice_session_exercises pse ON pse.session_id = ps.id
         WHERE ps.student_id = $1
           AND ps.completed_at > NOW() - INTERVAL '14 days'
           AND ps.completed_at IS NOT NULL
       ) sub
       GROUP BY date
       ORDER BY date ASC`,
      [studentId]
    );

    // Weak areas (top error types last 30 days)
    const weakResult = await query(
      `SELECT error_type, COUNT(*) as count,
              ROUND(AVG(response_time_ms)::numeric, 0) as avg_ms
       FROM student_errors
       WHERE student_id = $1
         AND timestamp > NOW() - INTERVAL '30 days'
       GROUP BY error_type
       ORDER BY count DESC
       LIMIT 4`,
      [studentId]
    );

    // Student profile
    const profileResult = await query(
      `SELECT u.name, s.current_level, s.streak_count, s.ld_type,
              s.ld_risk_score,
              COALESCE(SUM(ds.minutes_active), 0) as total_minutes_today
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN daily_stats ds ON ds.student_id = s.user_id AND ds.date = CURRENT_DATE
       WHERE s.user_id = $1
       GROUP BY u.name, s.current_level, s.streak_count, s.ld_type, s.ld_risk_score`,
      [studentId]
    );

    // Level history (badges earned)
    const levelResult = await query(
      `SELECT from_level, to_level, unlocked_at
       FROM level_history
       WHERE student_id = $1
       ORDER BY unlocked_at ASC`,
      [studentId]
    );

    // Test performance summary
    const testResult = await query(
      `SELECT level, MAX(score_percent) as best_score, BOOL_OR(passed) as ever_passed,
              COUNT(*) as attempts
       FROM test_attempts
       WHERE student_id = $1
       GROUP BY level
       ORDER BY level ASC`,
      [studentId]
    );

    res.json({
      profile: profileResult.rows[0] || null,
      trend: trendResult.rows,
      weakAreas: weakResult.rows,
      levelHistory: levelResult.rows,
      testSummary: testResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/analytics/student/me ────────────────────────────────────────────
router.get('/student/me', requireAuth, (req, res, next) =>
  getStudentAnalytics(req.user.userId, res, next)
);

// ─── GET /api/analytics/student/:studentId ────────────────────────────────────
router.get('/student/:studentId', requireAuth, (req, res, next) =>
  getStudentAnalytics(req.params.studentId, res, next)
);

// ─── GET /api/analytics/admin/overview ───────────────────────────────────────
// Admin: school-wide LD distribution + cohort improvement rates
router.get('/admin/overview', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const ldDistResult = await query(
      `SELECT s.ld_type, COUNT(*) as count
       FROM students s
       JOIN users u ON u.id = s.user_id
       GROUP BY s.ld_type
       ORDER BY count DESC`
    );

    const schoolsResult = await query(
      `SELECT sc.id, sc.name, sc.plan_type, sc.max_students,
              COUNT(u.id) as total_students,
              sc.subscription_expires_at
       FROM schools sc
       LEFT JOIN users u ON u.school_id = sc.id AND u.role = 'student'
       GROUP BY sc.id
       ORDER BY total_students DESC`
    );

    const improvementResult = await query(
      `SELECT
         ROUND(AVG(CASE WHEN ds.date > CURRENT_DATE - 7 THEN ds.score_avg END)::numeric, 1) as this_week_avg,
         ROUND(AVG(CASE WHEN ds.date BETWEEN CURRENT_DATE - 14 AND CURRENT_DATE - 7 THEN ds.score_avg END)::numeric, 1) as last_week_avg
       FROM daily_stats ds`
    );

    res.json({
      ldDistribution: ldDistResult.rows,
      schools: schoolsResult.rows,
      platformImprovement: improvementResult.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
