import { create } from 'zustand';

const useThemeStore = create((set) => ({
  isDark: localStorage.getItem('theme') === 'dark',
  
  toggleTheme: () => set((state) => {
    const newDark = !state.isDark;
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
    if (newDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { isDark: newDark };
  }),

  initTheme: () => {
    const dark = localStorage.getItem('theme') === 'dark';
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ isDark: dark });
  }
}));

export default useThemeStore;
