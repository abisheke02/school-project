require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const schoolRoutes = require('./routes/schools');
const screeningRoutes = require('./routes/screening');
const practiceRoutes = require('./routes/practice');
const testRoutes = require('./routes/tests');
const recommendationRoutes = require('./routes/recommendations');
const ttsRoutes = require('./routes/tts');
const analyticsRoutes = require('./routes/analytics');
const reportsRoutes = require('./routes/reports');
const messagesRoutes = require('./routes/messages');
const paymentsRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const complianceRoutes = require('./routes/compliance');
const { startCronJobs } = require('./jobs/cronJobs');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { initFirebase } = require('./config/firebase');
const { connectRedis } = require('./config/redis');
const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
}));

// Request parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Global rate limiter: 100 req/min per IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// Stricter rate limit on auth routes
app.use('/api/auth', rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts' },
}));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'ld-platform-api', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'unreachable' });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/screening', screeningRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/compliance', complianceRoutes);

// 404 + error handling
app.use(notFound);
app.use(errorHandler);

// Startup
const start = async () => {
  // 1. Attempt DB connection (don't block)
  pool.query('SELECT 1')
    .then(() => console.log('PostgreSQL connected'))
    .catch(err => console.error('Database unreachable, using Mock Mode:', err.message));

  // 2. Attempt Redis connection (non-blocking — server starts regardless)
  connectRedis().catch(() => {});

  // 3. Initialize Firebase Admin
  try { initFirebase(); } catch (err) { console.error('Firebase failed'); }

  // 4. Start Server Always
  app.listen(PORT, () => {
    console.log(`LD Platform API running on port ${PORT} [DEMO MODE ACTIVE]`);
    // 5. Start Background Cron Jobs
    startCronJobs();
  });
};

start();

module.exports = app;
