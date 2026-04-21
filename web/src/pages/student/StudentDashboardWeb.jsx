import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import { analyticsAPI } from '../../services/api';
import useAuthStore from '../../services/authStore';

const LEVEL_LABELS = ['', 'Starter', 'Basic', 'Intermediate', 'Advanced', 'Mastery'];
const LEVEL_COLORS = ['', '#388E3C', '#1976D2', '#F57C00', '#7B1FA2', '#F9A825'];

const ERROR_COLORS = {
  phonics: '#7C3AED', reading: '#2563EB', writing: '#EA580C', math: '#16A34A',
};

const LD_BADGE = {
  dyslexia: 'bg-purple-100 text-purple-700 border-purple-200',
  dysgraphia: 'bg-orange-100 text-orange-700 border-orange-200',
  dyscalculia: 'bg-green-100 text-green-700 border-green-200',
  mixed: 'bg-red-100 text-red-700 border-red-200',
  not_detected: 'bg-slate-100 text-slate-600 border-slate-200',
};

const LevelRing = ({ level }) => {
  const pct = ((level - 1) / 4) * 100;
  const color = LEVEL_COLORS[level] || '#1976D2';
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={100} height={100}>
      <circle cx={50} cy={50} r={r} fill="none" stroke="#F1F5F9" strokeWidth={10} />
      <circle
        cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text x={50} y={50} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 22, fontWeight: 800, fill: color }}>
        {level}
      </text>
    </svg>
  );
};

