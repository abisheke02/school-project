import { create } from 'zustand';
import { authAPI } from './api';
import { identifyUser, resetAnalytics } from './analytics';

const useAuthStore = create((set) => ({
  token: localStorage.getItem('auth_token') || null,
  user: JSON.parse(localStorage.getItem('user_data') || 'null'),

  login: async (token, type = 'supabase') => {
    const { token: backendToken, user } = await authAPI.login(token, type);
    localStorage.setItem('auth_token', backendToken);
    localStorage.setItem('user_data', JSON.stringify(user));
    set({ token: backendToken, user });
    identifyUser(user);
    return user;
  },

  demoLogin: async (role = 'teacher') => {
    const { token, user } = await authAPI.demo(role);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify(user));
    set({ token, user });
    identifyUser(user);
    return user;
  },

  setDemoAuth: (user, token) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify(user));
    set({ token, user });
    identifyUser(user);
  },

  logout: async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    resetAnalytics();
    set({ token: null, user: null });
    window.location.href = '/login';
  },
}));

export default useAuthStore;
