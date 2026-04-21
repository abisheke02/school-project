const admin = require('firebase-admin');

let initialized = false;

const initFirebase = () => {
  if (initialized) return;

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  // In dev with placeholder key, skip Firebase init gracefully
  if (!privateKey || privateKey.includes('PLACEHOLDER')) {
    console.warn('[Firebase] Skipping init — placeholder key detected (dev mode). Auth routes will not work.');
    initialized = true;
    return;
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  initialized = true;
  console.log('Firebase Admin initialized');
};

// Verify the Firebase ID token sent by mobile app after OTP login
const verifyIdToken = async (idToken) => {
  initFirebase();
  const decoded = await admin.auth().verifyIdToken(idToken);
  return decoded; // { uid, phone_number, ... }
};

// Send FCM push notification
const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  initFirebase();
  const message = {
    notification: { title, body },
    data,
    token: fcmToken,
    android: {
      priority: 'high',
      notification: { sound: 'default', channelId: 'ld_platform' },
    },
  };
  return admin.messaging().send(message);
};

module.exports = { initFirebase, verifyIdToken, sendPushNotification };
