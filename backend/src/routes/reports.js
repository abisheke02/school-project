const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.get('/student/:id', requireAuth, async (req, res, next) => {
  try {
    const [student, exams, attendance, practice, tests] = await Promise.all([
      query(`SELECT s.*, c.name AS class_name, c.section, p.father_name, p.mother_name FROM students s LEFT JOIN classes c ON c.id=s.class_id LEFT JOIN parents p ON p.id=s.parent_id WHERE s.id=$1`, [req.params.id]),
      query(`SELECT es.exam_type, es.exam_date, su.name AS subject, er.marks_obtained, es.max_marks FROM exam_results er JOIN exam_schedules es ON es.id=er.exam_schedule_id JOIN subjects su ON su.id=es.subject_id WHERE er.student_id=$1 ORDER BY es.exam_date DESC LIMIT 20`, [req.params.id]),
      query(`SELECT COUNT(*) FILTER (WHERE status='present')::int AS present, COUNT(*)::int AS total FROM student_attendance WHERE student_id=$1`, [req.params.id]),
      query(`SELECT COUNT(*)::int AS sessions, ROUND(AVG(score),1) AS avg_score FROM practice_sessions WHERE student_id=$1 AND completed_at IS NOT NULL`, [req.params.id]),
      query(`SELECT level, COUNT(*) FILTER (WHERE passed)::int AS passed, COUNT(*)::int AS attempts FROM test_sessions WHERE student_id=$1 GROUP BY level ORDER BY level`, [req.params.id]),
    ]);
    if (!student.rows.length) return res.status(404).json({ error: 'Student not found' });
    res.json({ student: student.rows[0], exam_results: exams.rows, attendance: attendance.rows[0], practice_summary: practice.rows[0], test_progress: tests.rows });
  } catch (err) { next(err); }
});

router.get('/class/:id', requireAuth, requireRole('teacher', 'school_admin', 'principal', 'super_admin'), async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT s.name, s.roll_number, COUNT(sa.id) FILTER (WHERE sa.status='present')::int AS present_days, COUNT(sa.id)::int AS total_days, ROUND(AVG(er.marks_obtained),1) AS avg_marks, s.ld_type, s.screening_status FROM students s LEFT JOIN student_attendance sa ON sa.student_id = s.id LEFT JOIN exam_results er ON er.student_id = s.id WHERE s.class_id = $1 AND s.is_active = true GROUP BY s.id, s.name, s.roll_number, s.ld_type, s.screening_status ORDER BY s.roll_number, s.name`, [req.params.id]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/fees', requireAuth, requireRole('super_admin', 'school_admin', 'principal'), async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT fh.name AS fee_head, SUM(fri.amount)::numeric AS collected FROM fee_receipt_items fri JOIN fee_heads fh ON fh.id=fri.fee_head_id JOIN fee_transactions ft ON ft.id=fri.transaction_id WHERE ft.school_id=$1 GROUP BY fh.name ORDER BY collected DESC`, [req.user.schoolId]);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
