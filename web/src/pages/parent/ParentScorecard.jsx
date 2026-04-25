import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import { analyticsAPI } from '../../services/api';
import useAuthStore from '../../services/authStore';

// Standalone mobile-web page — no Layout chrome, optimised for 2G / < 500KB bundle
// Served at /parent — parents log in via OTP and land here

const LEVEL_LABELS = ['', 'Starter', 'Basic', 'Intermediate', 'Advanced', 'Mastery'];

const DayDot = ({ active }) => (
  <div
    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
      ${active ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}
  >
    {active ? '✓' : '·'}
  </div>
);

const ParentScorecard = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuthStore();
  const [data, setData] = useState(null);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  const childId = user?.child_id || user?.childId;

  useEffect(() => {
    if (!childId) { setLoading(false); return; }

    Promise.all([
      analyticsAPI.student(childId),
      fetch(`/api/recommendations/student/${childId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()).catch(() => ({ recommendations: [] })),
    ])
      .then(([analytics, recData]) => {
        setData(analytics);
        setRecs(recData?.recommendations || []);
      })
      .catch(() => toast.error('Could not load scorecard'))
      .finally(() => setLoading(false));
  }, [childId, token]);

  const profile = data?.profile;
  const trend = data?.trend || [];
  const weakAreas = data?.weakAreas || [];

  // Build 7-day activity calendar
  const today = new Date();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  const activeDates = new Set(trend.map((t) => t.date));

  // Score trend comparison
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400">Loading your child's report…</p>
      </div>
    );
  }

  if (!childId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-4xl mb-4">👋</p>
          <p className="text-slate-500 mb-6">No student linked to your account. Ask the teacher to link your child.</p>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="text-sm text-slate-400 underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Weekly Report</p>
          <h1 className="text-lg font-extrabold text-slate-800">
            {profile?.name || 'Your Child'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="text-xs text-slate-400 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="px-5 py-6 space-y-5 max-w-lg mx-auto">

        {/* Score headline */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          {thisWeekAvg != null ? (
            <>
              <p className="text-slate-500 text-sm">
                <strong className="text-slate-800">{profile?.name?.split(' ')[0] || 'Your child'}</strong> scored{' '}
                <strong className="text-blue-700 text-lg">{thisWeekAvg}%</strong> this week
                {lastWeekAvg != null && (
                  <>
                    , {thisWeekAvg > lastWeekAvg
                      ? <span className="text-green-600 font-semibold">up from {lastWeekAvg}% last week 🎉</span>
                      : thisWeekAvg < lastWeekAvg
                        ? <span className="text-amber-500 font-semibold">down from {lastWeekAvg}% last week</span>
                        : <span className="text-slate-500">same as last week</span>}
                  </>
                )}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-xs text-slate-400">Level:</span>
                <span className="font-bold text-purple-700">
                  {LEVEL_LABELS[profile?.current_level] || 'Starter'}
                </span>
                <span className="text-xs text-slate-400 ml-auto">🔥 {profile?.streak_count ?? 0} day streak</span>
              </div>
            </>
          ) : (
            <p className="text-slate-400 text-sm">No activity recorded this week yet.</p>
          )}
        </div>

        {/* 7-day activity calendar */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">This Week's Activity</h3>
          <div className="flex justify-between">
            {last7.map((date, i) => {
              const dayLabel = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(date).getDay()];
              return (
                <div key={date} className="flex flex-col items-center gap-1">
                  <DayDot active={activeDates.has(date)} />
                  <span className="text-xs text-slate-400">{dayLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Score trend chart */}
        {trend.length > 1 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3">14-Day Score Trend</h3>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={trend} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => d?.slice(5)} />
                <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Score']}
                  labelFormatter={(d) => d}
                />
                <Area
                  type="monotone"
                  dataKey="avg_score"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#scoreGrad)"
                  dot={false}
                  name="Score"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Weak areas */}
        {weakAreas.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Needs More Practice</h3>
            <div className="space-y-2">
              {weakAreas.map((w) => (
                <div key={w.error_type} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 capitalize">{w.error_type?.replace('_', ' ')}</span>
                  <span className="text-xs text-slate-400">{w.count} errors this month</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI tip of the week */}
        {recs.length > 0 && (
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💡</span>
              <h3 className="text-sm font-bold text-blue-800">Tip of the Week</h3>
            </div>
            <p className="text-sm text-blue-700 leading-relaxed">
              {recs[0]?.why || recs[0]?.title || 'Keep practising every day — consistency is the key!'}
            </p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 pt-2">
          Powered by LD Platform · For questions, contact your child's teacher
        </p>
      </div>
    </div>
  );
};

export default ParentScorecard;
