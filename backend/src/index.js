require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set.');
  process.exit(1);
}

const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const morgan    = require('morgan');
const jwt       = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const { errorHandler, notFound } = require('./middleware/errorHandler');
const { connectRedis }  = require('./config/redis');
const { pool }          = require('./config/database');
const { runMigrations } = require('./config/runMigrations');

const app  = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) || ['http://localhost:5173'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(rateLimit({ windowMs: 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 60 * 1000, max: process.env.NODE_ENV === 'production' ? 10 : 100 }));

app.get('/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', service: 'testv3-api', db: 'connected', ts: new Date().toISOString() }); }
  catch { res.json({ status: 'ok', service: 'testv3-api', db: 'unreachable', ts: new Date().toISOString() }); }
});
app.get('/ping', (_req, res) => res.json({ ok: true, port: PORT }));

const DEMO_USERS = {
  super_admin:  { id: '00000000-0000-0000-0000-000000000001', name: 'Super Admin',  role: 'super_admin',  school_id: null },
  school_admin: { id: '00000000-0000-0000-0000-000000000002', name: 'School Admin', role: 'school_admin', school_id: '00000000-0000-0000-0000-000000000010' },
  teacher:      { id: '00000000-0000-0000-0000-000000000003', name: 'Demo Teacher', role: 'teacher',      school_id: '00000000-0000-0000-0000-000000000010' },
  student:      { id: '00000000-0000-0000-0000-000000000004', name: 'Demo Student', role: 'student',      school_id: '00000000-0000-0000-0000-000000000010' },
  parent:       { id: '00000000-0000-0000-0000-000000000005', name: 'Demo Parent',  role: 'parent',       school_id: '00000000-0000-0000-0000-000000000010' },
};

app.post('/api/auth/demo', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ error: 'Demo not available in production' });
  const role = req.query.role || req.body?.role || 'teacher';
  const demoUser = DEMO_USERS[role] || DEMO_USERS.teacher;
  const token = jwt.sign({ userId: demoUser.id, role: demoUser.role, schoolId: demoUser.school_id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: demoUser });
});

app.post('/api/auth/credentials', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    if (username !== (process.env.ADMIN_USERNAME || 'admin') || password !== (process.env.ADMIN_PASSWORD || 'admin123')) return res.status(401).json({ error: 'Invalid credentials' });
    const adminUser = DEMO_USERS.super_admin;
    const token = jwt.sign({ userId: adminUser.id, role: 'super_admin', schoolId: null }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: adminUser });
  } catch (err) { res.status(500).json({ error: 'Login failed: ' + err.message }); }
});

const safeRequire = (path, label) => {
  try { return require(path); }
  catch (err) {
    console.error(`[routes] Failed to load ${label}: ${err.message}`);
    const router = express.Router();
    router.all('*', (_req, res) => res.status(503).json({ error: `${label} unavailable`, detail: err.message }));
    return router;
  }
};

// School Management routes
app.use('/api/auth',           safeRequire('./routes/auth',           'auth'));
app.use('/api/schools',        safeRequire('./routes/schools',        'schools'));
app.use('/api/students',       safeRequire('./routes/students',       'students'));
app.use('/api/staff',          safeRequire('./routes/staff',          'staff'));
app.use('/api/admissions',     safeRequire('./routes/admissions',     'admissions'));
app.use('/api/attendance',     safeRequire('./routes/attendance',     'attendance'));
app.use('/api/timetable',      safeRequire('./routes/timetable',      'timetable'));
app.use('/api/examinations',   safeRequire('./routes/examinations',   'examinations'));
app.use('/api/fees',           safeRequire('./routes/fees',           'fees'));
app.use('/api/library',        safeRequire('./routes/library',        'library'));
app.use('/api/transport',      safeRequire('./routes/transport',      'transport'));
app.use('/api/payroll',        safeRequire('./routes/payroll',        'payroll'));
// LD Platform routes
app.use('/api/screening',       safeRequire('./routes/screening',       'screening'));
app.use('/api/practice',        safeRequire('./routes/practice',        'practice'));
app.use('/api/tests',           safeRequire('./routes/tests',           'tests'));
app.use('/api/recommendations', safeRequire('./routes/recommendations', 'recommendations'));
app.use('/api/tts',             safeRequire('./routes/tts',             'tts'));
// Shared routes
app.use('/api/communications',  safeRequire('./routes/communications',  'communications'));
app.use('/api/messages',        safeRequire('./routes/messages',        'messages'));
app.use('/api/analytics',       safeRequire('./routes/analytics',       'analytics'));
app.use('/api/reports',         safeRequire('./routes/reports',         'reports'));
app.use('/api/payments',        safeRequire('./routes/payments',        'payments'));
app.use('/api/admin',           safeRequire('./routes/admin',           'admin'));
app.use('/api/compliance',      safeRequire('./routes/compliance',      'compliance'));

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  try { await runMigrations(); console.log('[db] Migrations up to date'); } catch (err) { console.warn('[db] Migration warning:', err.message); }
  connectRedis().catch(() => {});
  try { require('./config/firebase').initFirebase(); } catch {}
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ TestV3 Unified API ready on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health\n`);
  });
  try { const { startCronJobs } = require('./jobs/cronJobs'); startCronJobs(); } catch (err) { console.warn('[cron] Jobs skipped:', err.message); }
};

process.on('uncaughtException',  (err) => console.error('[uncaughtException]',  err.message));
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));

start();
module.exports = app;
