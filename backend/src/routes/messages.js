const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT m.*, sender.name AS sender_name, receiver.name AS receiver_name, s.name AS student_name FROM messages m LEFT JOIN users sender ON sender.id = m.sender_id LEFT JOIN users receiver ON receiver.id = m.receiver_id LEFT JOIN students s ON s.id = m.student_id WHERE m.sender_id = $1 OR m.receiver_id = $1 ORDER BY m.created_at DESC LIMIT 50`, [req.user.userId]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { receiver_id, content, student_id } = req.body;
    if (!receiver_id || !content) return res.status(400).json({ error: 'receiver_id and content are required' });
    const { rows } = await query(`INSERT INTO messages (school_id, sender_id, receiver_id, student_id, content) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [req.user.schoolId, req.user.userId, receiver_id, student_id || null, content]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id/read', requireAuth, async (req, res, next) => {
  try {
    await query(`UPDATE messages SET is_read = true, read_at = NOW() WHERE id = $1 AND receiver_id = $2`, [req.params.id, req.user.userId]);
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
});

module.exports = router;
