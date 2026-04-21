// Test Routes — Phase 4
const express = require('express');
const Joi = require('joi');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  getTestQuestions,
  submitTest,
  getTestHistory,
  getLevelStatus,
  PASS_THRESHOLD,
} = require('../services/testService');

const router = express.Router();

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
};

// GET /api/tests/questions?level=1
router.get('/questions', requireAuth, requireRole('student'), async (req, res) => {
  const level = parseInt(req.query.level, 10);
  if (!level || level < 1 || level > 5) {
    return res.status(400).json({ error: 'level must be 1-5' });
  }
  try {
    const questions = await getTestQuestions(req.user.userId, level);
    res.json({ questions, pass_threshold: PASS_THRESHOLD });
  } catch (err) {
    res.status(err.message.includes('locked') ? 403 : 500).json({ error: err.message });
  }
});

// POST /api/tests/submit
const submitSchema = Joi.object({
  level: Joi.number().integer().min(1).max(5).required(),
  answers: Joi.array().items(
    Joi.object({
      questionId: Joi.string().required(),
      studentAnswer: Joi.string().allow('').required(),
    })
  ).min(5).required(),
  time_taken_ms: Joi.number().min(0).max(3600000).required(),
});

router.post(
  '/submit',
  requireAuth,
  requireRole('student'),
  validate(submitSchema),
  async (req, res) => {
    try {
      const result = await submitTest(
        req.user.userId,
        req.body.level,
        req.body.answers,
        req.body.time_taken_ms
      );
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/tests/history
router.get('/history', requireAuth, requireRole('student'), async (req, res) => {
  try {
    const history = await getTestHistory(req.user.userId);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tests/levels
router.get('/levels', requireAuth, requireRole('student'), async (req, res) => {
  try {
    const levels = await getLevelStatus(req.user.userId);
    res.json({ levels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tests/student/:studentId — teacher/admin can view a student's test history
router.get(
  '/student/:studentId',
  requireAuth,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const history = await getTestHistory(req.params.studentId);
      const levels = await getLevelStatus(req.params.studentId);
      res.json({ history, levels });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
