const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.post('/consent', requireAuth, async (req, res, next) => {
  try {
    const { consent_type, given } = req.body;
    if (!consent_type) return res.status(400).json({ error: 'consent_type is required' });
    await query(`INSERT INTO consent_records (user_id, consent_type, given, ip_address) VALUES ($1,$2,$3,$4)`, [req.user.userId, consent_type, given !== false, req.ip]);
    res.json({ message: 'Consent recorded' });
  } catch (err) { next(err); }
});

router.get('/consent', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM consent_records WHERE user_id = $1 ORDER BY given_at DESC`, [req.user.userId]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/audit-logs', requireAuth, requireRole('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const { from_date, to_date } = req.query;
    let sql = `SELECT al.*, u.name AS user_name FROM audit_logs al LEFT JOIN users u ON u.id=al.user_id WHERE al.school_id=$1`;
    const params = [req.user.schoolId];
    if (from_date) { params.push(from_date); sql += ` AND al.created_at >= $${params.length}`; }
    if (to_date)   { params.push(to_date);   sql += ` AND al.created_at <= $${params.length}`; }
    sql += ' ORDER BY al.created_at DESC LIMIT 100';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
