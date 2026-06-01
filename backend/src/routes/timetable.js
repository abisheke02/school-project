const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { class_id, day_of_week } = req.query;
    let sql = `SELECT t.*, su.name AS subject_name, u.name AS teacher_name FROM timetable t JOIN subjects su ON su.id = t.subject_id LEFT JOIN staff st ON st.id = t.staff_id LEFT JOIN users u ON u.id = st.user_id WHERE t.school_id = $1`;
    const params = [req.user.schoolId];
    if (class_id)    { params.push(class_id);    sql += ` AND t.class_id = $${params.length}`; }
    if (day_of_week != null) { params.push(day_of_week); sql += ` AND t.day_of_week = $${params.length}`; }
    sql += ' ORDER BY t.day_of_week, t.period_number';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('super_admin', 'school_admin', 'principal'), async (req, res, next) => {
  try {
    const { class_id, subject_id, staff_id, day_of_week, period_number, start_time, end_time, room } = req.body;
    if (!class_id || !subject_id || day_of_week == null || !period_number) return res.status(400).json({ error: 'class_id, subject_id, day_of_week, period_number are required' });
    const { rows } = await query(`INSERT INTO timetable (school_id, class_id, subject_id, staff_id, day_of_week, period_number, start_time, end_time, room) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (class_id, day_of_week, period_number) DO UPDATE SET subject_id=$3, staff_id=$4, start_time=$7, end_time=$8, room=$9 RETURNING *`, [req.user.schoolId, class_id, subject_id, staff_id || null, day_of_week, period_number, start_time, end_time, room || null]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requireRole('super_admin', 'school_admin', 'principal'), async (req, res, next) => {
  try {
    await query(`DELETE FROM timetable WHERE id = $1 AND school_id = $2`, [req.params.id, req.user.schoolId]);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
