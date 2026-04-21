import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const useAuthStore = create((set, get) => ({
  token: null,
  user: null,
  isLoading: true,       // true while checking stored token on app launch
  isNewUser: false,

  // Called on app launch — restore session from AsyncStorage
  initialize: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userStr = await AsyncStorage.getItem('user_data');
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr), isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  // Called after Firebase OTP verification succeeds
  login: async (firebaseIdToken, fcmToken = null) => {
    const { token, user, isNewUser } = await authAPI.login(firebaseIdToken, fcmToken);
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('user_data', JSON.stringify(user));
    set({ token, user, isNewUser });
    return { user, isNewUser };
  },

  // Update user in store after profile setup
  setUser: async (updatedUser) => {
    const merged = { ...get().user, ...updatedUser };
    await AsyncStorage.setItem('user_data', JSON.stringify(merged));
    set({ user: merged });
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch {}
    await AsyncStorage.multiRemove(['auth_token', 'user_data']);
    set({ token: null, user: null, isNewUser: false });
  },
}));

export default useAuthStore;
