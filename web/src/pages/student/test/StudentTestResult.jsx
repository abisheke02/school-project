import React, { useState } from 'react';

const LEVEL_LABELS = ['', 'Starter', 'Basic', 'Intermediate', 'Advanced', 'Mastery'];
const PASS_THRESHOLD = 70;

const StudentTestResult = ({ result, level, onRetry, onDone }) => {
  const [showReview, setShowReview] = useState(false);
  const { scorePercent, correctCount, totalQuestions, passed, leveledUp, scoredAnswers = [], timeTakenSeconds } = result;

  const mins = Math.floor((timeTakenSeconds || 0) / 60);
  const secs = (timeTakenSeconds || 0) % 60;
  const wrongAnswers = scoredAnswers.filter((a) => !a.isCorrect);

  const scoreColor = passed ? 'text-green-600' : 'text-red-500';
  const heroBg = passed ? 'from-green-50 to-emerald-50 border-green-200' : 'from-red-50 to-orange-50 border-red-200';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Hero result card */}
      <div className={`rounded-2xl border-2 bg-gradient-to-br ${heroBg} p-8 text-center mb-6`}>
        <p className="text-5xl mb-4">
          {leveledUp ? '🏆' : passed ? '🎉' : '💪'}
        </p>
        <p className={`text-5xl font-black ${scoreColor} mb-2`}>{scorePercent}%</p>
        <p className={`text-xl font-extrabold ${scoreColor}`}>
          {passed ? 'PASSED!' : 'NOT YET'}
        </p>
        <p className="text-slate-500 text-sm mt-2">
          Level {level} — {LEVEL_LABELS[level]}
        </p>

        {leveledUp && (
          <div className="mt-4 bg-green-600 text-white rounded-xl px-5 py-2.5 inline-block font-bold text-sm">
            🔓 Level {level + 1} ({LEVEL_LABELS[level + 1]}) Unlocked!
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Correct', value: `${correctCount} / ${totalQuestions}`, color: 'text-green-600' },
          { label: 'Wrong', value: `${totalQuestions - correctCount} / ${totalQuestions}`, color: 'text-red-500' },
          { label: 'Time Taken', value: `${mins}m ${secs}s`, color: 'text-blue-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4 text-center">
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Score bar */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 mb-6">
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Your score</span>
          <span>Pass mark: {PASS_THRESHOLD}%</span>
        </div>
        <div className="h-4 bg-slate-100 rounded-full overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all duration-700 ${passed ? 'bg-green-500' : 'bg-red-400'}`}
            style={{ width: `${scorePercent}%` }}
          />
          {/* Pass threshold marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-400"
            style={{ left: `${PASS_THRESHOLD}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-slate-400">
          <span>0%</span>
          <span className="text-slate-500 font-semibold" style={{ marginLeft: `${PASS_THRESHOLD - 5}%` }}>70%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Message */}
      <div className={`rounded-xl px-5 py-4 mb-6 ${passed ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'}`}>
        <p className={`text-sm font-semibold ${passed ? 'text-green-800' : 'text-amber-800'}`}>
          {passed
            ? leveledUp
              ? `Amazing work! You've unlocked Level ${level + 1}. Keep going!`
              : `Well done! You've passed Level ${level}. Try the next level when you're ready.`
            : `You scored ${scorePercent}%. You need ${PASS_THRESHOLD}% to pass. Review the mistakes below and try again — you've got this!`}
        </p>
      </div>

      {/* Wrong answers review */}
      {wrongAnswers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 mb-6 overflow-hidden">
          <button
            onClick={() => setShowReview((s) => !s)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <span>📖 Review {wrongAnswers.length} wrong answer{wrongAnswers.length > 1 ? 's' : ''}</span>
            <span className="text-slate-400">{showReview ? '▲' : '▼'}</span>
          </button>

          {showReview && (
            <div className="divide-y divide-slate-50">
              {wrongAnswers.map((a, i) => (
                <div key={i} className="px-5 py-4">
                  <p className="text-sm font-semibold text-slate-700 mb-2">
                    Q{i + 1}. {a.question_text}
                  </p>
                  <div className="flex gap-3 flex-wrap text-xs mb-2">
                    <span className="bg-red-50 text-red-700 border border-red-100 px-2 py-1 rounded-lg font-medium">
                      ✗ You answered: {a.studentAnswer || '(skipped)'}
                    </span>
                    <span className="bg-green-50 text-green-700 border border-green-100 px-2 py-1 rounded-lg font-medium">
                      ✓ Correct: {a.correctAnswer}
                    </span>
                  </div>
                  {a.aiFeedback && (
                    <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                      <p className="text-xs text-blue-700 leading-relaxed">💡 {a.aiFeedback}</p>
                    </div>
                  )}
                  {!a.aiFeedback && a.explanation && (
                    <p className="text-xs text-slate-500 leading-relaxed mt-1">
                      {a.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onDone}
          className="flex-1 border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition"
        >
          ← All Levels
        </button>
        <button
          onClick={onRetry}
          className={`flex-1 text-white font-bold py-3 rounded-xl transition
            ${passed ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {passed ? 'Try Next Level →' : 'Retry Level →'}
        </button>
      </div>
    </div>
  );
};

export default StudentTestResult;
