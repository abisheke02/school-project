const express = require('express');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const { loginWithFirebaseToken, loginWithSupabaseToken, logout } = require('../services/authService');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/demo?role=teacher|student|admin|parent
// Dev-only instant demo login, returns a real signed JWT
const DEMO_USERS = {
  teacher: {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'Demo Teacher',
    role: 'teacher',
    school_id: '00000000-0000-0000-0000-000000000001',
  },
  student: {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Arjun Sharma',
    role: 'student',
    school_id: '00000000-0000-0000-0000-000000000001',
    child_id: '00000000-0000-0000-0000-000000000002',
  },
  admin: {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Demo Admin',
    role: 'admin',
    school_id: '00000000-0000-0000-0000-000000000001',
  },
  parent: {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Demo Parent',
    role: 'parent',
    school_id: '00000000-0000-0000-0000-000000000001',
    child_id: '00000000-0000-0000-0000-000000000002',
  },
};

router.post('/demo', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Demo mode not available in production' });
  }
  const role = req.query.role || req.body.role || 'teacher';
  const demoUser = DEMO_USERS[role] || DEMO_USERS.teacher;
  const token = jwt.sign(
    { userId: demoUser.id, role: demoUser.role, schoolId: demoUser.school_id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, user: demoUser });
});

// POST /api/auth/login
// Body: { firebaseIdToken?, supabaseToken?, fcmToken? }
router.post('/login', async (req, res, next) => {
  try {
    const schema = Joi.object({
      firebaseIdToken: Joi.string().optional(),
      supabaseToken: Joi.string().optional(),
      fcmToken: Joi.string().optional(),
    }).or('firebaseIdToken', 'supabaseToken');

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    let result;
    if (value.supabaseToken) {
      result = await loginWithSupabaseToken(value.supabaseToken, value.fcmToken);
    } else {
      result = await loginWithFirebaseToken(value.firebaseIdToken, value.fcmToken);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/credentials — username + password login (admin portal)
// Credentials are checked against ADMIN_USERNAME / ADMIN_PASSWORD env vars,
// falling back to admin / admin123 in development.
router.post('/credentials', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const adminUser = DEMO_USERS.admin;
  const token = jwt.sign(
    { userId: adminUser.id, role: adminUser.role, schoolId: adminUser.school_id },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
  res.json({ token, user: adminUser });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    await logout(token, req.user.userId);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
