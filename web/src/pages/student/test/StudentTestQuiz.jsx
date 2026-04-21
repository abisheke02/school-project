import React, { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

const LEVEL_LABELS = ['', 'Starter', 'Basic', 'Intermediate', 'Advanced', 'Mastery'];
const LEVEL_COLORS = ['', 'bg-green-600', 'bg-blue-600', 'bg-orange-500', 'bg-purple-600', 'bg-amber-500'];
const TOTAL_TIME = 25 * 60; // 25 minutes in seconds

const pad = (n) => String(n).padStart(2, '0');

const StudentTestQuiz = ({ level, onResult, onBack }) => {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const startTime = useRef(Date.now());
  const timerRef = useRef(null);
  const answered = useRef(false);

  const token = localStorage.getItem('auth_token');

  const submitTest = useCallback(async (finalAnswers) => {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    const timeTakenMs = Date.now() - startTime.current;
    try {
      const resp = await fetch('/api/tests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          level,
          answers: Object.entries(finalAnswers).map(([questionId, studentAnswer]) => ({ questionId, studentAnswer })),
          time_taken_ms: timeTakenMs,
        }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Submit failed');
      onResult(result);
    } catch (err) {
      toast.error(err.message || 'Could not submit test');
      setSubmitting(false);
    }
  }, [level, submitting, token, onResult]);

  useEffect(() => {
    fetch(`/api/tests/questions?level=${level}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(({ questions: qs, error }) => {
        if (error) { toast.error(error); onBack(); return; }
        setQuestions(qs || []);
        setLoading(false);
      })
      .catch(() => { toast.error('Could not load questions'); onBack(); });
  }, [level, token, onBack]);

  useEffect(() => {
    if (loading || questions.length === 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          submitTest(answers);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading, questions.length]);

  const selectOption = (option) => {
    if (answered.current || submitting) return;
    answered.current = true;
    setSelected(option);

    const newAnswers = { ...answers, [questions[current].id]: option };
    setAnswers(newAnswers);

    setTimeout(() => {
      if (current + 1 < questions.length) {
        setCurrent((c) => c + 1);
        setSelected(null);
        answered.current = false;
      } else {
        submitTest(newAnswers);
      }
    }, 600);
  };

  const skipQuestion = () => {
    if (answered.current || submitting) return;
    answered.current = true;
    const newAnswers = { ...answers, [questions[current].id]: '' };
    setAnswers(newAnswers);
    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1);
      setSelected(null);
      answered.current = false;
    } else {
      submitTest(newAnswers);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading Level {level} test…</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-slate-400">No questions available for this level yet.</p>
        <button onClick={onBack} className="mt-4 text-blue-600 text-sm hover:underline">← Back to levels</button>
      </div>
    );
  }

  const q = questions[current];
  const progress = ((current) / questions.length) * 100;
  const timerPct = (timeLeft / TOTAL_TIME) * 100;
  const timerColor = timeLeft < 120 ? 'text-red-600' : timeLeft < 300 ? 'text-amber-500' : 'text-slate-600';
  const options = q.options || [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => { if (window.confirm('Exit test? Your answers will be lost.')) onBack(); }}
          className="text-slate-400 hover:text-slate-600 text-sm transition"
        >
          ✕ Exit
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 font-medium">
            {current + 1} / {questions.length}
          </span>
          <span className={`text-sm font-bold tabular-nums ${timerColor}`}>
            ⏱ {pad(Math.floor(timeLeft / 60))}:{pad(timeLeft % 60)}
          </span>
        </div>
        <span className={`text-xs font-bold text-white px-3 py-1 rounded-full ${LEVEL_COLORS[level]}`}>
          Level {level}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
        <div
          className={`h-full rounded-full transition-all duration-300 ${LEVEL_COLORS[level]}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Timer ring warning */}
      {timeLeft < 120 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 mb-4 text-sm text-red-700 font-medium text-center">
          ⚠️ Less than 2 minutes remaining!
        </div>
      )}

      {/* Question card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-3">
          Question {current + 1}
        </p>
        <p className="text-lg font-bold text-slate-800 leading-relaxed">{q.question_text}</p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {options.map((opt, i) => {
          const isSelected = selected === opt;
          return (
            <button
              key={i}
              onClick={() => selectOption(opt)}
              disabled={!!selected || submitting}
              className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition-all
                ${isSelected
                  ? 'border-blue-600 bg-blue-600 text-white scale-[1.01] shadow-md'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 active:scale-[0.99]'}
                disabled:cursor-not-allowed`}
            >
              <span className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-extrabold mr-3
                ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {/* Skip */}
      <div className="mt-5 text-center">
        <button
          onClick={skipQuestion}
          disabled={!!selected || submitting}
          className="text-slate-400 hover:text-slate-600 text-sm transition disabled:opacity-0"
        >
          Skip this question →
        </button>
      </div>

      {/* Submit all button (last question) */}
      {current === questions.length - 1 && !selected && !submitting && (
        <div className="mt-4 text-center">
          <button
            onClick={() => submitTest(answers)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl transition"
          >
            Submit Test
          </button>
        </div>
      )}

      {submitting && (
        <div className="mt-6 text-center text-slate-400">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Scoring your test…
        </div>
      )}
    </div>
  );
};

export default StudentTestQuiz;
