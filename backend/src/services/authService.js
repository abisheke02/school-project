const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { verifyIdToken } = require('../config/firebase');
const { set, del } = require('../config/redis');

const JWT_EXPIRES_IN = '7d';

const { supabase } = require('../config/supabase');

// Called after mobile app completes Firebase phone OTP
// firebaseIdToken is the token Firebase returns on successful OTP verification
const loginWithFirebaseToken = async (firebaseIdToken, fcmToken = null) => {
  const decoded = await verifyIdToken(firebaseIdToken);
  const phoneNumber = decoded.phone_number;

  if (!phoneNumber) {
    throw Object.assign(new Error('Phone number not found in token'), { status: 400 });
  }

  return await handleUserLogin(phoneNumber, fcmToken);
};

// Called after web dashboard completes Supabase phone OTP
const loginWithSupabaseToken = async (supabaseToken, fcmToken = null) => {
  const { data: { user }, error } = await supabase.auth.getUser(supabaseToken);
  
  if (error || !user) {
    throw Object.assign(new Error('Invalid Supabase token'), { status: 401 });
  }

  const phoneNumber = user.phone;
  if (!phoneNumber) {
    throw Object.assign(new Error('Phone number not found in Supabase user'), { status: 400 });
  }

  return await handleUserLogin(phoneNumber, fcmToken);
};

// Common logic to find/create user and generate backend JWT
const handleUserLogin = async (phoneNumber, fcmToken) => {
  // Find or create user
  let userResult = await query(
    'SELECT id, name, role, school_id FROM users WHERE phone = $1',
    [phoneNumber]
  );

  let user;
  let isNewUser = false;

  if (userResult.rows.length === 0) {
    // New user — create with student role by default
    const newId = uuidv4();
    const insertResult = await query(
      `INSERT INTO users (id, phone, role, created_at)
       VALUES ($1, $2, 'student', NOW())
       RETURNING id, name, role, school_id`,
      [newId, phoneNumber]
    );
    user = insertResult.rows[0];
    isNewUser = true;
  } else {
    user = userResult.rows[0];
  }

  // Update FCM token if provided
  if (fcmToken) {
    await query('UPDATE users SET fcm_token = $1 WHERE id = $2', [fcmToken, user.id]);
  }

  const jwtPayload = {
    userId: user.id,
    role: user.role,
    schoolId: user.school_id,
  };

  const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  // Cache user session in Redis (7 days TTL)
  await set(`session:${user.id}`, jwtPayload, 7 * 24 * 3600);

  return { token, user, isNewUser };
};

const logout = async (token, userId) => {
  // Blacklist token for remaining TTL (approx 7 days)
  await set(`blacklist:${token}`, true, 7 * 24 * 3600);
  await del(`session:${userId}`);
};

module.exports = { loginWithFirebaseToken, loginWithSupabaseToken, logout };
