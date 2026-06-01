const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.get('/', requireAuth, requireRole('super_admin', 'school_admin', 'principal'), async (req, res, next) => {
  try {
    const { class_id } = req.query;
    let sql = `SELECT s.*, c.name AS class_name, c.section, p.father_name, p.mother_name, p.father_phone FROM students s LEFT JOIN classes c ON c.id = s.class_id LEFT JOIN parents p ON p.id = s.parent_id WHERE s.school_id = $1`;
    const params = [req.user.schoolId];
    if (class_id) { params.push(class_id); sql += ` AND s.class_id = $${params.length}`; }
    sql += ' ORDER BY s.created_at DESC';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS this_month, COUNT(*) FILTER (WHERE admission_type = 'management_quota')::int AS management_quota, COUNT(*) FILTER (WHERE admission_type = 'general')::int AS general FROM students WHERE school_id = $1 AND is_active = true`, [req.user.schoolId]);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('super_admin', 'school_admin', 'principal'), async (req, res, next) => {
  try {
    const { name, date_of_birth, gender, grade, class_id, blood_group, admission_type, category, address, parent } = req.body;
    if (!name || !grade) return res.status(400).json({ error: 'name and grade are required' });
    const admissionNumber = `ADM-${Date.now()}`;
    const { rows: [user] } = await query(`INSERT INTO users (school_id, name, role) VALUES ($1,$2,'student') RETURNING id`, [req.user.schoolId, name]);
    let parent_id = null;
    if (parent) {
      const { rows: [p] } = await query(`INSERT INTO parents (school_id, father_name, mother_name, father_phone, mother_phone, guardian_name, address) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [req.user.schoolId, parent.father_name || null, parent.mother_name || null, parent.father_phone || null, parent.mother_phone || null, parent.guardian_name || null, address || null]);
      parent_id = p.id;
    }
    const { rows: [student] } = await query(`INSERT INTO students (user_id, school_id, parent_id, admission_number, class_id, name, date_of_birth, gender, grade, blood_group, admission_type, category, address) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`, [user.id, req.user.schoolId, parent_id, admissionNumber, class_id || null, name, date_of_birth || null, gender || null, grade, blood_group || null, admission_type || 'general', category || null, address || null]);
    res.status(201).json(student);
  } catch (err) { next(err); }
});

module.exports = router;
