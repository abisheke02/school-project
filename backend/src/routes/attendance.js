const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { class_id, date, student_id } = req.query;
    let sql = `SELECT sa.*, s.name AS student_name, s.admission_number, s.roll_number FROM student_attendance sa JOIN students s ON s.id = sa.student_id WHERE sa.school_id = $1`;
    const params = [req.user.schoolId];
    if (class_id)   { params.push(class_id);  sql += ` AND sa.class_id = $${params.length}`; }
    if (date)       { params.push(date);       sql += ` AND sa.date = $${params.length}`; }
    if (student_id) { params.push(student_id); sql += ` AND sa.student_id = $${params.length}`; }
    sql += ' ORDER BY s.name';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const { class_id, month, year } = req.query;
    let sql = `SELECT s.id, s.name, s.admission_number, COUNT(*) FILTER (WHERE sa.status = 'present')::int AS present_days, COUNT(*) FILTER (WHERE sa.status = 'absent')::int AS absent_days, COUNT(*)::int AS total_days, ROUND(COUNT(*) FILTER (WHERE sa.status = 'present') * 100.0 / NULLIF(COUNT(*),0), 1) AS attendance_pct FROM students s LEFT JOIN student_attendance sa ON sa.student_id = s.id AND sa.school_id = $1 WHERE s.school_id = $1 AND s.is_active = true`;
    const params = [req.user.schoolId];
    if (class_id) { params.push(class_id); sql += ` AND s.class_id = $${params.length}`; }
    if (month && year) { params.push(month); params.push(year); sql += ` AND EXTRACT(MONTH FROM sa.date) = $${params.length-1} AND EXTRACT(YEAR FROM sa.date) = $${params.length}`; }
    sql += ' GROUP BY s.id, s.name, s.admission_number ORDER BY s.name';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('super_admin', 'school_admin', 'principal', 'teacher'), async (req, res, next) => {
  try {
    const { class_id, date, records } = req.body;
    if (!class_id || !date || !Array.isArray(records)) return res.status(400).json({ error: 'class_id, date, and records[] are required' });
    for (const r of records) {
      await query(`INSERT INTO student_attendance (school_id, class_id, student_id, date, status, marked_by) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (student_id, subject_id, date) DO UPDATE SET status=$5, marked_by=$6`, [req.user.schoolId, class_id, r.student_id, date, r.status || 'present', req.user.userId]).catch(() =>
        query(`INSERT INTO student_attendance (school_id, class_id, student_id, date, status, marked_by) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`, [req.user.schoolId, class_id, r.student_id, date, r.status || 'present', req.user.userId])
      );
    }
    res.json({ message: `Attendance marked for ${records.length} students` });
  } catch (err) { next(err); }
});

module.exports = router;
