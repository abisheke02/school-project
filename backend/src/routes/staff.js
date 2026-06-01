const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { staff_type, search } = req.query;
    let sql = `SELECT st.*, u.name, u.email, u.phone, d.name AS department_name FROM staff st JOIN users u ON u.id = st.user_id LEFT JOIN departments d ON d.id = st.department_id WHERE st.school_id = $1 AND st.is_active = true`;
    const params = [req.user.schoolId];
    if (staff_type) { params.push(staff_type); sql += ` AND st.staff_type = $${params.length}`; }
    if (search)     { params.push(`%${search}%`); sql += ` AND u.name ILIKE $${params.length}`; }
    sql += ' ORDER BY u.name';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT st.*, u.name, u.email, u.phone, d.name AS department_name FROM staff st JOIN users u ON u.id = st.user_id LEFT JOIN departments d ON d.id = st.department_id WHERE st.id = $1 AND st.school_id = $2`, [req.params.id, req.user.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'Staff not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('super_admin', 'school_admin', 'principal'), async (req, res, next) => {
  try {
    const { name, email, phone, staff_type, department_id, employee_code, date_of_joining, gender, date_of_birth, address, emergency_contact } = req.body;
    if (!name || !staff_type) return res.status(400).json({ error: 'name and staff_type are required' });
    const { rows: [user] } = await query(`INSERT INTO users (school_id, name, email, phone, role) VALUES ($1,$2,$3,$4,'teacher') RETURNING id`, [req.user.schoolId, name, email || null, phone || null]);
    const { rows: [staff] } = await query(`INSERT INTO staff (user_id, school_id, staff_type, department_id, employee_code, date_of_joining, gender, date_of_birth, address, emergency_contact) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [user.id, req.user.schoolId, staff_type, department_id || null, employee_code || null, date_of_joining || null, gender || null, date_of_birth || null, address || null, emergency_contact || null]);
    res.status(201).json({ ...staff, name, email, phone });
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, requireRole('super_admin', 'school_admin', 'principal'), async (req, res, next) => {
  try {
    const { staff_type, department_id, employee_code, address, emergency_contact } = req.body;
    const { rows: [staff] } = await query(`UPDATE staff SET staff_type=COALESCE($1,staff_type), department_id=COALESCE($2,department_id), employee_code=COALESCE($3,employee_code), address=COALESCE($4,address), emergency_contact=COALESCE($5,emergency_contact), updated_at=NOW() WHERE id=$6 AND school_id=$7 RETURNING *`, [staff_type, department_id, employee_code, address, emergency_contact, req.params.id, req.user.schoolId]);
    res.json(staff);
  } catch (err) { next(err); }
});

module.exports = router;
