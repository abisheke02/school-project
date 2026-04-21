import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';
import { schoolAPI } from '../../services/api';
import useAuthStore from '../../services/authStore';

const LD_COLORS = {
  dyslexia: 'bg-purple-100 text-purple-700',
  dysgraphia: 'bg-orange-100 text-orange-700',
  dyscalculia: 'bg-green-100 text-green-700',
  mixed: 'bg-red-100 text-red-700',
  not_detected: 'bg-slate-100 text-slate-500',
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadClasses = async () => {
    try {
      const { classes: data } = await schoolAPI.getMyClasses();
      setClasses(data);
    } catch {
      toast.error('Could not load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClasses(); }, []);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setCreating(true);
    try {
      const result = await schoolAPI.createClass({
        className: newClassName.trim(),
        schoolId: user?.school_id || user?.schoolId,
      });
      // Optimistically add to local state (works in demo/mock mode too)
      const newClass = result?.class || result;
      setClasses((prev) => [
        { ...newClass, student_count: newClass.student_count ?? 0 },
        ...prev,
      ]);
      toast.success('Class created!');
      setShowCreateModal(false);
      setNewClassName('');
    } catch (err) {
      toast.error(err?.error || 'Could not create class');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout>
      <div className="p-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800">
              Welcome, {user?.name || 'Teacher'} 👋
            </h2>
            <p className="text-slate-500 mt-1">Manage your classes and track student progress</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-5 py-2.5 rounded-xl transition"
          >
            + New Class
          </button>
        </div>

        {/* Classes grid */}
        {loading ? (
          <div className="text-slate-400 text-center py-16">Loading classes…</div>
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-blue-100 p-12 text-center">
            <p className="text-4xl mb-4">🏫</p>
            <h3 className="text-xl font-bold text-slate-700 mb-2">No classes yet</h3>
            <p className="text-slate-400 mb-6">
              Create your first class and share the join code with students.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl"
            >
              Create Class
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes.map((cls) => (
              <div
                key={cls.id}
                onClick={() => navigate(`/classes/${cls.id}`)}
                className="bg-white rounded-2xl border border-slate-100 p-6 cursor-pointer hover:shadow-md hover:border-blue-200 transition group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-700 transition">
                      {cls.class_name}
                    </h3>
                    <p className="text-slate-400 text-sm mt-0.5">
                      {cls.student_count} student{cls.student_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="text-slate-300 group-hover:text-blue-400 transition text-xl">→</span>
                </div>

                {/* Join code badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Join code:</span>
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg tracking-widest text-sm">
                    {cls.join_code}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create class modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-5">Create New Class</h3>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Class name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Class 4A — 2025"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-xl transition disabled:bg-blue-300"
                >
                  {creating ? 'Creating…' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default DashboardPage;
