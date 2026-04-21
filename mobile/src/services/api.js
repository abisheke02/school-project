import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.API_URL || 'http://10.0.2.2:3000'; // 10.0.2.2 = localhost on Android emulator

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request automatically
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — clear token and redirect to login
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('auth_token');
      // Navigation reset handled in authStore
    }
    return Promise.reject(error.response?.data || error);
  }
);

export const authAPI = {
  login: (firebaseIdToken, fcmToken) =>
    api.post('/auth/login', { firebaseIdToken, fcmToken }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const studentAPI = {
  setupProfile: (data) => api.post('/students/profile', data),
  joinSchool: (joinCode) => api.post('/students/join-school', { joinCode }),
  getMyProfile: () => api.get('/students/me'),
  logActivity: (data) => api.post('/students/activity', data),
  // Practice
  getExercises: (type) => api.get('/practice/exercises', { params: { type } }),
  getPracticeHistory: () => api.get('/practice/history'),
  startSession: (sessionType) => api.post('/practice/sessions/start', { session_type: sessionType }),
  recordAttempt: (sessionId, data) => api.post(`/practice/sessions/${sessionId}/attempt`, data),
  completeSession: (sessionId, data) => api.post(`/practice/sessions/${sessionId}/complete`, data),
  syncOfflineSession: (payload) => api.post('/practice/sessions/sync', payload),
  transcribeAudio: (audioBase64, expected) => api.post('/practice/stt', { audioBase64, expected }),
  getErrorSummary: () => api.get('/practice/errors'),
  // Tests (Phase 4)
  getTestQuestions: (level) => api.get('/tests/questions', { params: { level } }),
  submitTest: (data) => api.post('/tests/submit', data),
  getTestHistory: () => api.get('/tests/history'),
  getLevelStatus: () => api.get('/tests/levels'),
  // Recommendations (Phase 4)
  getMyRecommendations: () => api.get('/recommendations/me'),
  // Analytics (Phase 5)
  getMyAnalytics: () => api.get('/analytics/student/me'),
};

export const schoolAPI = {
  getMyClasses: () => api.get('/schools/classes'),
  getClassStudents: (classId) => api.get(`/schools/classes/${classId}/students`),
  getClassRecommendations: (classId) => api.get(`/recommendations/class/${classId}`),
};

export default api;
