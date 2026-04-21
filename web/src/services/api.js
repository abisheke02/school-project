import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export const authAPI = {
  login: (token, type = 'firebase') =>
    api.post('/auth/login', type === 'supabase' ? { supabaseToken: token } : { firebaseIdToken: token }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  demo: (role = 'teacher') => api.post(`/auth/demo?role=${role}`),
};

export const schoolAPI = {
  createClass: (data) => api.post('/schools/classes', data),
  getMyClasses: () => api.get('/schools/classes'),
  getClassStudents: (classId) => api.get(`/schools/classes/${classId}/students`),
};

export const studentAPI = {
  getStudent: (id) => api.get(`/students/${id}`),
  getTestHistory: (id) => api.get(`/tests/student/${id}`),
  getErrorSummary: () => api.get('/practice/errors'),
};

export const recommendationAPI = {
  getClassRecs: (classId) => api.get(`/recommendations/class/${classId}`),
  generate: (userId, audience) => api.post('/recommendations/generate', { userId, audience }),
};

export const analyticsAPI = {
  classHeatmap: (classId) => api.get(`/analytics/class/${classId}/heatmap`),
  classAtRisk: (classId) => api.get(`/analytics/class/${classId}/at-risk`),
  student: (id) => api.get(`/analytics/student/${id}`),
  adminOverview: () => api.get('/analytics/admin/overview'),
};

export const messagesAPI = {
  getConversations: () => api.get('/messages'),
  getThread: (partnerId) => api.get(`/messages/${partnerId}`),
  send: (receiverId, body) => api.post('/messages', { receiverId, body }),
};

export const adminAPI = {
  getSchools: () => api.get('/admin/schools'),
  updateSchool: (id, data) => api.put(`/admin/schools/${id}`, data),
  getOverview: () => api.get('/analytics/admin/overview'),
  triggerCron: (job) => api.post(`/admin/cron/${job}`),
};

export const reportsAPI = {
  downloadStudentPDF: (studentId) => `/api/reports/student/${studentId}`,
};

export default api;
