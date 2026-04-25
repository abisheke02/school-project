import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import Layout from '../../components/Layout';
import { studentAPI, analyticsAPI, reportsAPI } from '../../services/api';
import { trackStudentViewed } from '../../services/analytics';

const LEVEL_LABELS = ['', 'Starter', 'Basic', 'Intermediate', 'Advanced', 'Mastery'];

const ERROR_COLORS = {
  phonics: '#8B5CF6',
  reading: '#3B82F6',
  writing: '#F97316',
  math: '#22C55E',
};

const StudentDetailPage = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [testHistory, setTestHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      studentAPI.getStudent(studentId),
      studentAPI.getTestHistory(studentId).catch(() => ({ history: [] })),
      analyticsAPI.student(studentId).catch(() => null),
    ])
      .then(([{ profile: p }, { history }, analyticsData]) => {
        setProfile(p);
        setTestHistory(history || []);
        setAnalytics(analyticsData);
        trackStudentViewed(studentId);
      })
      .catch(() => toast.error('Could not load student'))
      .finally(() => setLoading(false));
  }, [studentId]);

  const handleDownloadPDF = () => {
    const url = reportsAPI.downloadStudentPDF(studentId);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `student-report-${studentId}.pdf`);
    // Attach auth header via redirect — works because the Express route accepts JWT in query too
    // For now open in new tab so the browser handles the Bearer token via cookie/session
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 text-slate-400 text-center py-20">Loading student profile…</div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="p-8 text-center text-red-500 py-20">Student not found.</div>
      </Layout>
    );
  }

  const riskColor = profile.ld_risk_score > 70 ? '#EF4444'
    : profile.ld_risk_score > 40 ? '#F59E0B' : '#22C55E';

  const trend = analytics?.trend || [];
  const weakAreas = analytics?.weakAreas || [];
  const timeToday = analytics?.profile?.total_minutes_today ?? 0;

  // At-risk flag: 7-day avg dropped vs prev 7-day avg
  const recentAvg = trend.slice(-7).reduce((s, r) => s + Number(r.avg_score), 0) / (trend.slice(-7).length || 1);
  const prevAvg = trend.slice(-14, -7).reduce((s, r) => s + Number(r.avg_score), 0) / (trend.slice(-14, -7).length || 1);
  const isAtRisk = trend.length >= 7 && prevAvg > 0 && (recentAvg < prevAvg - 15);

  return (
    <Layout>
      <div className="p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="text-blue-600 text-sm hover:underline">
            ← Back
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 text-sm
              font-medium px-4 py-2 rounded-xl hover:bg-slate-50 transition"
          >
            ⬇ Download Report PDF
          </button>
        </div>

        {/* At-risk banner */}
        {isAtRisk && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 mb-5 flex items-center gap-3">
            <span className="text-red-500 text-xl">⚠️</span>
            <p className="text-sm text-red-700 font-medium">
              Score dropped {Math.round(prevAvg - recentAvg)}% vs last week — this student may need extra support.
            </p>
          </div>
        )}

        {/* Student header */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6 flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700">
            {(profile.name || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-extrabold text-slate-800">{profile.name || 'Unnamed'}</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Class {profile.class_grade || '—'} · Age {profile.age || '—'}
            </p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-2xl font-extrabold text-orange-500">🔥 {profile.streak_count ?? 0}</p>
            <p className="text-slate-400 text-xs">Day streak</p>
            {timeToday > 0 && (
              <p className="text-xs text-slate-500 font-medium">{timeToday} min today</p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
            <p className="text-2xl font-extrabold text-purple-700 capitalize">
              {profile.ld_type?.replace('_', ' ') || 'Not Screened'}
            </p>
            <p className="text-slate-400 text-xs mt-1">LD Classification</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
            <p className="text-3xl font-extrabold" style={{ color: riskColor }}>
              {profile.ld_risk_score ?? '—'}
            </p>
            <p className="text-slate-400 text-xs mt-1">Risk Score (0–100)</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
            <p className="text-3xl font-extrabold text-blue-700">
              {profile.current_level ?? 1}
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Level — {LEVEL_LABELS[profile.current_level ?? 1]}
            </p>
          </div>
        </div>

        {/* 14-day score trend chart */}
        {trend.length > 1 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
            <h3 className="font-bold text-slate-700 mb-4">14-Day Score Trend</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trend} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => d?.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Avg Score']}
                  labelFormatter={(d) => `Date: ${d}`}
                />
                <Area
                  type="monotone"
                  dataKey="avg_score"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
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
          <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
            <h3 className="font-bold text-slate-700 mb-4">Weak Areas (last 30 days)</h3>
            <div className="space-y-3">
              {weakAreas.map((area) => {
                const maxCount = Math.max(...weakAreas.map((a) => Number(a.count)));
                const pct = Math.round((Number(area.count) / maxCount) * 100);
                return (
                  <div key={area.error_type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700 capitalize">
                        {area.error_type?.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-400">{area.count} errors</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: ERROR_COLORS[area.error_type] || '#94A3B8',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Level progress */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
          <h3 className="font-bold text-slate-700 mb-4">Level Progress</h3>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <React.Fragment key={lvl}>
                <div className={`flex flex-col items-center ${lvl <= profile.current_level ? 'opacity-100' : 'opacity-30'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                    ${lvl < profile.current_level ? 'bg-blue-700 text-white'
                      : lvl === profile.current_level ? 'bg-blue-200 text-blue-800 border-2 border-blue-500'
                      : 'bg-slate-100 text-slate-400'}`}
                  >
                    {lvl}
                  </div>
                  <span className="text-xs text-slate-400 mt-1">{LEVEL_LABELS[lvl]}</span>
                </div>
                {lvl < 5 && (
                  <div className={`flex-1 h-1 rounded ${lvl < profile.current_level ? 'bg-blue-500' : 'bg-slate-100'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Test History */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="font-bold text-slate-700 mb-4">Test History</h3>
          {testHistory.length === 0 ? (
            <p className="text-slate-400 text-sm">No tests attempted yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {['Level', 'Score', 'Correct', 'Result', 'Date'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {testHistory.map((t) => (
                  <tr key={t.id} className="border-t border-slate-50">
                    <td className="px-3 py-2 font-semibold">Level {t.level}</td>
                    <td className="px-3 py-2">
                      <span className={`font-bold ${t.score_percent >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                        {Math.round(t.score_percent)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{t.correct_count}/{t.total_questions}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${t.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {t.passed ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {new Date(t.attempted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default StudentDetailPage;
