const express  = require('express');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const { requireAuth } = require('../middleware/auth');
const { query }       = require('../config/database');
const { verifyIdToken }    = require('../config/firebase');
const { getSupabase }      = require('../config/supabase');
const { set: redisSet }    = require('../config/redis');

const router = express.Router();

const signToken = (user) => jwt.sign(
  { userId: user.id, role: user.role, schoolId: user.school_id },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

router.post('/login', async (req, res, next) => {
  try {
    const { email, password, firebaseIdToken, supabaseToken, fcmToken } = req.body || {};
    if (email && password) {
      const { rows } = await query(`SELECT * FROM users WHERE email = $1 AND is_active = true`, [email.toLowerCase().trim()]);
      if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
      const user = rows[0];
      if (!user.password_hash) return res.status(401).json({ error: 'Use another login method' });
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
      await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);
      return res.json({ token: signToken(user), user: { id: user.id, name: user.name, role: user.role, school_id: user.school_id, email: user.email } });
    }
    if (firebaseIdToken) {
      const decoded = await verifyIdToken(firebaseIdToken);
      const { rows } = await query(`SELECT * FROM users WHERE phone = $1 AND is_active = true`, [decoded.phone_number]);
      if (!rows.length) return res.status(404).json({ error: 'No account found. Contact your school admin.' });
      const user = rows[0];
      if (fcmToken) await query(`UPDATE users SET fcm_token = $1 WHERE id = $2`, [fcmToken, user.id]);
      return res.json({ token: signToken(user), user: { id: user.id, name: user.name, role: user.role, school_id: user.school_id } });
    }
    if (supabaseToken) {
      const supabase = getSupabase();
      if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
      const { data: { user: sUser }, error } = await supabase.auth.getUser(supabaseToken);
      if (error || !sUser) return res.status(401).json({ error: 'Invalid Supabase token' });
      const { rows } = await query(`SELECT * FROM users WHERE email = $1 AND is_active = true`, [sUser.email]);
      if (!rows.length) return res.status(404).json({ error: 'No account found.' });
      const user = rows[0];
      return res.json({ token: signToken(user), user: { id: user.id, name: user.name, role: user.role, school_id: user.school_id } });
    }
    res.status(400).json({ error: 'Provide email+password, firebaseIdToken, or supabaseToken' });
  } catch (err) { next(err); }
});

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, phone, role = 'teacher' } = req.body || {};
    if (!name || !password) return res.status(400).json({ error: 'name and password required' });
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (name, email, phone, role, password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, email?.toLowerCase() || null, phone || null, role, hash]
    );
    res.status(201).json({ token: signToken(rows[0]), user: { id: rows[0].id, name: rows[0].name, role: rows[0].role } });
  } catch (err) { next(err); }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const { rows } = await query(`SELECT * FROM users WHERE id = $1 AND is_active = true`, [decoded.userId]);
    if (!rows.length) return res.status(401).json({ error: 'User not found' });
    res.json({ token: signToken(rows[0]) });
  } catch { res.status(401).json({ error: 'Invalid refresh token' }); }
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    await redisSet(`blacklist:${token}`, true, 86400);
    res.json({ message: 'Logged out' });
  } catch { res.status(500).json({ error: 'Logout failed' }); }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(`SELECT id, name, email, phone, role, school_id FROM users WHERE id = $1`, [req.user.userId]);
    res.json({ user: rows[0] || req.user });
  } catch { res.json({ user: req.user }); }
});

router.get('/student-invite/:token', async (req, res) => {
  try {
    const { rows } = await query(`SELECT id, name, email, invite_token_expires_at FROM users WHERE invite_token = $1 AND role = 'student'`, [req.params.token]);
    if (!rows.length) return res.status(404).json({ error: 'Invalid or expired invite' });
    if (new Date(rows[0].invite_token_expires_at) < new Date()) return res.status(410).json({ error: 'Invite expired' });
    res.json({ name: rows[0].name, email: rows[0].email });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/student-invite/:token', async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const { rows } = await query(`SELECT * FROM users WHERE invite_token = $1 AND role = 'student'`, [req.params.token]);
    if (!rows.length) return res.status(404).json({ error: 'Invalid invite' });
    const user = rows[0];
    if (new Date(user.invite_token_expires_at) < new Date()) return res.status(410).json({ error: 'Invite expired' });
    const hash = await bcrypt.hash(password, 10);
    await query(`UPDATE users SET password_hash = $1, invite_token = NULL, invite_token_expires_at = NULL WHERE id = $2`, [hash, user.id]);
    res.json({ token: signToken(user), user: { id: user.id, name: user.name, role: user.role, school_id: user.school_id } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
