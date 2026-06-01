const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.get('/announcements', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT a.*, u.name AS created_by_name FROM announcements a LEFT JOIN users u ON u.id = a.created_by WHERE a.school_id = $1 AND a.is_published = true ORDER BY a.published_at DESC LIMIT 50`, [req.user.schoolId]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/announcements', requireAuth, requireRole('super_admin', 'school_admin', 'principal', 'teacher'), async (req, res, next) => {
  try {
    const { title, content, target_roles, class_ids } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'title and content are required' });
    const { rows } = await query(`INSERT INTO announcements (school_id, title, content, target_roles, class_ids, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [req.user.schoolId, title, content, target_roles || ['all'], class_ids || [], req.user.userId]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`, [req.user.userId]);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
