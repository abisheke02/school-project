const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.get('/routes', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT r.*, COUNT(st.id)::int AS student_count FROM transport_routes r LEFT JOIN student_transport st ON st.route_id = r.id AND st.is_active = true WHERE r.school_id = $1 GROUP BY r.id ORDER BY r.route_name`, [req.user.schoolId]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/routes', requireAuth, requireRole('super_admin', 'school_admin', 'principal'), async (req, res, next) => {
  try {
    const { route_name, vehicle_no, driver_name, driver_phone, capacity } = req.body;
    if (!route_name) return res.status(400).json({ error: 'route_name is required' });
    const { rows } = await query(`INSERT INTO transport_routes (school_id, route_name, vehicle_no, driver_name, driver_phone, capacity) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [req.user.schoolId, route_name, vehicle_no || null, driver_name || null, driver_phone || null, capacity || 40]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/assign', requireAuth, requireRole('super_admin', 'school_admin', 'principal'), async (req, res, next) => {
  try {
    const { student_id, route_id, stop_id } = req.body;
    if (!student_id || !route_id) return res.status(400).json({ error: 'student_id and route_id are required' });
    const { rows } = await query(`INSERT INTO student_transport (student_id, route_id, stop_id) VALUES ($1,$2,$3) ON CONFLICT (student_id) DO UPDATE SET route_id=$2, stop_id=$3, is_active=true RETURNING *`, [student_id, route_id, stop_id || null]);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
