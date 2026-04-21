const jwt = require('jsonwebtoken');
const { get } = require('../config/redis');

// Verify JWT issued by our backend after Firebase OTP verification
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check token is not blacklisted (logout scenario)
    const blacklisted = await get(`blacklist:${token}`);
    if (blacklisted) {
      return res.status(401).json({ error: 'Token has been invalidated' });
    }

    req.user = decoded; // { userId, role, schoolId }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based access control
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: `Access restricted to: ${roles.join(', ')}` });
  }
  next();
};

module.exports = { requireAuth, requireRole };
