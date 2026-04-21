// Recommendations Routes — Phase 4
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  generateForStudent,
  generateForTeacher,
  generateForParent,
  getRecommendations,
} = require('../services/recommendationService');

const router = express.Router();

// GET /api/recommendations/me — student gets their own, teacher gets teacher recs
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { role, userId } = req.user;
    const audience = role === 'teacher' ? 'teacher'
      : role === 'parent' ? 'parent'
      : 'student';

    let recs = await getRecommendations(userId, audience);

    // Generate on-demand if none exist or expired
    if (!recs || new Date(recs.valid_until) < new Date()) {
      if (role === 'teacher') recs = { recommendations: await generateForTeacher(userId) };
      else if (role === 'parent') recs = { recommendations: await generateForParent(userId) };
      else recs = { recommendations: await generateForStudent(userId) };
    }

    res.json(recs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recommendations/class/:classId — teacher gets class-level recommendations
router.get(
  '/class/:classId',
  requireAuth,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const recs = await generateForTeacher(req.user.userId);
      res.json({ recommendations: recs });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/recommendations/generate — admin triggers fresh generation
router.post(
  '/generate',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    const { userId, audience } = req.body;
    if (!userId || !audience) {
      return res.status(400).json({ error: 'userId and audience required' });
    }
    try {
      let recs;
      if (audience === 'student') recs = await generateForStudent(userId);
      else if (audience === 'teacher') recs = await generateForTeacher(userId);
      else if (audience === 'parent') recs = await generateForParent(userId);
      else return res.status(400).json({ error: 'Invalid audience' });
      res.json({ recommendations: recs });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
