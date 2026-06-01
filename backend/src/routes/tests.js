const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.get('/questions', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    const studentResult = await query(`SELECT current_level FROM students WHERE user_id = $1`, [req.user.userId]);
    const level = parseInt(req.query.level) || studentResult.rows[0]?.current_level || 1;
    const { rows } = await query(`SELECT * FROM test_questions WHERE level = $1 AND is_active = true ORDER BY RANDOM() LIMIT 20`, [level]);
    res.json({ questions: rows, level });
  } catch (err) { next(err); }
});

router.post('/submit', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    const { level, answers } = req.body;
    if (!level || !Array.isArray(answers)) return res.status(400).json({ error: 'level and answers[] are required' });
    const studentResult = await query(`SELECT id, school_id, current_level FROM students WHERE user_id = $1`, [req.user.userId]);
    if (!studentResult.rows.length) return res.status(404).json({ error: 'Student not found' });
    const student = studentResult.rows[0];
    const correct = answers.filter(a => a.is_correct).length;
    const score = (correct / answers.length) * 100;
    const passed = score >= 70;
    const { rows: [session] } = await query(`INSERT INTO test_sessions (student_id, school_id, level, answers, score, total_q, correct_q, passed, completed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *`, [student.id, student.school_id, level, JSON.stringify(answers), score, answers.length, correct, passed]);
    if (passed && level >= student.current_level && level < 5) await query(`UPDATE students SET current_level = $1, updated_at = NOW() WHERE id = $2`, [level + 1, student.id]);
    res.json({ session_id: session.id, score, passed, correct, total: answers.length, level, next_level: passed ? Math.min(level + 1, 5) : level });
  } catch (err) { next(err); }
});

router.get('/history', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    const studentResult = await query(`SELECT id, current_level FROM students WHERE user_id = $1`, [req.user.userId]);
    if (!studentResult.rows.length) return res.json({ history: [], current_level: 1 });
    const { rows } = await query(`SELECT id, level, score, passed, total_q, correct_q, completed_at FROM test_sessions WHERE student_id = $1 ORDER BY completed_at DESC LIMIT 20`, [studentResult.rows[0].id]);
    res.json({ history: rows, current_level: studentResult.rows[0].current_level });
  } catch (err) { next(err); }
});

router.get('/student/:studentId', requireAuth, requireRole('teacher', 'school_admin', 'principal', 'super_admin'), async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT ts.*, s.name AS student_name FROM test_sessions ts JOIN students s ON s.id = ts.student_id WHERE ts.student_id = $1 AND s.school_id = $2 ORDER BY ts.completed_at DESC`, [req.params.studentId, req.user.schoolId]);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