const StudentDashboardWeb = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const studentId = user?.id;
    if (!studentId) { setLoading(false); return; }
    const token = localStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`/api/students/${studentId}`, { headers }).then((r) => r.json()).catch(() => ({})),
      analyticsAPI.student(studentId).catch(() => null),
      fetch(`/api/recommendations/me`, { headers }).then((r) => r.json()).catch(() => ({})),
    ])
      .then(([studentData, analyticsData, recData]) => {
        setProfile(studentData?.profile || null);
        setAnalytics(analyticsData);
        setRecommendations(recData?.recommendations || []);
      })
      .catch(() => toast.error('Could not load dashboard'))
      .finally(() => setLoading(false));
  }, [user]);

  const trend = analytics?.trend || [];
  const weakAreas = analytics?.weakAreas || [];
  const testSummary = analytics?.testSummary || [];
  const timeToday = analytics?.profile?.total_minutes_today ?? 0;

  const recentTrend = trend.slice(-7);
  const prevTrend = trend.slice(-14, -7);
  const thisWeekAvg = recentTrend.length
    ? Math.round(recentTrend.reduce((s, r) => s + Number(r.avg_score), 0) / recentTrend.length)
    : null;
  const lastWeekAvg = prevTrend.length
    ? Math.round(prevTrend.reduce((s, r) => s + Number(r.avg_score), 0) / prevTrend.length)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <p className="text-slate-400">Loading your dashboard…</p>
      </div>
    );
  }

  const firstName = profile?.name?.split(' ')[0] || user?.name || 'Student';
  const level = profile?.current_level ?? 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-12">

      {/* Top nav */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center">
              {firstName[0].toUpperCase()}
            </div>
            <div>
              <p className="font-extrabold text-slate-800">{profile?.name || user?.name || 'Student'}</p>
              <p className="text-xs text-slate-400">
                Class {profile?.class_grade || '—'} · Age {profile?.age || '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <span className="text-orange-500 font-bold text-sm">🔥 {profile?.streak_count ?? 0} day streak</span>
            <button onClick={logout} className="text-sm text-slate-400 hover:text-slate-600 transition">
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 flex gap-1">
          {[
            { label: '🏠 Dashboard', path: '/student' },
            { label: '📝 Level Tests', path: '/student/tests' },
          ].map((tab) => (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition
                ${window.location.pathname === tab.path
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Hero */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
          <h1 className="text-2xl font-extrabold mb-1">Hello, {firstName}! 👋</h1>
          <p className="text-blue-100 text-sm">
            {thisWeekAvg != null
              ? `You scored ${thisWeekAvg}% this week${lastWeekAvg != null
                  ? ` · ${thisWeekAvg >= lastWeekAvg ? `↑ up from ${lastWeekAvg}%` : `↓ down from ${lastWeekAvg}%`} last week`
                  : ''}`
              : 'Start practising to see your weekly score here.'}
          </p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: '📊', label: 'This Week', value: thisWeekAvg != null ? `${thisWeekAvg}%` : '—', color: 'text-blue-700' },
            { icon: '🔥', label: 'Day Streak', value: profile?.streak_count ?? 0, color: 'text-orange-500' },
            { icon: '⏱', label: 'Time Today', value: `${timeToday} min`, color: 'text-green-600' },
            { icon: '🎯', label: 'Level', value: LEVEL_LABELS[level], color: 'text-purple-700' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-sm">
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Level ring + Trend chart */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Level ring */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col items-center gap-4">
            <LevelRing level={level} />
            <div className="text-center">
              <p className="font-bold text-slate-700">Level {level} — {LEVEL_LABELS[level]}</p>
              {profile?.ld_type && (
                <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold border capitalize ${LD_BADGE[profile.ld_type] || LD_BADGE.not_detected}`}>
                  {profile.ld_type.replace('_', ' ')}
                  {profile.ld_risk_score != null && ` · ${profile.ld_risk_score}/100`}
                </span>
              )}
            </div>
            {/* Step indicators */}
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <div key={lvl} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${lvl < level ? 'bg-blue-600 text-white'
                    : lvl === level ? 'bg-blue-200 text-blue-800 ring-2 ring-blue-500'
                    : 'bg-slate-100 text-slate-400'}`}>
                  {lvl < level ? '✓' : lvl}
                </div>
              ))}
            </div>
          </div>

          {/* Score trend */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4">14-Day Score Trend</h3>
            {trend.length > 1 ? (
              <ResponsiveContainer width="100%" height={165}>
                <AreaChart data={trend} margin={{ top: 0, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d?.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Score']} />
                  <Area type="monotone" dataKey="avg_score" stroke="#3B82F6" strokeWidth={2.5}
                    fill="url(#sg)" dot={false} name="Score" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
                No practice sessions yet — complete some exercises to see your trend!
              </div>
            )}
          </div>
        </div>

        {/* Weak areas + Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4">Needs More Practice</h3>
            {weakAreas.length > 0 ? (
              <div className="space-y-4">
                {weakAreas.map((area) => {
                  const maxCount = Math.max(...weakAreas.map((a) => Number(a.count)));
                  const pct = Math.round((Number(area.count) / maxCount) * 100);
                  return (
                    <div key={area.error_type}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-700 capitalize">
                          {area.error_type?.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-slate-400">{area.count} errors</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: ERROR_COLORS[area.error_type] || '#94A3B8' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">No error data yet. Keep practising!</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4">💡 Recommended for You</h3>
            {recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.slice(0, 3).map((rec, i) => (
                  <div key={i} className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <p className="text-sm font-semibold text-blue-800 capitalize">
                      {rec.title || rec.exercise_type}
                    </p>
                    <p className="text-xs text-blue-600 mt-1 leading-relaxed">{rec.why}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">
                AI recommendations appear here on Sundays after your weekly practice.
              </p>
            )}
          </div>
        </div>

        {/* Test history */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-700">Level Test Progress</h3>
            <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
              Score 70% to unlock next level
            </span>
          </div>
          {testSummary.length > 0 ? (
            <div className="space-y-4">
              {testSummary.map((t) => (
                <div key={t.level} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0
                    ${t.ever_passed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-600'}`}>
                    {t.ever_passed ? '✓' : t.level}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-700">
                        Level {t.level} — {LEVEL_LABELS[t.level]}
                      </span>
                      <span className={`text-xs font-bold ${t.ever_passed ? 'text-green-600' : 'text-amber-500'}`}>
                        Best: {t.best_score}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${t.ever_passed ? 'bg-green-500' : 'bg-amber-400'}`}
                        style={{ width: `${Math.min(Number(t.best_score), 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 w-20 text-right">
                    {t.attempts} attempt{Number(t.attempts) !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📝</p>
              <p className="text-slate-500 font-medium">No tests attempted yet</p>
              <p className="text-slate-400 text-sm mt-1">Open the Android app → Tests tab to start</p>
            </div>
          )}
        </div>

        {/* Mobile CTA */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-blue-100 p-5 flex items-center gap-5">
          <span className="text-4xl">📱</span>
          <div>
            <p className="font-bold text-slate-800">Full experience on the Android app</p>
            <p className="text-slate-500 text-sm mt-0.5">
              Daily exercises · TTS reading · Speech practice · Level tests · Offline mode
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentDashboardWeb;
