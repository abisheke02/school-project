const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.get('/heads', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM fee_heads WHERE school_id = $1 AND is_active = true ORDER BY name`, [req.user.schoolId]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/heads', requireAuth, requireRole('super_admin', 'school_admin', 'principal'), async (req, res, next) => {
  try {
    const { name, description, is_optional } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const { rows } = await query(`INSERT INTO fee_heads (school_id, name, description, is_optional) VALUES ($1,$2,$3,$4) RETURNING *`, [req.user.schoolId, name, description || null, is_optional || false]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.get('/outstanding', requireAuth, async (req, res, next) => {
  try {
    const { student_id, class_id } = req.query;
    let sql = `SELECT fo.*, s.name AS student_name, s.admission_number, c.name AS class_name, fh.name AS fee_head_name FROM fee_outstanding fo JOIN students s ON s.id = fo.student_id LEFT JOIN classes c ON c.id = s.class_id JOIN fee_heads fh ON fh.id = fo.fee_head_id WHERE s.school_id = $1 AND fo.due_amount > 0`;
    const params = [req.user.schoolId];
    if (student_id) { params.push(student_id); sql += ` AND fo.student_id = $${params.length}`; }
    if (class_id)   { params.push(class_id);   sql += ` AND s.class_id = $${params.length}`; }
    sql += ' ORDER BY fo.due_date ASC';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/transactions', requireAuth, async (req, res, next) => {
  try {
    const { student_id, from_date, to_date } = req.query;
    let sql = `SELECT ft.*, s.name AS student_name, s.admission_number, u.name AS collected_by_name FROM fee_transactions ft JOIN students s ON s.id = ft.student_id LEFT JOIN users u ON u.id = ft.collected_by WHERE ft.school_id = $1`;
    const params = [req.user.schoolId];
    if (student_id) { params.push(student_id); sql += ` AND ft.student_id = $${params.length}`; }
    if (from_date)  { params.push(from_date);  sql += ` AND ft.payment_date >= $${params.length}`; }
    if (to_date)    { params.push(to_date);    sql += ` AND ft.payment_date <= $${params.length}`; }
    sql += ' ORDER BY ft.payment_date DESC';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/collect', requireAuth, requireRole('super_admin', 'school_admin', 'principal', 'teacher'), async (req, res, next) => {
  try {
    const { student_id, academic_year_id, items, payment_mode, bank_reference, remarks } = req.body;
    if (!student_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'student_id and items[] are required' });
    const total = items.reduce((sum, i) => sum + Number(i.amount), 0);
    const receiptNumber = `REC-${Date.now()}`;
    const { rows: [tx] } = await query(`INSERT INTO fee_transactions (school_id, student_id, academic_year_id, receipt_number, total_amount, payment_mode, bank_reference, collected_by, remarks) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [req.user.schoolId, student_id, academic_year_id || null, receiptNumber, total, payment_mode || 'cash', bank_reference || null, req.user.userId, remarks || null]);
    for (const item of items) {
      await query(`INSERT INTO fee_receipt_items (transaction_id, fee_head_id, amount) VALUES ($1,$2,$3)`, [tx.id, item.fee_head_id, item.amount]);
      await query(`UPDATE fee_outstanding SET paid_amount = paid_amount + $1, updated_at = NOW() WHERE student_id = $2 AND fee_head_id = $3`, [item.amount, student_id, item.fee_head_id]);
    }
    res.status(201).json({ receipt: tx, message: 'Payment recorded' });
  } catch (err) { next(err); }
});

router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT SUM(total_amount)::numeric AS total_collected, COUNT(*)::int AS total_transactions, SUM(total_amount) FILTER (WHERE payment_date >= NOW() - INTERVAL '30 days')::numeric AS this_month FROM fee_transactions WHERE school_id = $1`, [req.user.schoolId]);
    const outstanding = await query(`SELECT SUM(due_amount)::numeric AS total_due FROM fee_outstanding fo JOIN students s ON s.id = fo.student_id WHERE s.school_id = $1`, [req.user.schoolId]);
    res.json({ ...rows[0], total_due: outstanding.rows[0].total_due });
  } catch (err) { next(err); }
});

module.exports = router;
