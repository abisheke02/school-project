const express = require('express');
const Joi = require('joi');
const { requireAuth, requireRole } = require('../middleware/auth');
const { createSchool, createClass, getClassStudents, getTeacherClasses } = require('../services/schoolService');

const router = express.Router();

// POST /api/schools — admin creates a school
router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).max(200).required(),
      location: Joi.string().max(200).required(),
      planType: Joi.string().valid('free', 'basic', 'pro').default('free'),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const school = await createSchool(value);
    res.status(201).json({ school });
  } catch (err) {
    next(err);
  }
});

// POST /api/schools/classes — teacher creates a class
router.post('/classes', requireAuth, requireRole('teacher', 'admin'), async (req, res, next) => {
  try {
    const schema = Joi.object({
      className: Joi.string().min(2).max(100).required(),
      schoolId: Joi.string().uuid().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const classRecord = await createClass(req.user.userId, value.schoolId, value.className);
    res.status(201).json({ class: classRecord });
  } catch (err) {
    next(err);
  }
});

const DEMO_SCHOOL_ID = '00000000-0000-0000-0000-000000000001';

// GET /api/schools/subscription — teacher sees their school plan + usage
router.get('/subscription', requireAuth, requireRole('teacher', 'admin'), async (req, res, next) => {
  try {
    const { query } = require('../config/database');
    const schoolId = req.user.schoolId;
    if (!schoolId) return res.status(404).json({ error: 'No school assigned' });

    if (schoolId === DEMO_SCHOOL_ID) {
      return res.json({
        planType: 'free', maxStudents: 5, studentCount: 3,
        usagePct: 60, subscriptionExpiresAt: null, isExpired: false, schoolId,
      });
    }

    const result = await query(
      `SELECT sc.plan_type, sc.max_students, sc.subscription_expires_at,
              COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'student') AS student_count
       FROM schools sc
       LEFT JOIN users u ON u.school_id = sc.id
       WHERE sc.id = $1
       GROUP BY sc.plan_type, sc.max_students, sc.subscription_expires_at`,
      [schoolId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'School not found' });

    const row = result.rows[0];
    const isExpired = row.subscription_expires_at
      ? new Date(row.subscription_expires_at) < new Date()
      : false;
    const studentCount = Number(row.student_count) || 0;
    const maxStudents = Number(row.max_students) || 5;
    const usagePct = Math.min(100, Math.round((studentCount / maxStudents) * 100));

    res.json({
      planType: row.plan_type || 'free',
      maxStudents,
      studentCount,
      usagePct,
      subscriptionExpiresAt: row.subscription_expires_at,
      isExpired,
      schoolId,
    });
  } catch (err) { next(err); }
});

// GET /api/schools/classes — teacher gets their classes
router.get('/classes', requireAuth, requireRole('teacher', 'admin'), async (req, res, next) => {
  try {
    const classes = await getTeacherClasses(req.user.userId);
    res.json({ classes });
  } catch (err) {
    next(err);
  }
});

// GET /api/schools/classes/:classId/students — teacher views class roster
router.get('/classes/:classId/students', requireAuth, requireRole('teacher', 'admin'), async (req, res, next) => {
  try {
    const students = await getClassStudents(req.params.classId, req.user.userId);
    res.json({ students });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
