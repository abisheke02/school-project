import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';
import { schoolAPI } from '../../services/api';
import useAuthStore from '../../services/authStore';
import { trackUpgradeModalViewed, trackUpgradeInitiated, trackClassCreated, trackUpgradeCompleted } from '../../services/analytics';

const PLAN_LABELS = { free: 'Free', basic: 'Basic', pro: 'Pro' };

const SubscriptionBanner = ({ sub, onUpgrade }) => {
  if (!sub) return null;
  const { planType, studentCount, maxStudents, usagePct, isExpired } = sub;

  const isAtLimit = studentCount >= maxStudents;
  const isNearLimit = usagePct >= 80 && !isAtLimit;

  if (!isAtLimit && !isNearLimit && !isExpired) return null;

  const barColor = isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-400' : 'bg-slate-300';
  const bgColor = isAtLimit || isExpired ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
  const textColor = isAtLimit || isExpired ? 'text-red-800' : 'text-amber-800';
  const subTextColor = isAtLimit || isExpired ? 'text-red-600' : 'text-amber-600';

  const message = isExpired
    ? 'Your subscription has expired. Students cannot log in until you renew.'
    : isAtLimit
    ? `You've reached the ${maxStudents}-student limit on the ${PLAN_LABELS[planType]} plan. Upgrade to add more students.`
    : `You're at ${usagePct}% of your ${maxStudents}-student limit. Upgrade soon to avoid disruption.`;

  return (
    <div className={`rounded-2xl border px-5 py-4 mb-6 ${bgColor}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className={`font-bold text-sm ${textColor}`}>
            {isExpired ? '⚠️ Subscription Expired' : isAtLimit ? '🚫 Student Limit Reached' : '⚡ Approaching Limit'}
          </p>
          <p className={`text-xs mt-0.5 ${subTextColor}`}>{message}</p>

          {/* Usage bar */}
          <div className="mt-3">
            <div className="h-2 bg-white/60 rounded-full overflow-hidden w-56">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${usagePct}%` }} />
            </div>
            <p className={`text-xs mt-1 font-semibold ${subTextColor}`}>
              {studentCount} / {maxStudents} students used
            </p>
          </div>
        </div>

        <button
          onClick={onUpgrade}
          className={`shrink-0 text-sm font-bold px-4 py-2 rounded-xl transition
            ${isAtLimit || isExpired
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
        >
          Upgrade Plan →
        </button>
      </div>
    </div>
  );
};

const UpgradeModal = ({ sub, onClose, schoolId }) => {
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [studentCount, setStudentCount] = useState(sub?.maxStudents || 10);
  const [loading, setLoading] = useState(false);

  const PLANS = {
    basic: { label: 'Basic', price: 99, max: 30, features: ['Up to 30 students', 'Full practice modules', 'LD detection reports'] },
    pro: { label: 'Pro', price: 299, max: 200, features: ['Up to 200 students', 'Priority support', 'Advanced analytics', 'Parent portal'] },
  };

  const plan = PLANS[selectedPlan];
  const total = plan.price * studentCount;

  const handleCheckout = async () => {
    trackUpgradeInitiated(selectedPlan, studentCount, total);
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const resp = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ schoolId, planType: selectedPlan, studentCount }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Could not create order');

      if (window.Razorpay) {
        const rzp = new window.Razorpay({
          key: data.keyId,
          amount: data.amount,
          currency: 'INR',
          name: 'LD Support Platform',
          description: `${plan.label} Plan — ${studentCount} students`,
          order_id: data.orderId,
          handler: async (response) => {
            await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                dbOrderId: data.dbOrderId,
              }),
            });
            trackUpgradeCompleted(selectedPlan);
            toast.success('Subscription upgraded! Refreshing…');
            setTimeout(() => window.location.reload(), 1500);
          },
          prefill: {},
          theme: { color: '#1D4ED8' },
        });
        rzp.open();
      } else {
        toast('Razorpay not loaded. Check your network.', { icon: '⚠️' });
      }
    } catch (err) {
      toast.error(err.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-800 text-lg">Upgrade Your Plan</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Plan picker */}
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(PLANS).map(([key, p]) => (
              <button
                key={key}
                onClick={() => { setSelectedPlan(key); setStudentCount(Math.min(studentCount, p.max)); }}
                className={`rounded-2xl border-2 p-4 text-left transition
                  ${selectedPlan === key ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-200'}`}
              >
                <p className="font-extrabold text-slate-800">{p.label}</p>
                <p className="text-blue-700 font-bold text-sm">₹{p.price}/student/yr</p>
                <ul className="mt-2 space-y-0.5">
                  {p.features.map((f) => (
                    <li key={f} className="text-xs text-slate-500">✓ {f}</li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          {/* Student count */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Number of students (max {plan.max})
            </label>
            <input
              type="number" min={1} max={plan.max} value={studentCount}
              onChange={(e) => setStudentCount(Math.min(plan.max, Math.max(1, Number(e.target.value))))}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-lg font-bold text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Total */}
          <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-blue-700">Total (1 year)</span>
            <span className="text-2xl font-extrabold text-blue-800">₹{total.toLocaleString('en-IN')}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-extrabold py-4 rounded-xl text-lg shadow-lg shadow-blue-200 transition disabled:opacity-60"
          >
            {loading ? 'Preparing Checkout…' : 'Pay with Razorpay →'}
          </button>
          <p className="text-xs text-center text-slate-400">Secure payment via Razorpay · UPI / Cards / Net Banking</p>
        </div>
      </div>
    </div>
  );
};


const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [creating, setCreating] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

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

  const loadSubscription = async () => {
    try {
      const data = await schoolAPI.getSubscription();
      setSubscription(data);
    } catch {
      // non-critical — silently ignore
    }
  };

  useEffect(() => { loadClasses(); loadSubscription(); }, []);

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
      trackClassCreated();
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
        <SubscriptionBanner sub={subscription} onUpgrade={() => { trackUpgradeModalViewed(subscription?.planType, 'banner'); setShowUpgrade(true); }} />

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

      {showUpgrade && (
        <UpgradeModal
          sub={subscription}
          schoolId={user?.school_id || user?.schoolId}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </Layout>
  );
};

export default DashboardPage;
