const express = require('express');
const Joi = require('joi');
const { requireAuth } = require('../middleware/auth');
const { getScreeningQuestions, submitScreening, getStudentsDueForRescreening } = require('../services/screeningService');
const { query } = require('../config/database');

const router = express.Router();

// GET /api/screening/questions?age=10
// Returns age-appropriate questions for the quiz
router.get('/questions', requireAuth, async (req, res, next) => {
  try {
    // Get student age from their profile
    const profileResult = await query(
      'SELECT age FROM students WHERE user_id = $1',
      [req.user.userId]
    );
    const age = profileResult.rows[0]?.age || parseInt(req.query.age) || 10;
    const questions = await getScreeningQuestions(age);
    res.json({ questions, total: questions.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/screening/submit
// Student submits completed quiz answers
router.post('/submit', requireAuth, async (req, res, next) => {
  try {
    const answerSchema = Joi.object({
      question_id:      Joi.string().required(),
      category:         Joi.string().required(),
      ld_target:        Joi.string().required(),
      difficulty:       Joi.number().integer().min(1).max(3).required(),
      correct_answer:   Joi.string().required(),
      student_answer:   Joi.string().required(),
      is_correct:       Joi.boolean().required(),
      response_time_ms: Joi.number().integer().min(0).required(),
    });

    const schema = Joi.object({
      answers:          Joi.array().items(answerSchema).min(5).required(),
      duration_seconds: Joi.number().integer().min(60).max(1800).required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Get student age for Claude prompt
    const ageResult = await query('SELECT age FROM students WHERE user_id = $1', [req.user.userId]);
    const studentAge = ageResult.rows[0]?.age || 10;

    const result = await submitScreening(
      req.user.userId,
      value.answers,
      value.duration_seconds,
      studentAge
    );

    res.json({
      message: 'Screening complete',
      ldType: result.ldType,
      overallRiskScore: result.overallRiskScore,
      riskScores: result.riskScores,
      primaryPatterns: result.primaryPatterns,
      reasoning: result.reasoning,
      confidence: result.confidence,
      sessionId: result.sessionId,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/screening/status
// Check if student has been screened, and when re-screening is due
router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT ld_type, ld_risk_score, last_screened_at, next_screening_at
       FROM students WHERE user_id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ screened: false });
    }

    const student = result.rows[0];
    const dueForRescreening = student.next_screening_at
      ? new Date(student.next_screening_at) <= new Date()
      : true;

    res.json({
      screened: !!student.last_screened_at,
      ldType: student.ld_type,
      riskScore: student.ld_risk_score,
      lastScreenedAt: student.last_screened_at,
      nextScreeningAt: student.next_screening_at,
      dueForRescreening,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/screening/due — admin/teacher: list students due for rescreening
router.get('/due', requireAuth, async (req, res, next) => {
  try {
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const students = await getStudentsDueForRescreening();
    res.json({ students });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
