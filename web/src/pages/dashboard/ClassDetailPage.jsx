import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';
import LDHeatmap from '../../components/LDHeatmap';
import { schoolAPI, analyticsAPI } from '../../services/api';

const LD_BADGE = {
  dyslexia: 'bg-purple-100 text-purple-700',
  dysgraphia: 'bg-orange-100 text-orange-700',
  dyscalculia: 'bg-green-100 text-green-700',
  mixed: 'bg-red-100 text-red-700',
  not_detected: 'bg-slate-100 text-slate-500',
  null: 'bg-yellow-100 text-yellow-700',
};

const LEVEL_LABELS = ['', 'Starter', 'Basic', 'Intermediate', 'Advanced', 'Mastery'];

const RiskBar = ({ score }) => {
  const color = score > 70 ? 'bg-red-500' : score > 40 ? 'bg-amber-400' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score || 0}%` }} />
      </div>
      <span className="text-xs text-slate-500">{score ?? '—'}</span>
    </div>
  );
};

const daysSince = (dateStr) => {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000);
};

const ClassDetailPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [atRisk, setAtRisk] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    Promise.all([
      schoolAPI.getClassStudents(classId),
      analyticsAPI.classAtRisk(classId).catch(() => ({ atRisk: [] })),
    ])
      .then(([{ students: data }, { atRisk: risk }]) => {
        setStudents(data || []);
        setAtRisk(risk || []);
      })
      .catch(() => toast.error('Could not load class data'))
      .finally(() => setLoading(false));
  }, [classId]);

  const filtered = students.filter((s) =>
    (s.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const screenedCount = students.filter((s) => s.ld_type).length;
  const atRiskIds = new Set(atRisk.map((r) => r.student_id));

  const displayList = activeTab === 'at-risk'
    ? atRisk.map((r) => ({
        id: r.student_id,
        name: r.name,
        ld_type: r.ld_type,
        ld_risk_score: r.ld_risk_score,
        current_level: r.current_level,
        this_week_avg: r.this_week_avg,
        last_week_avg: r.last_week_avg,
        last_active_at: r.last_active_at,
      }))
    : filtered;

  return (
    <Layout>
      <div className="p-8">
        <button onClick={() => navigate('/dashboard')} className="text-blue-600 text-sm mb-6 hover:underline">
          ← Back to Dashboard
        </button>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Students', value: students.length, color: 'text-blue-700' },
            { label: 'Screened', value: screenedCount, color: 'text-purple-700' },
            { label: 'Needs Attention', value: atRisk.length, color: 'text-red-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-100 p-4 text-center">
              <p className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</p>
              <p className="text-slate-500 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* LD Heatmap */}
        <div className="mb-6">
          <LDHeatmap students={filtered} />
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-5 border-b border-slate-100">
          {[
            { key: 'all', label: `All Students (${students.length})` },
            { key: 'at-risk', label: `⚠️ Needs Attention (${atRisk.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition
                ${activeTab === tab.key
                  ? 'bg-white text-blue-700 border border-b-white border-slate-100 -mb-px'
                  : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab.label}
            </button>
          ))}

          {activeTab === 'all' && (
            <div className="ml-auto pb-1">
              <input
                type="text"
                placeholder="Search students…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-1.5 w-56 focus:outline-none
                  focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
          )}
        </div>

        {/* At-risk explanation banner */}
        {activeTab === 'at-risk' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-5 text-sm text-amber-800">
            Students shown here have either <strong>dropped 15%+ in score</strong> vs the previous week,
            or <strong>haven't logged in for 3+ days</strong>.
          </div>
        )}

        {/* Students table */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {activeTab === 'at-risk'
                  ? ['Name', 'LD Type', 'This Week', 'Last Week', 'Drop', 'Last Active', 'Level'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))
                  : ['Name', 'Class', 'LD Type', 'Risk Score', 'Level', 'Streak'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))
                }
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading…</td></tr>
              ) : displayList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    {activeTab === 'at-risk' ? '🎉 No students need attention right now' : 'No students found'}
                  </td>
                </tr>
              ) : activeTab === 'at-risk' ? (
                displayList.map((s) => {
                  const drop = (s.last_week_avg && s.this_week_avg)
                    ? (s.last_week_avg - s.this_week_avg).toFixed(1)
                    : null;
                  const inactive = daysSince(s.last_active_at);
                  return (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/students/${s.id}`)}
                      className="border-b border-slate-50 hover:bg-red-50/30 cursor-pointer transition"
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-slate-800 flex items-center gap-2">
                          {atRiskIds.has(s.id) && <span className="text-red-400 text-xs">⚠️</span>}
                          {s.name || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${LD_BADGE[s.ld_type] || LD_BADGE.null}`}>
                          {s.ld_type ? s.ld_type.replace('_', ' ') : 'Not screened'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-700">
                        {s.this_week_avg != null ? `${s.this_week_avg}%` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {s.last_week_avg != null ? `${s.last_week_avg}%` : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {drop != null ? (
                          <span className="text-red-600 font-bold">−{drop}%</span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">
                        {inactive == null ? 'Never' : inactive === 0 ? 'Today' : `${inactive}d ago`}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {s.current_level ? LEVEL_LABELS[s.current_level] : '—'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                displayList.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/students/${s.id}`)}
                    className={`border-b border-slate-50 hover:bg-blue-50 cursor-pointer transition
                      ${atRiskIds.has(s.id) ? 'bg-red-50/20' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-800 flex items-center gap-2">
                        {atRiskIds.has(s.id) && <span className="text-red-400 text-xs">⚠️</span>}
                        {s.name || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {s.class_grade ? `Class ${s.class_grade}` : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${LD_BADGE[s.ld_type] || LD_BADGE.null}`}>
                        {s.ld_type ? s.ld_type.replace('_', ' ') : 'Not screened'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <RiskBar score={s.ld_risk_score} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {s.current_level ? `${s.current_level} — ${LEVEL_LABELS[s.current_level]}` : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-orange-500 font-bold">🔥 {s.streak_count ?? 0}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default ClassDetailPage;
