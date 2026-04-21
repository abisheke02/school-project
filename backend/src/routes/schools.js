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
