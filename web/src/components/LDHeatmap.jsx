import React from 'react';

// Heatmap: students (rows) × LD risk levels (columns)
// Shows at a glance which students need attention

const LD_TYPES = ['dyslexia', 'dysgraphia', 'dyscalculia', 'mixed', 'not_detected'];

const LD_COLORS = {
  dyslexia:     { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  dysgraphia:   { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  dyscalculia:  { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  mixed:        { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
  not_detected: { bg: 'bg-slate-100',  text: 'text-slate-500',  dot: 'bg-slate-400' },
};

const riskLevel = (score) => {
  if (!score) return { label: 'Not screened', color: 'bg-slate-100 text-slate-400' };
  if (score >= 70) return { label: 'High', color: 'bg-red-100 text-red-700 font-bold' };
  if (score >= 40) return { label: 'Medium', color: 'bg-amber-100 text-amber-700 font-semibold' };
  return { label: 'Low', color: 'bg-green-100 text-green-700' };
};

const LDHeatmap = ({ students }) => {
  // Count LD distribution for the summary strip
  const distribution = LD_TYPES.reduce((acc, t) => {
    acc[t] = students.filter((s) => s.ld_type === t).length;
    return acc;
  }, {});
  const unscreened = students.filter((s) => !s.ld_type).length;
  const atRisk = students.filter((s) => s.ld_risk_score >= 70).length;

  return (
    <div className="space-y-5">
      {/* Distribution summary */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {LD_TYPES.map((type) => {
          const c = LD_COLORS[type];
          return (
            <div key={type} className={`${c.bg} rounded-xl p-3 text-center`}>
              <p className={`text-2xl font-extrabold ${c.text}`}>{distribution[type]}</p>
              <p className={`text-xs mt-0.5 capitalize ${c.text}`}>{type.replace('_', ' ')}</p>
            </div>
          );
        })}
        <div className="bg-yellow-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-extrabold text-yellow-700">{unscreened}</p>
          <p className="text-xs mt-0.5 text-yellow-600">Not Screened</p>
        </div>
      </div>

      {/* At-risk alert */}
      {atRisk > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <p className="text-red-700 font-semibold text-sm">
            {atRisk} student{atRisk !== 1 ? 's' : ''} with high risk score (70+). Review their profiles and apply targeted interventions.
          </p>
        </div>
      )}

      {/* Student risk grid */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-700 text-sm">Student Risk Overview</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {students.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No students in this class yet.</p>
          ) : (
            students.map((s) => {
              const risk = riskLevel(s.ld_risk_score);
              const typeColors = LD_COLORS[s.ld_type] || LD_COLORS.not_detected;
              return (
                <div key={s.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 flex-shrink-0">
                    {(s.name || '?')[0].toUpperCase()}
                  </div>

                  {/* Name + class */}
                  <div className="w-36 flex-shrink-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{s.name || 'Unnamed'}</p>
                    <p className="text-slate-400 text-xs">Class {s.class_grade || '—'}</p>
                  </div>

                  {/* LD Type */}
                  <div className="w-32 flex-shrink-0">
                    {s.ld_type ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold capitalize ${typeColors.bg} ${typeColors.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${typeColors.dot}`} />
                        {s.ld_type.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                        Not screened
                      </span>
                    )}
                  </div>

                  {/* Risk bar */}
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (s.ld_risk_score || 0) >= 70 ? 'bg-red-500'
                          : (s.ld_risk_score || 0) >= 40 ? 'bg-amber-400'
                          : 'bg-green-500'
                        }`}
                        style={{ width: `${s.ld_risk_score || 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-8 text-right">{s.ld_risk_score ?? '—'}</span>
                  </div>

                  {/* Risk badge */}
                  <span className={`text-xs px-2 py-1 rounded-full w-24 text-center flex-shrink-0 ${risk.color}`}>
                    {risk.label}
                  </span>

                  {/* Streak */}
                  <span className="text-orange-500 text-sm flex-shrink-0 w-14 text-right">
                    🔥 {s.streak_count ?? 0}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default LDHeatmap;
