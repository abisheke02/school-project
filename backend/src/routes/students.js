const express = require('express');
const Joi = require('joi');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  setupProfile,
  joinSchoolByCode,
  getStudentProfile,
  recordDailyActivity,
} = require('../services/studentService');

const router = express.Router();

// POST /api/students/profile — complete onboarding profile
router.post('/profile', requireAuth, async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).max(100).required(),
      age: Joi.number().integer().min(5).max(18).required(),
      classGrade: Joi.number().integer().min(1).max(10).required(),
      languagePref: Joi.string().valid('en', 'hi', 'ta', 'te', 'kn', 'ml', 'bn').default('en'),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const profile = await setupProfile(req.user.userId, value);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

// POST /api/students/join-school — student joins class via code
router.post('/join-school', requireAuth, async (req, res, next) => {
  try {
    const schema = Joi.object({
      joinCode: Joi.string().length(6).uppercase().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const classInfo = await joinSchoolByCode(req.user.userId, value.joinCode);
    res.json({ message: 'Joined class successfully', class: classInfo });
  } catch (err) {
    next(err);
  }
});

// GET /api/students/me — get own profile
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const profile = await getStudentProfile(req.user.userId);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

// GET /api/students/:id — teacher views a student profile
router.get('/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res, next) => {
  try {
    const profile = await getStudentProfile(req.params.id);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

// POST /api/students/activity — log daily session activity
router.post('/activity', requireAuth, async (req, res, next) => {
  try {
    const schema = Joi.object({
      minutesActive: Joi.number().min(0).required(),
      exercisesDone: Joi.number().integer().min(0).required(),
      scoreAvg: Joi.number().min(0).max(100).required(),
      level: Joi.number().integer().min(1).max(5).required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    await recordDailyActivity(req.user.userId, value);
    res.json({ message: 'Activity recorded' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
