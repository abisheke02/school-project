import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';
import { adminAPI } from '../../services/api';
import { trackCMSAction } from '../../services/analytics';

const EXERCISE_TYPES = ['phonics', 'reading', 'writing', 'math', 'speaking'];
const LD_TARGETS = ['dyslexia', 'dysgraphia', 'dyscalculia', 'mixed'];
const CATEGORIES = ['phonics', 'reading', 'writing', 'math'];
const LEVELS = [1, 2, 3, 4, 5];

const Badge = ({ children, color = 'bg-slate-100 text-slate-600' }) => (
  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{children}</span>
);

const TYPE_COLORS = {
  phonics: 'bg-purple-100 text-purple-700',
  reading: 'bg-blue-100 text-blue-700',
  writing: 'bg-orange-100 text-orange-700',
  math: 'bg-green-100 text-green-700',
  speaking: 'bg-teal-100 text-teal-700',
};

// ─── Question Form ─────────────────────────────────────────────────────────────
const QuestionForm = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = useState(initial || {
    level: 1, questionType: 'mcq', category: 'phonics',
    questionText: '', options: ['', '', '', ''], correctAnswer: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setOpt = (i, v) => {
    const opts = [...form.options];
    opts[i] = v;
    setForm((f) => ({ ...f, options: opts }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const nonEmpty = form.options.filter((o) => o.trim());
    if (nonEmpty.length < 2) { toast.error('At least 2 options required'); return; }
    if (!form.correctAnswer.trim()) { toast.error('Correct answer required'); return; }
    if (!nonEmpty.includes(form.correctAnswer.trim())) {
      toast.error('Correct answer must match one of the options');
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, options: nonEmpty, correctAnswer: form.correctAnswer.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Level</label>
          <select value={form.level} onChange={(e) => set('level', Number(e.target.value))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {LEVELS.map((l) => <option key={l} value={l}>Level {l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm capitalize">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Type</label>
          <select value={form.questionType} onChange={(e) => set('questionType', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {['mcq', 'speaking', 'fill_blank'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1">Question Text</label>
        <textarea
          value={form.questionText} onChange={(e) => set('questionText', e.target.value)}
          rows={3} required minLength={5}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
          placeholder="Enter the question…"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1">Options</label>
        <div className="grid grid-cols-2 gap-2">
          {form.options.map((opt, i) => (
            <input key={i} value={opt} onChange={(e) => setOpt(i, e.target.value)}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          ))}
        </div>
        <button type="button" onClick={() => setForm((f) => ({ ...f, options: [...f.options, ''] }))}
          className="mt-1 text-xs text-blue-600 hover:underline">
          + Add option
        </button>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1">Correct Answer (must match an option exactly)</label>
        <input value={form.correctAnswer} onChange={(e) => set('correctAnswer', e.target.value)}
          required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          placeholder="e.g. Option A text" />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60">
          {saving ? 'Saving…' : initial ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};

// ─── Exercise Form ─────────────────────────────────────────────────────────────
const ExerciseForm = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = useState(initial || {
    exerciseType: 'phonics', ldTarget: 'dyslexia', level: 1,
    title: '', instruction: '', content: '{}',
  });
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validateJson = (v) => {
    try { JSON.parse(v); setJsonError(''); } catch { setJsonError('Invalid JSON'); }
  };

  const submit = async (e) => {
    e.preventDefault();
    let content;
    try { content = JSON.parse(form.content); } catch { toast.error('Fix JSON errors'); return; }
    setSaving(true);
    try {
      await onSave({ ...form, level: Number(form.level), content });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Exercise Type</label>
          <select value={form.exerciseType} onChange={(e) => set('exerciseType', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm capitalize">
            {EXERCISE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">LD Target</label>
          <select value={form.ldTarget} onChange={(e) => set('ldTarget', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm capitalize">
            {LD_TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Level</label>
          <select value={form.level} onChange={(e) => set('level', Number(e.target.value))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {LEVELS.map((l) => <option key={l} value={l}>Level {l}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1">Title</label>
        <input value={form.title} onChange={(e) => set('title', e.target.value)}
          required minLength={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          placeholder="Exercise title" />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1">Instruction</label>
        <input value={form.instruction} onChange={(e) => set('instruction', e.target.value)}
          required minLength={5} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          placeholder="Instruction shown to student" />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1">
          Content (JSON)
          {jsonError && <span className="ml-2 text-red-500 font-normal">{jsonError}</span>}
        </label>
        <textarea
          value={form.content}
          onChange={(e) => { set('content', e.target.value); validateJson(e.target.value); }}
          rows={8}
          className={`w-full border rounded-lg px-3 py-2 text-xs font-mono resize-y ${jsonError ? 'border-red-400' : 'border-slate-200'}`}
          placeholder={'{\n  "type": "letter_tap",\n  "items": []\n}'}
        />
        <p className="text-xs text-slate-400 mt-1">
          Types: letter_tap, word_blend, fill_blank, word_choice, word_builder, count_tap, word_problem, dictation, read_aloud
        </p>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={saving || !!jsonError}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60">
          {saving ? 'Saving…' : initial ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};

// ─── Modal wrapper ─────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-800">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

// ─── Main CMS page ─────────────────────────────────────────────────────────────
const AdminCMS = () => {
  const [tab, setTab] = useState('questions'); // 'questions' | 'exercises'
  const [questions, setQuestions] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [qTotal, setQTotal] = useState(0);
  const [eTotal, setETotal] = useState(0);
  const [qFilter, setQFilter] = useState({ level: '', page: 1 });
  const [eFilter, setEFilter] = useState({ type: '', page: 1 });
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // null | { type: 'create-q' | 'edit-q' | 'create-e' | 'edit-e', data? }

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const { questions: qs, total } = await adminAPI.getQuestions({
        level: qFilter.level || undefined,
        page: qFilter.page,
        limit: 20,
      });
      setQuestions(qs || []);
      setQTotal(total || 0);
    } catch {
      toast.error('Could not load questions');
    } finally {
      setLoading(false);
    }
  }, [qFilter]);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    try {
      const { exercises: exs, total } = await adminAPI.getExercises({
        type: eFilter.type || undefined,
        page: eFilter.page,
        limit: 20,
      });
      setExercises(exs || []);
      setETotal(total || 0);
    } catch {
      toast.error('Could not load exercises');
    } finally {
      setLoading(false);
    }
  }, [eFilter]);

  useEffect(() => { if (tab === 'questions') loadQuestions(); }, [tab, loadQuestions]);
  useEffect(() => { if (tab === 'exercises') loadExercises(); }, [tab, loadExercises]);

  const deleteQuestion = async (id) => {
    if (!window.confirm('Delete this question? This cannot be undone.')) return;
    try {
      await adminAPI.deleteQuestion(id);
      toast.success('Question deleted');
      loadQuestions();
    } catch { toast.error('Delete failed'); }
  };

  const deleteExercise = async (id) => {
    if (!window.confirm('Delete this exercise? This cannot be undone.')) return;
    try {
      await adminAPI.deleteExercise(id);
      toast.success('Exercise deleted');
      loadExercises();
    } catch { toast.error('Delete failed'); }
  };

  const saveQuestion = async (data) => {
    try {
      if (modal?.data?.id) {
        await adminAPI.updateQuestion(modal.data.id, data);
        trackCMSAction('update', 'question');
        toast.success('Question updated');
      } else {
        await adminAPI.createQuestion(data);
        trackCMSAction('create', 'question');
        toast.success('Question created');
      }
      setModal(null);
      loadQuestions();
    } catch (err) {
      toast.error(err?.error || 'Save failed');
    }
  };

  const saveExercise = async (data) => {
    try {
      if (modal?.data?.id) {
        await adminAPI.updateExercise(modal.data.id, data);
        trackCMSAction('update', 'exercise');
        toast.success('Exercise updated');
      } else {
        await adminAPI.createExercise(data);
        trackCMSAction('create', 'exercise');
        toast.success('Exercise created');
      }
      setModal(null);
      loadExercises();
    } catch (err) {
      toast.error(err?.error || 'Save failed');
    }
  };

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-800">Content Management</h2>
          <p className="text-slate-500 text-sm mt-1">Manage test questions and practice exercises</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
          {[['questions', 'Test Questions'], ['exercises', 'Practice Exercises']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition
                ${tab === key ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Questions tab */}
        {tab === 'questions' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-3 items-center">
                <select value={qFilter.level} onChange={(e) => setQFilter({ level: e.target.value, page: 1 })}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
                  <option value="">All Levels</option>
                  {LEVELS.map((l) => <option key={l} value={l}>Level {l}</option>)}
                </select>
                <span className="text-xs text-slate-400">{qTotal} total</span>
              </div>
              <button onClick={() => setModal({ type: 'create-q' })}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-xl">
                + New Question
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Question</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase w-20">Level</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase w-24">Category</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase w-28">Correct Ans.</th>
                      <th className="w-20 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {questions.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-medium text-slate-700 max-w-xs truncate">{q.question_text}</td>
                        <td className="px-4 py-3"><Badge>L{q.level}</Badge></td>
                        <td className="px-4 py-3"><Badge color={TYPE_COLORS[q.category]}>{q.category}</Badge></td>
                        <td className="px-4 py-3 text-slate-500 truncate max-w-[7rem]">{q.correct_answer}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setModal({ type: 'edit-q', data: {
                              ...q,
                              questionText: q.question_text,
                              questionType: q.question_type,
                              correctAnswer: q.correct_answer,
                              options: Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]'),
                            }})} className="text-blue-600 hover:underline text-xs font-semibold">Edit</button>
                            <button onClick={() => deleteQuestion(q.id)} className="text-red-500 hover:underline text-xs font-semibold">Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!questions.length && (
                      <tr><td colSpan={5} className="text-center py-12 text-slate-400">No questions yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {qTotal > 20 && (
              <div className="flex justify-center gap-3 mt-4">
                <button disabled={qFilter.page <= 1} onClick={() => setQFilter((f) => ({ ...f, page: f.page - 1 }))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40">← Prev</button>
                <span className="text-sm text-slate-500 self-center">Page {qFilter.page}</span>
                <button disabled={qFilter.page * 20 >= qTotal} onClick={() => setQFilter((f) => ({ ...f, page: f.page + 1 }))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40">Next →</button>
              </div>
            )}
          </div>
        )}

        {/* Exercises tab */}
        {tab === 'exercises' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-3 items-center">
                <select value={eFilter.type} onChange={(e) => setEFilter({ type: e.target.value, page: 1 })}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm capitalize">
                  <option value="">All Types</option>
                  {EXERCISE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <span className="text-xs text-slate-400">{eTotal} total</span>
              </div>
              <button onClick={() => setModal({ type: 'create-e' })}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-xl">
                + New Exercise
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Title</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase w-24">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase w-24">LD Target</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase w-16">Level</th>
                      <th className="w-20 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {exercises.map((ex) => (
                      <tr key={ex.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-medium text-slate-700">
                          <div>{ex.title}</div>
                          <div className="text-xs text-slate-400 truncate max-w-xs">{ex.instruction}</div>
                        </td>
                        <td className="px-4 py-3"><Badge color={TYPE_COLORS[ex.exercise_type]}>{ex.exercise_type}</Badge></td>
                        <td className="px-4 py-3 text-slate-500 text-xs capitalize">{ex.ld_target?.replace('_', ' ')}</td>
                        <td className="px-4 py-3"><Badge>L{ex.level}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setModal({ type: 'edit-e', data: {
                              ...ex,
                              exerciseType: ex.exercise_type,
                              ldTarget: ex.ld_target,
                              content: typeof ex.content === 'string' ? ex.content : JSON.stringify(ex.content, null, 2),
                            }})} className="text-blue-600 hover:underline text-xs font-semibold">Edit</button>
                            <button onClick={() => deleteExercise(ex.id)} className="text-red-500 hover:underline text-xs font-semibold">Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!exercises.length && (
                      <tr><td colSpan={5} className="text-center py-12 text-slate-400">No exercises yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {eTotal > 20 && (
              <div className="flex justify-center gap-3 mt-4">
                <button disabled={eFilter.page <= 1} onClick={() => setEFilter((f) => ({ ...f, page: f.page - 1 }))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40">← Prev</button>
                <span className="text-sm text-slate-500 self-center">Page {eFilter.page}</span>
                <button disabled={eFilter.page * 20 >= eTotal} onClick={() => setEFilter((f) => ({ ...f, page: f.page + 1 }))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40">Next →</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {(modal?.type === 'create-q' || modal?.type === 'edit-q') && (
        <Modal title={modal.type === 'edit-q' ? 'Edit Question' : 'New Question'} onClose={() => setModal(null)}>
          <QuestionForm initial={modal.data} onSave={saveQuestion} onCancel={() => setModal(null)} />
        </Modal>
      )}

      {(modal?.type === 'create-e' || modal?.type === 'edit-e') && (
        <Modal title={modal.type === 'edit-e' ? 'Edit Exercise' : 'New Exercise'} onClose={() => setModal(null)}>
          <ExerciseForm initial={modal.data} onSave={saveExercise} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </Layout>
  );
};

export default AdminCMS;
