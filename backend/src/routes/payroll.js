const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.get('/', requireAuth, requireRole('super_admin', 'school_admin', 'principal'), async (req, res, next) => {
  try {
    const { month, year } = req.query;
    let sql = `SELECT pr.*, u.name AS staff_name, st.employee_code, st.staff_type FROM payroll_records pr JOIN staff st ON st.id = pr.staff_id JOIN users u ON u.id = st.user_id WHERE pr.school_id = $1`;
    const params = [req.user.schoolId];
    if (month) { params.push(month); sql += ` AND pr.month = $${params.length}`; }
    if (year)  { params.push(year);  sql += ` AND pr.year  = $${params.length}`; }
    sql += ' ORDER BY u.name';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const { month, year, staff_payroll } = req.body;
    if (!month || !year || !Array.isArray(staff_payroll)) return res.status(400).json({ error: 'month, year, and staff_payroll[] are required' });
    const results = [];
    for (const sp of staff_payroll) {
      const net = Number(sp.basic_salary) + Number(sp.allowances || 0) - Number(sp.deductions || 0);
      const { rows } = await query(`INSERT INTO payroll_records (school_id, staff_id, month, year, basic_salary, allowances, deductions, net_salary) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (staff_id, month, year) DO UPDATE SET basic_salary=$5, allowances=$6, deductions=$7, net_salary=$8 RETURNING *`, [req.user.schoolId, sp.staff_id, month, year, sp.basic_salary, sp.allowances || 0, sp.deductions || 0, net]);
      results.push(rows[0]);
    }
    res.status(201).json(results);
  } catch (err) { next(err); }
});

router.put('/:id/mark-paid', requireAuth, requireRole('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const { payment_date, payment_mode, bank_reference } = req.body;
    const { rows } = await query(`UPDATE payroll_records SET status='paid', payment_date=$1, payment_mode=$2, bank_reference=$3 WHERE id=$4 AND school_id=$5 RETURNING *`, [payment_date || new Date().toISOString().split('T')[0], payment_mode || 'bank_transfer', bank_reference || null, req.params.id, req.user.schoolId]);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
