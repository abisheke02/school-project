const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.get('/exercises', requireAuth, async (req, res, next) => {
  try {
    const { type, difficulty } = req.query;
    const studentResult = await query(`SELECT ld_type, current_level FROM students WHERE user_id = $1`, [req.user.userId]);
    const student = studentResult.rows[0];
    let sql = `SELECT * FROM exercises WHERE is_active = true`;
    const params = [];
    if (type) { params.push(type); sql += ` AND type = $${params.length}`; }
    if (difficulty) { params.push(difficulty); sql += ` AND difficulty = $${params.length}`; }
    if (student?.ld_type && !type) {
      const ldTypeMap = { dyslexia: 'phonics', dyscalculia: 'math', dysgraphia: 'writing', adhd: 'reading' };
      const suggestedType = ldTypeMap[student.ld_type];
      if (suggestedType) { params.push(suggestedType); sql += ` AND type = $${params.length}`; }
    }
    sql += ` ORDER BY difficulty, RANDOM() LIMIT 10`;
    const { rows } = await query(sql, params);
    res.json({ exercises: rows });
  } catch (err) { next(err); }
});

router.post('/sessions/start', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    const studentResult = await query(`SELECT id, school_id FROM students WHERE user_id = $1`, [req.user.userId]);
    if (!studentResult.rows.length) return res.status(404).json({ error: 'Student profile not found' });
    const student = studentResult.rows[0];
    const { rows: [session] } = await query(`INSERT INTO practice_sessions (student_id, school_id, session_type, is_offline) VALUES ($1,$2,$3,$4) RETURNING *`, [student.id, student.school_id, req.body.session_type || 'practice', req.body.is_offline || false]);
    res.status(201).json({ session_id: session.id });
  } catch (err) { next(err); }
});

router.post('/sessions/:sessionId/attempt', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    const { exercise_id, is_correct, response, time_taken_sec, error_type } = req.body;
    const studentResult = await query(`SELECT id FROM students WHERE user_id = $1`, [req.user.userId]);
    if (!studentResult.rows.length) return res.status(404).json({ error: 'Student not found' });
    const { rows: [attempt] } = await query(`INSERT INTO exercise_attempts (session_id, student_id, exercise_id, is_correct, response, time_taken_sec, error_type) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [req.params.sessionId, studentResult.rows[0].id, exercise_id || null, is_correct, response || null, time_taken_sec || null, error_type || null]);
    res.json(attempt);
  } catch (err) { next(err); }
});

router.post('/sessions/:sessionId/complete', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    await query(`UPDATE practice_sessions SET completed_at=NOW(), score=$1, duration_sec=$2 WHERE id=$3`, [req.body.total_score || 0, req.body.duration_sec || 0, req.params.sessionId]);
    res.json({ message: 'Session completed', score: req.body.total_score });
  } catch (err) { next(err); }
});

router.get('/history', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    const studentResult = await query(`SELECT id FROM students WHERE user_id = $1`, [req.user.userId]);
    if (!studentResult.rows.length) return res.json({ history: [] });
    const { rows } = await query(`SELECT ps.*, COUNT(ea.id)::int AS total_attempts, COUNT(ea.id) FILTER (WHERE ea.is_correct)::int AS correct_attempts FROM practice_sessions ps LEFT JOIN exercise_attempts ea ON ea.session_id = ps.id WHERE ps.student_id = $1 GROUP BY ps.id ORDER BY ps.started_at DESC LIMIT 20`, [studentResult.rows[0].id]);
    res.json({ history: rows });
  } catch (err) { next(err); }
});

router.post('/sessions/sync', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    const { sessions } = req.body;
    if (!Array.isArray(sessions)) return res.status(400).json({ error: 'sessions[] is required' });
    const studentResult = await query(`SELECT id, school_id FROM students WHERE user_id = $1`, [req.user.userId]);
    if (!studentResult.rows.length) return res.status(404).json({ error: 'Student not found' });
    const student = studentResult.rows[0];
    let synced = 0, failed = 0;
    for (const s of sessions) {
      try {
        await query(`INSERT INTO practice_sessions (student_id, school_id, session_type, score, duration_sec, is_offline, synced_at, completed_at) VALUES ($1,$2,'offline',$3,$4,true,NOW(),NOW())`, [student.id, student.school_id, s.scorePercent || 0, Math.round((s.timeTakenMs || 0) / 1000)]);
        synced++;
      } catch { failed++; }
    }
    res.json({ synced, failed });
  } catch (err) { next(err); }
});

module.exports = router;
