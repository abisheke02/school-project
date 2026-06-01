const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.get('/stats', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    const [schools, students, staff, revenue] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active)::int AS active FROM schools`),
      query(`SELECT COUNT(*)::int AS total FROM students WHERE is_active=true`),
      query(`SELECT COUNT(*)::int AS total FROM staff WHERE is_active=true`),
      query(`SELECT SUM(amount)::numeric AS total FROM payment_transactions WHERE status='paid'`),
    ]);
    res.json({ schools: schools.rows[0], students: students.rows[0].total, staff: staff.rows[0].total, revenue: revenue.rows[0].total || 0 });
  } catch (err) { next(err); }
});

router.get('/schools', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT s.*, (SELECT COUNT(*)::int FROM students st WHERE st.school_id=s.id AND st.is_active=true) AS student_count, (SELECT COUNT(*)::int FROM staff sf WHERE sf.school_id=s.id AND sf.is_active=true) AS staff_count FROM schools s ORDER BY s.created_at DESC`);
    res.json(rows);
  } catch (err) { next(err); }
});

router.put('/schools/:id/subscription', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    const { plan, days = 365 } = req.body;
    const { rows } = await query(`UPDATE schools SET subscription_plan=$1, subscription_ends_at=NOW() + INTERVAL '1 day' * $2, updated_at=NOW() WHERE id=$3 RETURNING *`, [plan, days, req.params.id]);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get('/users', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    const { role, school_id } = req.query;
    let sql = `SELECT u.id, u.name, u.email, u.phone, u.role, u.school_id, u.is_active, u.created_at, s.name AS school_name FROM users u LEFT JOIN schools s ON s.id=u.school_id WHERE 1=1`;
    const params = [];
    if (role)      { params.push(role);      sql += ` AND u.role = $${params.length}`; }
    if (school_id) { params.push(school_id); sql += ` AND u.school_id = $${params.length}`; }
    sql += ' ORDER BY u.created_at DESC LIMIT 100';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/screening-questions', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM screening_questions ORDER BY age_group, category`);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/screening-questions', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    const { age_group, category, question, options, correct_answer, weight } = req.body;
    if (!age_group || !category || !question || !options) return res.status(400).json({ error: 'age_group, category, question, options are required' });
    const { rows } = await query(`INSERT INTO screening_questions (age_group, category, question, options, correct_answer, weight) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [age_group, category, question, JSON.stringify(options), correct_answer || null, weight || 1.0]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.get('/exercises', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM exercises ORDER BY type, difficulty`);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/exercises', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    const { type, sub_type, ld_target, difficulty, title, instructions, content, duration_sec } = req.body;
    if (!type || !title || !instructions || !content) return res.status(400).json({ error: 'type, title, instructions, content are required' });
    const { rows } = await query(`INSERT INTO exercises (type, sub_type, ld_target, difficulty, title, instructions, content, duration_sec) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [type, sub_type || null, ld_target || null, difficulty || 1, title, instructions, JSON.stringify(content), duration_sec || 60]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
