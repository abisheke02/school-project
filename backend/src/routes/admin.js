// Admin Routes — Phase 6
// School CRUD, subscription management, platform-wide analytics
// All routes require admin role

const express = require('express');
const Joi = require('joi');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const { startCronJobs, runNightlyErrorPatterns, runWeeklyStudentRecs } = require('../jobs/cronJobs');

const router = express.Router();

// ─── GET /api/admin/schools ───────────────────────────────────────────────────
router.get('/schools', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT sc.id, sc.name, sc.location, sc.plan_type, sc.max_students,
              sc.subscription_expires_at, sc.created_at,
              COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'student') as student_count,
              COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'teacher') as teacher_count
       FROM schools sc
       LEFT JOIN users u ON u.school_id = sc.id
       GROUP BY sc.id
       ORDER BY sc.created_at DESC`
    );
    res.json({ schools: result.rows });
  } catch (err) { next(err); }
});

// ─── POST /api/admin/schools ──────────────────────────────────────────────────
router.post('/schools', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).max(200).required(),
      location: Joi.string().max(200).required(),
      planType: Joi.string().valid('free', 'basic', 'pro').default('free'),
      maxStudents: Joi.number().integer().min(1).max(10000).default(5),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const result = await query(
      `INSERT INTO schools (id, name, location, plan_type, max_students, created_at)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, NOW())
       RETURNING *`,
      [value.name, value.location, value.planType, value.maxStudents]
    );
    res.status(201).json({ school: result.rows[0] });
  } catch (err) { next(err); }
});

// ─── PATCH /api/admin/schools/:schoolId ──────────────────────────────────────
router.patch('/schools/:schoolId', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { schoolId } = req.params;
    const schema = Joi.object({
      name: Joi.string().min(2).max(200),
      location: Joi.string().max(200),
      planType: Joi.string().valid('free', 'basic', 'pro'),
      maxStudents: Joi.number().integer().min(1).max(10000),
      subscriptionExpiresAt: Joi.date().iso(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const updates = [];
    const params = [];
    let pIdx = 1;

    if (value.name) { updates.push(`name = $${pIdx++}`); params.push(value.name); }
    if (value.location) { updates.push(`location = $${pIdx++}`); params.push(value.location); }
    if (value.planType) { updates.push(`plan_type = $${pIdx++}`); params.push(value.planType); }
    if (value.maxStudents) { updates.push(`max_students = $${pIdx++}`); params.push(value.maxStudents); }
    if (value.subscriptionExpiresAt) {
      updates.push(`subscription_expires_at = $${pIdx++}`);
      params.push(value.subscriptionExpiresAt);
    }

    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

    params.push(schoolId);
    const result = await query(
      `UPDATE schools SET ${updates.join(', ')} WHERE id = $${pIdx} RETURNING *`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ error: 'School not found' });
    res.json({ school: result.rows[0] });
  } catch (err) { next(err); }
});

// ─── DELETE /api/admin/schools/:schoolId ─────────────────────────────────────
router.delete('/schools/:schoolId', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    await query(`DELETE FROM schools WHERE id = $1`, [req.params.schoolId]);
    res.json({ message: 'School deleted' });
  } catch (err) { next(err); }
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { role, schoolId, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];
    let pIdx = 1;

    if (role) { conditions.push(`u.role = $${pIdx++}`); params.push(role); }
    if (schoolId) { conditions.push(`u.school_id = $${pIdx++}`); params.push(schoolId); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const result = await query(
      `SELECT u.id, u.name, u.phone, u.email, u.role, u.school_id,
              sc.name as school_name, u.created_at
       FROM users u
       LEFT JOIN schools sc ON sc.id = u.school_id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${pIdx++} OFFSET $${pIdx}`,
      params
    );
    res.json({ users: result.rows });
  } catch (err) { next(err); }
});

// ─── PATCH /api/admin/users/:userId/role ─────────────────────────────────────
router.patch('/users/:userId/role', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['student', 'teacher', 'parent', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const result = await query(
      `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, role`,
      [role, req.params.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) { next(err); }
});

// ─── POST /api/admin/cron/trigger/:job ───────────────────────────────────────
// Manual trigger for cron jobs (admin only, useful for testing)
router.post('/cron/trigger/:job', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { job } = req.params;
    res.json({ message: `Job ${job} triggered. Check server logs.` });

    // Run async after response
    if (job === 'error-patterns') runNightlyErrorPatterns().catch(console.error);
    else if (job === 'student-recs') runWeeklyStudentRecs().catch(console.error);
  } catch (err) { next(err); }
});

// ─── GET /api/admin/subscriptions ────────────────────────────────────────────
router.get('/subscriptions', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT po.id, po.amount_paise, po.plan_type, po.student_count,
              po.status, po.created_at, po.paid_at,
              sc.name as school_name, sc.id as school_id
       FROM payment_orders po
       JOIN schools sc ON sc.id = po.school_id
       ORDER BY po.created_at DESC
       LIMIT 100`
    );
    res.json({ orders: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;
