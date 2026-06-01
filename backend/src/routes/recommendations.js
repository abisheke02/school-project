const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const studentResult = await query(`SELECT id FROM students WHERE user_id = $1`, [req.user.userId]);
    if (!studentResult.rows.length) return res.json({ recommendation: null });
    const { rows } = await query(`SELECT * FROM student_recommendations WHERE student_id = $1 ORDER BY week_start DESC LIMIT 1`, [studentResult.rows[0].id]);
    res.json({ recommendation: rows[0] || null });
  } catch (err) { next(err); }
});

router.post('/generate/:studentId', requireAuth, requireRole('teacher', 'school_admin', 'principal', 'super_admin'), async (req, res, next) => {
  try {
    const { rows: [student] } = await query(`SELECT s.*, u.name FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = $1 AND s.school_id = $2`, [req.params.studentId, req.user.schoolId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const errorResult = await query(`SELECT error_type, COUNT(*) AS count FROM exercise_attempts WHERE student_id = $1 AND created_at > NOW() - INTERVAL '7 days' GROUP BY error_type ORDER BY count DESC LIMIT 5`, [req.params.studentId]);
    let summary = `General learning support for ${student.name}.`;
    let exercises = [];
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic.Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 600, messages: [{ role: 'user', content: `Generate weekly recommendation for student with ${student.ld_type || 'learning difficulties'}. Recent errors: ${errorResult.rows.map(r => r.error_type).join(', ') || 'none'}. Return JSON: {"summary": "...", "exercises": [{"type":"...","title":"...","description":"..."}]}` }] });
      const parsed = JSON.parse(msg.content[0].text.replace(/```json\n?|\n?```/g, ''));
      summary = parsed.summary || summary;
      exercises = parsed.exercises || exercises;
    } catch {}
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const { rows: [rec] } = await query(`INSERT INTO student_recommendations (student_id, week_start, summary, exercises, generated_by) VALUES ($1,$2,$3,$4,'claude') ON CONFLICT (student_id, week_start) DO UPDATE SET summary=$3, exercises=$4, created_at=NOW() RETURNING *`, [req.params.studentId, weekStartStr, summary, JSON.stringify(exercises)]);
    res.json(rec);
  } catch (err) { next(err); }
});

router.get('/student/:studentId', requireAuth, requireRole('teacher', 'school_admin', 'principal', 'super_admin'), async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM student_recommendations WHERE student_id = $1 ORDER BY week_start DESC LIMIT 8`, [req.params.studentId]);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
