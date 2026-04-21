import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../services/authStore';
import useThemeStore from '../services/themeStore';

const NAV_TEACHER = [
  { label: 'Dashboard', path: '/dashboard', icon: '🏠' },
  { label: 'Messages', path: '/messages', icon: '💬' },
];

const NAV_ADMIN = [
  { label: 'Dashboard', path: '/dashboard', icon: '🏠' },
  { label: 'Admin', path: '/admin', icon: '⚙️' },
  { label: 'Messages', path: '/messages', icon: '💬' },
];

const Layout = ({ children }) => {
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme, initTheme } = useThemeStore();
  const location = useLocation();
  const nav = user?.role === 'admin' ? NAV_ADMIN : NAV_TEACHER;

  useEffect(() => {
    initTheme();
  }, []);

  return (
    <div className="min-h-screen flex bg-[var(--bg-main)] overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 dark:bg-black flex flex-col flex-shrink-0 border-r border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div className="px-6 py-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl accent-gradient flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-blue-500/30">
              L
            </div>
            <h1 className="text-white text-xl font-extrabold tracking-tight">LD Support</h1>
          </div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest px-1">
            {user?.role === 'admin' ? 'Admin Portal' : 'Teacher Portal'}
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-1.5">
          {nav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'accent-gradient text-white shadow-lg shadow-blue-500/20 scale-[1.02]'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={`text-lg transition-transform ${isActive ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-6 mt-auto border-t border-slate-800">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold mb-4 hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span>{isDark ? '🌙' : '☀️'}</span>
              <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isDark ? 'bg-blue-500' : 'bg-slate-600'}`}>
              <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>
          
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-800 mb-2">
            <p className="text-white text-sm font-bold truncate">{user?.name || 'User'}</p>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">
              {user?.role || 'authorized user'}
            </p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-red-400 text-sm font-bold transition-colors group w-full"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-[var(--bg-main)]">
        {children}
      </main>
    </div>
  );
};

export default Layout;
