const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'super_admin') {
      const { rows } = await query(`SELECT * FROM schools ORDER BY created_at DESC`);
      return res.json(rows);
    }
    const { rows } = await query(`SELECT * FROM schools WHERE id = $1`, [req.user.schoolId]);
    res.json(rows[0] || null);
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM schools WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'School not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, city, state, phone, email, board_type, address, pincode } = req.body;
    if (!name) return res.status(400).json({ error: 'School name is required' });
    const code = name.replace(/\s+/g, '').toUpperCase().slice(0, 8) + '-' + Date.now().toString().slice(-4);
    const { rows } = await query(
      `INSERT INTO schools (name, code, city, state, phone, email, board_type, address, pincode) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, code, city, state, phone, email, board_type || 'CBSE', address, pincode]
    );
    const school = rows[0];
    if (['teacher', 'school_admin'].includes(req.user.role)) {
      await query(`UPDATE users SET school_id = $1, role = 'school_admin' WHERE id = $2`, [school.id, req.user.userId]);
    }
    res.status(201).json(school);
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, requireRole('super_admin', 'school_admin', 'principal'), async (req, res, next) => {
  try {
    const { name, city, state, phone, email, board_type, address, logo_url } = req.body;
    const { rows } = await query(
      `UPDATE schools SET name=COALESCE($1,name), city=COALESCE($2,city), state=COALESCE($3,state), phone=COALESCE($4,phone), email=COALESCE($5,email), board_type=COALESCE($6,board_type), address=COALESCE($7,address), logo_url=COALESCE($8,logo_url), updated_at=NOW() WHERE id=$9 RETURNING *`,
      [name, city, state, phone, email, board_type, address, logo_url, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get('/:id/classes', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.*, u.name AS teacher_name, (SELECT COUNT(*)::int FROM students s WHERE s.class_id = c.id AND s.is_active = true) AS student_count FROM classes c LEFT JOIN users u ON u.id = c.teacher_id WHERE c.school_id = $1 ORDER BY c.name, c.section`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/:id/classes', requireAuth, requireRole('super_admin', 'school_admin', 'principal'), async (req, res, next) => {
  try {
    const { name, section, teacher_id, max_students } = req.body;
    if (!name || !section) return res.status(400).json({ error: 'name and section are required' });
    const { rows } = await query(
      `INSERT INTO classes (school_id, name, section, teacher_id, max_students) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, name, section, teacher_id || null, max_students || 40]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/:id/invite-teacher', requireAuth, requireRole('super_admin', 'school_admin', 'principal'), async (req, res, next) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const token = uuidv4();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO users (name, email, role, school_id, invite_token, invite_token_expires_at) VALUES ($1,$2,'teacher',$3,$4,$5) ON CONFLICT (email) DO UPDATE SET invite_token=$4, invite_token_expires_at=$5`,
      [name || email.split('@')[0], email.toLowerCase(), req.params.id, token, expires]
    );
    res.json({ message: 'Invite created', invite_token: token, email });
  } catch (err) { next(err); }
});

router.get('/:id/stats', requireAuth, async (req, res, next) => {
  try {
    const sid = req.params.id;
    const [students, staff, classes] = await Promise.all([
      query(`SELECT COUNT(*)::int AS count FROM students WHERE school_id=$1 AND is_active=true`, [sid]),
      query(`SELECT COUNT(*)::int AS count FROM staff WHERE school_id=$1 AND is_active=true`, [sid]),
      query(`SELECT COUNT(*)::int AS count FROM classes WHERE school_id=$1`, [sid]),
    ]);
    res.json({ students: students.rows[0].count, staff: staff.rows[0].count, classes: classes.rows[0].count });
  } catch (err) { next(err); }
});

module.exports = router;
