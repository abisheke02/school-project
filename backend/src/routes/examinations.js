const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { class_id } = req.query;
    let sql = `SELECT es.*, c.name AS class_name, c.section, su.name AS subject_name FROM exam_schedules es JOIN classes c ON c.id = es.class_id JOIN subjects su ON su.id = es.subject_id WHERE es.school_id = $1`;
    const params = [req.user.schoolId];
    if (class_id) { params.push(class_id); sql += ` AND es.class_id = $${params.length}`; }
    sql += ' ORDER BY es.exam_date DESC';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('super_admin', 'school_admin', 'principal'), async (req, res, next) => {
  try {
    const { class_id, subject_id, exam_type, exam_date, start_time, end_time, max_marks, passing_marks, room, academic_year_id, term_id } = req.body;
    if (!class_id || !subject_id || !exam_date || !exam_type) return res.status(400).json({ error: 'class_id, subject_id, exam_date, exam_type are required' });
    const { rows } = await query(`INSERT INTO exam_schedules (school_id, class_id, subject_id, exam_type, exam_date, start_time, end_time, max_marks, passing_marks, room, academic_year_id, term_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`, [req.user.schoolId, class_id, subject_id, exam_type, exam_date, start_time || null, end_time || null, max_marks || 100, passing_marks || 35, room || null, academic_year_id || null, term_id || null]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.get('/:id/results', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT er.*, s.name AS student_name, s.roll_number FROM exam_results er JOIN students s ON s.id = er.student_id WHERE er.exam_schedule_id = $1 ORDER BY s.roll_number, s.name`, [req.params.id]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/:id/results', requireAuth, requireRole('super_admin', 'school_admin', 'principal', 'teacher'), async (req, res, next) => {
  try {
    const { results } = req.body;
    if (!Array.isArray(results)) return res.status(400).json({ error: 'results[] is required' });
    for (const r of results) {
      await query(`INSERT INTO exam_results (exam_schedule_id, student_id, marks_obtained, is_absent, remarks, entered_by) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (exam_schedule_id, student_id) DO UPDATE SET marks_obtained=$3, is_absent=$4, remarks=$5, entered_by=$6`, [req.params.id, r.student_id, r.marks_obtained ?? null, r.is_absent || false, r.remarks || null, req.user.userId]);
    }
    res.json({ message: `Results saved for ${results.length} students` });
  } catch (err) { next(err); }
});

module.exports = router;
