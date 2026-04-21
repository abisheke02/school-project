import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const LEVEL_INFO = {
  1: { label: 'Starter', emoji: '🌱', bg: 'bg-green-50', border: 'border-green-200', accent: 'text-green-700', btn: 'bg-green-600 hover:bg-green-700', desc: 'Basic letters, sounds & number counting' },
  2: { label: 'Basic', emoji: '📘', bg: 'bg-blue-50', border: 'border-blue-200', accent: 'text-blue-700', btn: 'bg-blue-600 hover:bg-blue-700', desc: 'Simple reading, CVC words & arithmetic' },
  3: { label: 'Intermediate', emoji: '🚀', bg: 'bg-orange-50', border: 'border-orange-200', accent: 'text-orange-700', btn: 'bg-orange-500 hover:bg-orange-600', desc: 'Comprehension, fractions & sentence building' },
  4: { label: 'Advanced', emoji: '⭐', bg: 'bg-purple-50', border: 'border-purple-200', accent: 'text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700', desc: 'Grammar mastery & problem solving' },
  5: { label: 'Mastery', emoji: '🏆', bg: 'bg-amber-50', border: 'border-amber-200', accent: 'text-amber-700', btn: 'bg-amber-500 hover:bg-amber-600', desc: 'Critical thinking & complex maths' },
};

const StudentTestLevels = ({ onStart }) => {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    fetch('/api/tests/levels', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(({ levels: lvls }) => setLevels(lvls || []))
      .catch(() => toast.error('Could not load levels'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        Loading levels…
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold text-slate-800">Level Tests</h2>
        <p className="text-slate-500 text-sm mt-1">
          Score <strong>70% or above</strong> to pass and unlock the next level. 20 questions per test.
        </p>
      </div>

      {/* Level cards */}
      <div className="space-y-4">
        {levels.map((lvl) => {
          const info = LEVEL_INFO[lvl.level];
          const locked = !lvl.unlocked;
          return (
            <div
              key={lvl.level}
              className={`rounded-2xl border-2 p-5 transition
                ${locked ? 'bg-slate-50 border-slate-100 opacity-60' : `${info.bg} ${info.border}`}`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{locked ? '🔒' : info.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-extrabold text-lg ${locked ? 'text-slate-400' : info.accent}`}>
                      Level {lvl.level} — {info.label}
                    </h3>
                    {lvl.isCurrent && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${info.btn.split(' ')[0]}`}>
                        Current
                      </span>
                    )}
                    {lvl.everPassed && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        ✓ Passed
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mt-0.5 ${locked ? 'text-slate-400' : 'text-slate-500'}`}>
                    {info.desc}
                  </p>
                  {lvl.bestScore != null && (
                    <p className={`text-sm font-semibold mt-1 ${lvl.everPassed ? 'text-green-600' : 'text-amber-600'}`}>
                      Best score: {lvl.bestScore}%
                    </p>
                  )}
                  {locked && (
                    <p className="text-xs text-slate-400 mt-1">
                      Pass Level {lvl.level - 1} to unlock
                    </p>
                  )}
                </div>

                {!locked && (
                  <button
                    onClick={() => onStart(lvl.level)}
                    className={`flex-shrink-0 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition ${info.btn}`}
                  >
                    {lvl.bestScore != null ? 'Retry →' : 'Start →'}
                  </button>
                )}
              </div>

              {/* Progress bar for attempted levels */}
              {lvl.bestScore != null && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Best attempt</span>
                    <span>{lvl.bestScore}% / 70% needed</span>
                  </div>
                  <div className="h-2 bg-white/60 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className={`h-full rounded-full transition-all ${lvl.everPassed ? 'bg-green-500' : 'bg-amber-400'}`}
                      style={{ width: `${Math.min(lvl.bestScore, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info box */}
      <div className="mt-6 bg-blue-50 rounded-xl border border-blue-100 p-4">
        <p className="text-sm font-bold text-blue-800 mb-1">ℹ️ How it works</p>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>20 multiple-choice questions per test</li>
          <li>25-minute timer — auto-submits when time runs out</li>
          <li>Score 70% or above to unlock the next level</li>
          <li>If you fail, you can retry after reviewing practice exercises</li>
          <li>AI feedback explains every wrong answer</li>
        </ul>
      </div>
    </div>
  );
};

export default StudentTestLevels;
