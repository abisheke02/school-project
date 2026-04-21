// Subscription Middleware — Phase 6
// Enforces free-tier limits (max 5 students) before allowing protected operations
// Also checks if subscription is active for premium features

const { query } = require('../config/database');

// Checks school hasn't exceeded free plan student limit
const checkStudentLimit = async (req, res, next) => {
  try {
    const schoolId = req.body.schoolId || req.params.schoolId || req.user?.schoolId;
    if (!schoolId) return next(); // Skip if no school context

    const result = await query(
      `SELECT sc.plan_type, sc.max_students, sc.subscription_expires_at,
              COUNT(u.id) as current_students
       FROM schools sc
       LEFT JOIN users u ON u.school_id = sc.id AND u.role = 'student'
       WHERE sc.id = $1
       GROUP BY sc.id`,
      [schoolId]
    );

    if (!result.rows.length) return next();
    const school = result.rows[0];

    const isExpired = school.subscription_expires_at
      && new Date(school.subscription_expires_at) < new Date()
      && school.plan_type !== 'free';

    const isOverLimit = parseInt(school.current_students) >= parseInt(school.max_students);

    if (isExpired) {
      return res.status(402).json({
        error: 'Subscription expired. Please renew to continue.',
        code: 'SUBSCRIPTION_EXPIRED',
        schoolId,
      });
    }

    if (isOverLimit && school.plan_type === 'free') {
      return res.status(402).json({
        error: `Free plan allows up to ${school.max_students} students. Upgrade to Pro to add more.`,
        code: 'STUDENT_LIMIT_REACHED',
        currentCount: parseInt(school.current_students),
        maxAllowed: school.max_students,
        upgradeUrl: '/subscribe',
      });
    }

    next();
  } catch (err) {
    // Don't block on middleware errors — just log
    console.error('Subscription middleware error:', err.message);
    next();
  }
};

// Check if school has an active pro/basic subscription
const requireActivePlan = async (req, res, next) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return next();

    const result = await query(
      `SELECT plan_type, subscription_expires_at FROM schools WHERE id = $1`,
      [schoolId]
    );

    if (!result.rows.length) return next();
    const school = result.rows[0];

    const isActive = school.plan_type !== 'free'
      && school.subscription_expires_at
      && new Date(school.subscription_expires_at) > new Date();

    if (!isActive) {
      return res.status(402).json({
        error: 'This feature requires an active Pro subscription.',
        code: 'PRO_REQUIRED',
        upgradeUrl: '/subscribe',
      });
    }
    next();
  } catch (err) {
    console.error('requireActivePlan error:', err.message);
    next();
  }
};

module.exports = { checkStudentLimit, requireActivePlan };
