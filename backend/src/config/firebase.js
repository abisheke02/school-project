const admin = require('firebase-admin');

let initialized = false;
let initError = null;

const initFirebase = () => {
  if (initialized) return;
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const isPlaceholder = (v) => !v || v.includes('PLACEHOLDER') || v.includes('your-');
  if (isPlaceholder(projectId) || isPlaceholder(clientEmail) || isPlaceholder(privateKey)) {
    initError = 'Firebase not configured — mobile OTP and push notifications disabled.';
    console.warn('[Firebase]', initError);
    initialized = true;
    return;
  }
  try {
    admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
    console.log('[Firebase] Admin SDK initialized');
  } catch (err) {
    initError = `Firebase init failed: ${err.message}`;
    console.error('[Firebase]', initError);
  }
  initialized = true;
};

const verifyIdToken = async (idToken) => {
  initFirebase();
  if (initError) throw Object.assign(new Error('Firebase not configured.'), { status: 503 });
  return admin.auth().verifyIdToken(idToken);
};

const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  initFirebase();
  if (initError) return null;
  return admin.messaging().send({ notification: { title, body }, data, token: fcmToken });
};

module.exports = { initFirebase, verifyIdToken, sendPushNotification };
