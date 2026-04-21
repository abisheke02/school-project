// Practice Routes — Phase 3
const express = require('express');
const Joi = require('joi');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  getExercisesForStudent,
  startPracticeSession,
  recordExerciseAttempt,
  completePracticeSession,
  getPracticeHistory,
  getErrorSummary,
} = require('../services/practiceService');
const { transcribeAudio, scoreDictation } = require('../services/sttService');

const router = express.Router();

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
};

// GET /api/practice/exercises?type=phonics
router.get('/exercises', requireAuth, requireRole('student'), async (req, res) => {
  try {
    const exercises = await getExercisesForStudent(
      req.user.userId,
      req.query.type || null
    );
    res.json({ exercises });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/practice/sessions/start
router.post('/sessions/start', requireAuth, requireRole('student'), async (req, res) => {
  try {
    const sessionId = await startPracticeSession(
      req.user.userId,
      req.body.session_type || 'practice'
    );
    res.status(201).json({ session_id: sessionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/practice/sessions/:sessionId/attempt
const attemptSchema = Joi.object({
  exercise_id: Joi.string().uuid().required(),
  exercise_type: Joi.string().valid('phonics', 'reading', 'writing', 'math').required(),
  answers: Joi.array().items(
    Joi.object({
      questionId: Joi.string().optional(),
      studentAnswer: Joi.string().allow('').required(),
      correctAnswer: Joi.string().required(),
      isCorrect: Joi.boolean().required(),
      responseTimeMs: Joi.number().min(0).max(300000).required(),
      errorType: Joi.string().optional(),
    })
  ).min(1).required(),
  score_percent: Joi.number().min(0).max(100).required(),
  time_taken_ms: Joi.number().min(0).max(600000).required(),
});

router.post(
  '/sessions/:sessionId/attempt',
  requireAuth,
  requireRole('student'),
  validate(attemptSchema),
  async (req, res) => {
    try {
      const result = await recordExerciseAttempt({
        sessionId: req.params.sessionId,
        studentId: req.user.userId,
        exerciseId: req.body.exercise_id,
        exerciseType: req.body.exercise_type,
        answers: req.body.answers,
        scorePercent: req.body.score_percent,
        timeTakenMs: req.body.time_taken_ms,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/practice/sessions/:sessionId/complete
router.post(
  '/sessions/:sessionId/complete',
  requireAuth,
  requireRole('student'),
  async (req, res) => {
    try {
      const result = await completePracticeSession(
        req.user.userId,
        req.params.sessionId,
        req.body.total_score || 0
      );
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/practice/history
router.get('/history', requireAuth, requireRole('student'), async (req, res) => {
  try {
    const history = await getPracticeHistory(req.user.userId, 10);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/practice/errors
router.get('/errors', requireAuth, requireRole('student'), async (req, res) => {
  try {
    const errors = await getErrorSummary(req.user.userId);
    res.json({ errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/practice/stt
// Transcribe base64 audio → { transcript, confidence, score? }
// Optional body: { expected } to also score a dictation attempt
const sttSchema = Joi.object({
  audioBase64: Joi.string().required(),
  expected: Joi.string().allow('').optional(),
  encoding: Joi.string().default('LINEAR16'),
  sampleRateHertz: Joi.number().default(16000),
  language: Joi.string().default('en-IN'),
});

router.post('/stt', requireAuth, requireRole('student'), async (req, res) => {
  const { error, value } = sttSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const result = await transcribeAudio(value.audioBase64, {
      encoding: value.encoding,
      sampleRateHertz: value.sampleRateHertz,
      language: value.language,
    });
    if (value.expected) {
      const scoring = scoreDictation(result.transcript, value.expected);
      return res.json({ ...result, ...scoring });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/practice/sessions/sync
// Upload a batch of offline-queued sessions when the device reconnects
const syncSessionSchema = Joi.object({
  sessions: Joi.array().items(
    Joi.object({
      exerciseId: Joi.string().uuid().optional(),
      exerciseType: Joi.string().valid('phonics', 'reading', 'writing', 'math').required(),
      answers: Joi.array().items(Joi.object()).default([]),
      scorePercent: Joi.number().min(0).max(100).required(),
      timeTakenMs: Joi.number().min(0).required(),
    })
  ).min(1).required(),
});

router.post('/sessions/sync', requireAuth, requireRole('student'), async (req, res, next) => {
  const { error, value } = syncSessionSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  
  try {
    const results = [];
    const failures = [];
    
    for (const s of value.sessions) {
      try {
        // 1. Create session (Offline sessions marked as 'offline')
        const sessionId = await startPracticeSession(req.user.userId, 'offline');
        
        // 2. Record individual attempt if data exists
        if (s.exerciseId && s.answers.length) {
          await recordExerciseAttempt({
            sessionId,
            studentId: req.user.userId,
            exerciseId: s.exerciseId,
            exerciseType: s.exerciseType,
            answers: s.answers,
            scorePercent: s.scorePercent,
            timeTakenMs: s.timeTakenMs,
          });
        }
        
        // 3. Complete session
        const result = await completePracticeSession(req.user.userId, sessionId, s.scorePercent);
        results.push({ sessionId, ...result });
      } catch (itemErr) {
        console.error('[Sync] Failed item:', s.exerciseId, itemErr.message);
        failures.push({ exerciseId: s.exerciseId, error: itemErr.message });
      }
    }
    
    res.json({
      synced: results.length,
      failed: failures.length,
      results,
      failures: failures.length ? failures : undefined
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
