// Messages Routes — Phase 5
// Teacher ↔ Parent in-app messaging

const express = require('express');
const Joi = require('joi');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

// ─── GET /api/messages ────────────────────────────────────────────────────────
// Get conversation list for logged-in user (grouped by conversation partner)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const result = await query(
      `SELECT DISTINCT ON (partner_id)
         partner_id,
         partner_name,
         last_message,
         last_sent_at,
         unread_count
       FROM (
         SELECT
           CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END as partner_id,
           CASE WHEN m.sender_id = $1 THEN ru.name ELSE su.name END as partner_name,
           m.body as last_message,
           m.sent_at as last_sent_at,
           COUNT(CASE WHEN m.receiver_id = $1 AND m.read_at IS NULL THEN 1 END)
             OVER (PARTITION BY CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END)
             as unread_count
         FROM messages m
         JOIN users su ON su.id = m.sender_id
         JOIN users ru ON ru.id = m.receiver_id
         WHERE m.sender_id = $1 OR m.receiver_id = $1
         ORDER BY m.sent_at DESC
       ) convos
       ORDER BY partner_id, last_sent_at DESC`,
      [userId]
    );

    res.json({ conversations: result.rows });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/messages/:partnerId ────────────────────────────────────────────
// Get full message thread between logged-in user and a partner
router.get('/:partnerId', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { partnerId } = req.params;

    const result = await query(
      `SELECT m.id, m.sender_id, m.receiver_id, m.body, m.sent_at, m.read_at,
              u.name as sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.sent_at ASC
       LIMIT 100`,
      [userId, partnerId]
    );

    // Mark received messages as read
    await query(
      `UPDATE messages SET read_at = NOW()
       WHERE receiver_id = $1 AND sender_id = $2 AND read_at IS NULL`,
      [userId, partnerId]
    );

    res.json({ messages: result.rows });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/messages ───────────────────────────────────────────────────────
// Send a new message
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const schema = Joi.object({
      receiverId: Joi.string().uuid().required(),
      body: Joi.string().min(1).max(2000).required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const result = await query(
      `INSERT INTO messages (id, sender_id, receiver_id, body, sent_at)
       VALUES (uuid_generate_v4(), $1, $2, $3, NOW())
       RETURNING id, sender_id, receiver_id, body, sent_at`,
      [req.user.userId, value.receiverId, value.body]
    );

    res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/messages/unread-count ──────────────────────────────────────────
router.get('/meta/unread', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM messages
       WHERE receiver_id = $1 AND read_at IS NULL`,
      [req.user.userId]
    );
    res.json({ unreadCount: parseInt(result.rows[0].count) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
