const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt  = require('bcryptjs');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query, getClient } = require('../config/database');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { class_id, search, ld_type, screening_status } = req.query;
    let sql = `SELECT s.*, c.name AS class_name, c.section FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.school_id = $1 AND s.is_active = true`;
    const params = [req.user.schoolId];
    if (class_id)         { params.push(class_id);          sql += ` AND s.class_id = $${params.length}`; }
    if (ld_type)          { params.push(ld_type);           sql += ` AND s.ld_type = $${params.length}`; }
    if (screening_status) { params.push(screening_status);  sql += ` AND s.screening_status = $${params.length}`; }
    if (search)           { params.push(`%${search}%`);     sql += ` AND (s.name ILIKE $${params.length} OR s.admission_number ILIKE $${params.length})`; }
    sql += ' ORDER BY s.name';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.*, c.name AS class_name, c.section, p.father_name, p.mother_name, p.father_phone, p.mother_phone, u.email, u.phone FROM students s LEFT JOIN classes c ON c.id = s.class_id LEFT JOIN parents p ON p.id = s.parent_id LEFT JOIN users u ON u.id = s.user_id WHERE s.id = $1 AND s.school_id = $2`,
      [req.params.id, req.user.schoolId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Student not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('super_admin', 'school_admin', 'principal', 'teacher'), async (req, res, next) => {
  const client = await getClient();
  try {
    const { name, date_of_birth, gender, class_id, grade, age, blood_group, admission_type, category, email, phone, parent } = req.body;
    if (!name) return res.status(400).json({ error: 'Student name is required' });
    await client.query('BEGIN');
    const admissionNumber = `ADM-${Date.now()}`;
    const { rows: [user] } = await client.query(`INSERT INTO users (school_id, name, role, email, phone) VALUES ($1,$2,'student',$3,$4) RETURNING id`, [req.user.schoolId, name, email || null, phone || null]);
    let parent_id = null;
    if (parent?.father_name || parent?.mother_name) {
      const { rows: [p] } = await client.query(`INSERT INTO parents (school_id, father_name, mother_name, father_phone, mother_phone) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [req.user.schoolId, parent.father_name || null, parent.mother_name || null, parent.father_phone || null, parent.mother_phone || null]);
      parent_id = p.id;
    }
    const { rows: [student] } = await client.query(
      `INSERT INTO students (user_id, school_id, parent_id, admission_number, class_id, name, date_of_birth, gender, grade, age, blood_group, admission_type, category) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [user.id, req.user.schoolId, parent_id, admissionNumber, class_id || null, name, date_of_birth || null, gender || null, grade || null, age || null, blood_group || null, admission_type || 'general', category || null]
    );
    await client.query('COMMIT');
    res.status(201).json(student);
  } catch (err) { await client.query('ROLLBACK'); next(err); }
  finally { client.release(); }
});

router.put('/:id', requireAuth, requireRole('super_admin', 'school_admin', 'principal', 'teacher'), async (req, res, next) => {
  try {
    const { name, class_id, grade, blood_group, gender, date_of_birth, screening_status, ld_type, risk_score, current_level } = req.body;
    const { rows: [s] } = await query(
      `UPDATE students SET name=COALESCE($1,name), class_id=COALESCE($2,class_id), grade=COALESCE($3,grade), blood_group=COALESCE($4,blood_group), gender=COALESCE($5,gender), date_of_birth=COALESCE($6,date_of_birth), screening_status=COALESCE($7,screening_status), ld_type=COALESCE($8,ld_type), risk_score=COALESCE($9,risk_score), current_level=COALESCE($10,current_level), updated_at=NOW() WHERE id=$11 AND school_id=$12 RETURNING *`,
      [name, class_id, grade, blood_group, gender, date_of_birth, screening_status, ld_type, risk_score, current_level, req.params.id, req.user.schoolId]
    );
    if (!s) return res.status(404).json({ error: 'Student not found' });
    res.json(s);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requireRole('super_admin', 'school_admin', 'principal'), async (req, res, next) => {
  try {
    await query(`UPDATE students SET is_active = false, updated_at = NOW() WHERE id = $1 AND school_id = $2`, [req.params.id, req.user.schoolId]);
    res.json({ message: 'Student deactivated' });
  } catch (err) { next(err); }
});

router.post('/:id/invite', requireAuth, requireRole('super_admin', 'school_admin', 'principal', 'teacher'), async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT s.*, u.email FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = $1 AND s.school_id = $2`, [req.params.id, req.user.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'Student not found' });
    const token   = uuidv4();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(`UPDATE users SET invite_token = $1, invite_token_expires_at = $2 WHERE id = $3`, [token, expires, rows[0].user_id]);
    res.json({ message: 'Invite token created', invite_token: token, student_name: rows[0].name });
  } catch (err) { next(err); }
});

module.exports = router;
