const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.get('/questions', requireAuth, async (req, res, next) => {
  try {
    const profileResult = await query(`SELECT age, date_of_birth FROM students WHERE user_id = $1`, [req.user.userId]);
    let age = parseInt(req.query.age) || 10;
    if (profileResult.rows[0]?.age) age = profileResult.rows[0].age;
    else if (profileResult.rows[0]?.date_of_birth) age = new Date().getFullYear() - new Date(profileResult.rows[0].date_of_birth).getFullYear();
    const ageGroup = age <= 8 ? '6-8' : age <= 10 ? '9-10' : '11-12';
    const { rows } = await query(`SELECT * FROM screening_questions WHERE age_group = $1 AND is_active = true ORDER BY RANDOM() LIMIT 20`, [ageGroup]);
    res.json({ questions: rows, total: rows.length });
  } catch (err) { next(err); }
});

router.post('/submit', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    const { answers, duration_seconds } = req.body;
    if (!Array.isArray(answers) || answers.length < 5) return res.status(400).json({ error: 'At least 5 answers required' });
    const studentResult = await query(`SELECT id, age, school_id FROM students WHERE user_id = $1`, [req.user.userId]);
    if (!studentResult.rows.length) return res.status(404).json({ error: 'Student profile not found' });
    const student = studentResult.rows[0];
    const correct = answers.filter(a => a.is_correct).length;
    const score = (correct / answers.length) * 100;
    const ld_risk = score >= 75 ? 'low' : score >= 50 ? 'moderate' : 'high';
    const categories = {};
    for (const a of answers) { if (!a.is_correct && a.category) categories[a.category] = (categories[a.category] || 0) + 1; }
    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
    const ld_type = topCategory ? ({ phonological: 'dyslexia', reading: 'dyslexia', writing: 'dysgraphia', math: 'dyscalculia', attention: 'adhd' }[topCategory[0]] || 'mixed') : null;
    const { rows: [session] } = await query(`INSERT INTO screening_sessions (student_id, school_id, conducted_by, answers_json, score, ld_risk, ld_type, status, completed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'completed',NOW()) RETURNING *`, [student.id, student.school_id, req.user.userId, JSON.stringify(answers), score, ld_risk, ld_type]);
    await query(`UPDATE students SET ld_type=$1, risk_score=$2, last_screened_at=NOW(), next_screening_at=NOW() + INTERVAL '90 days', screening_status='completed', updated_at=NOW() WHERE id=$3`, [ld_type, score, student.id]);
    let ai_analysis = null;
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic.Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 400, messages: [{ role: 'user', content: `Analyze screening result: Score ${score.toFixed(1)}%, Risk ${ld_risk}, LD type ${ld_type}. Give 2-sentence educational recommendation.` }] });
      ai_analysis = msg.content[0].text;
      await query(`UPDATE screening_sessions SET ai_analysis = $1 WHERE id = $2`, [ai_analysis, session.id]);
    } catch {}
    res.json({ message: 'Screening complete', session_id: session.id, score, ld_risk, ld_type, ai_analysis });
  } catch (err) { next(err); }
});

router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT screening_status, ld_type, risk_score, last_screened_at, next_screening_at FROM students WHERE user_id = $1`, [req.user.userId]);
    if (!rows.length) return res.json({ screened: false });
    const s = rows[0];
    res.json({ screened: !!s.last_screened_at, ld_type: s.ld_type, risk_score: s.risk_score, last_screened_at: s.last_screened_at, next_screening_at: s.next_screening_at, due_for_rescreening: s.next_screening_at ? new Date(s.next_screening_at) <= new Date() : true });
  } catch (err) { next(err); }
});

router.get('/results/:studentId', requireAuth, requireRole('teacher', 'school_admin', 'principal', 'super_admin'), async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT ss.*, u.name AS conducted_by_name FROM screening_sessions ss LEFT JOIN users u ON u.id = ss.conducted_by WHERE ss.student_id = $1 ORDER BY ss.created_at DESC LIMIT 10`, [req.params.studentId]);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
