import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';
import { adminAPI } from '../../services/api';

const LD_COLORS = {
  dyslexia: '#8B5CF6',
  dysgraphia: '#F97316',
  dyscalculia: '#22C55E',
  mixed: '#EF4444',
  not_detected: '#94A3B8',
};

const PLAN_BADGE = {
  free: 'bg-slate-100 text-slate-600',
  pro: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('en-IN'));

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggerLoading, setTriggerLoading] = useState('');

  useEffect(() => {
    adminAPI.getOverview()
      .then(setOverview)
      .catch(() => toast.error('Could not load admin overview'))
      .finally(() => setLoading(false));
  }, []);

  const triggerCron = async (job) => {
    setTriggerLoading(job);
    try {
      await adminAPI.triggerCron(job);
      toast.success(`${job} triggered`);
    } catch {
      toast.error('Could not trigger job (check server logs)');
    } finally {
      setTriggerLoading('');
    }
  };

  const ldData = (overview?.ldDistribution || []).map((r) => ({
    name: r.ld_type?.replace('_', ' ') || 'Unknown',
    value: Number(r.count),
    fill: LD_COLORS[r.ld_type] || '#94A3B8',
  }));

  const schoolData = (overview?.schools || []).map((s) => ({
    name: s.name?.length > 14 ? s.name.slice(0, 13) + '…' : s.name,
    students: Number(s.total_students),
    max: Number(s.max_students),
  }));

  const improve = overview?.platformImprovement;

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto space-y-10">
        {/* Simple & Bold Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-8 border-b border-[var(--border-main)]">
          <div>
            <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight leading-tight">Admin Console</h2>
            <p className="text-[var(--text-muted)] font-medium text-sm mt-1">Platform management and institutional intelligence</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-[var(--text-main)] text-[var(--bg-main)] rounded-2xl text-xs font-bold hover:opacity-90 transition-all shadow-xl shadow-black/5 active:scale-95"
            >
              ← Switch View
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-48 text-[var(--text-muted)]">
             <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
             <span className="text-xs font-bold uppercase tracking-widest">Hydrating Dashboard…</span>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              {[
                { label: 'Registered institutions', value: fmt(overview?.schools?.length), icon: '🏛️', color: 'bg-blue-600' },
                { label: 'Total active learners', value: fmt(overview?.schools?.reduce((s, r) => s + Number(r.total_students), 0)), icon: '🎓', color: 'bg-indigo-600' },
                { label: 'Avg platform accuracy', value: improve?.this_week_avg ? `${improve.this_week_avg}%` : '—', icon: '📈', color: 'bg-emerald-600' },
                { label: 'Weekly Performance', value: (improve?.this_week_avg && improve?.last_week_avg) ? `${improve.this_week_avg > improve.last_week_avg ? '+' : ''}${(improve.this_week_avg - improve.last_week_avg).toFixed(1)}%` : '—', icon: '🚀', color: improve?.this_week_avg >= improve?.last_week_avg ? 'bg-emerald-600' : 'bg-rose-500' },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-[var(--bg-card)] rounded-[2.5rem] p-8 border border-[var(--border-main)] shadow-sm hover:shadow-2xl hover:border-blue-500/30 transition-all group overflow-hidden relative">
                  <div className={`w-14 h-14 ${kpi.color} rounded-2xl flex items-center justify-center text-2xl mb-8 shadow-xl shadow-black/10 relative z-10`}>
                    {kpi.icon}
                  </div>
                  <p className="text-4xl font-black text-[var(--text-main)] tracking-tighter relative z-10">{kpi.value}</p>
                  <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.2em] mt-2 relative z-10">{kpi.label}</p>
                  <div className={`absolute -right-8 -bottom-8 w-32 h-32 ${kpi.color} opacity-[0.03] rounded-full group-hover:scale-110 transition-transform`} />
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
              <div className="bg-[var(--bg-card)] rounded-[3rem] p-10 border border-[var(--border-main)] shadow-sm">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-xl font-black text-[var(--text-main)] tracking-tight">Classification Variance</h3>
                  <span className="px-4 py-1.5 bg-[var(--bg-main)] text-[var(--text-muted)] text-[10px] font-black uppercase rounded-full border border-[var(--border-main)]">Real-time Data</span>
                </div>
                {ldData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie data={ldData} cx="50%" cy="50%" innerRadius={90} outerRadius={125} paddingAngle={8} dataKey="value" stroke="none">
                        {ldData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border-main)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)' }}
                        itemStyle={{ color: 'var(--text-main)', fontSize: '12px', fontWeight: 700 }}
                      />
                      <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '30px', fontSize: '11px', fontWeight: 800, color: 'var(--text-main)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="py-24 text-center">
                    <p className="text-[var(--text-muted)] font-black uppercase tracking-[0.2em] text-xs">Awaiting diagnostic ingestion</p>
                  </div>
                )}
              </div>

              <div className="bg-[var(--bg-card)] rounded-[3rem] p-10 border border-[var(--border-main)] shadow-sm">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-xl font-black text-[var(--text-main)] tracking-tight">Active Enrollment</h3>
                  <span className="px-4 py-1.5 bg-[var(--bg-main)] text-[var(--text-muted)] text-[10px] font-black uppercase rounded-full border border-[var(--border-main)]">Live Census</span>
                </div>
                {schoolData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={schoolData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-main)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 800, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fontWeight: 800, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'var(--bg-main)' }}
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border-main)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)' }}
                      />
                      <Bar dataKey="students" fill="var(--accent)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="py-24 text-center">
                    <p className="text-[var(--text-muted)] font-black uppercase tracking-[0.2em] text-xs">Waiting for unit configuration</p>
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="bg-[var(--bg-card)] rounded-[3rem] border border-[var(--border-main)] shadow-sm overflow-hidden mb-12">
               <div className="px-10 py-8 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-main)] opacity-90">
                  <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tighter">Global Subscriptions</h3>
                  <div className="flex items-center gap-3 bg-[var(--bg-card)] px-4 py-2 rounded-2xl border border-[var(--border-main)] shadow-sm">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/20" />
                    <span className="text-[11px] font-black text-[var(--text-muted)] tracking-widest uppercase">Sync: Active</span>
                  </div>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm">
                   <thead className="bg-[var(--bg-main)] text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] border-b border-[var(--border-main)]">
                     <tr>{['Institution', 'Licensing', 'Enrollment', 'Capacity', 'Access Expiry'].map(h => <th key={h} className="px-10 py-6 text-left">{h}</th>)}</tr>
                   </thead>
                   <tbody className="divide-y divide-[var(--border-main)]">
                     {(overview?.schools || []).map((school) => {
                       const expired = school.subscription_expires_at && new Date(school.subscription_expires_at) < new Date();
                       return (
                         <tr key={school.id} className="hover:bg-[var(--bg-main)] transition-colors group">
                           <td className="px-10 py-7 font-black text-[var(--text-main)] group-hover:text-blue-500 transition-colors">{school.name}</td>
                           <td className="px-10 py-7">
                             <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${PLAN_BADGE[school.plan_type] || PLAN_BADGE.free}`}>
                               {school.plan_type || 'free'}
                             </span>
                           </td>
                           <td className="px-10 py-7 font-black text-[var(--text-muted)]">{fmt(school.total_students)}</td>
                           <td className="px-10 py-7 font-bold text-[var(--text-muted)] opacity-50">{fmt(school.max_students)}</td>
                           <td className={`px-10 py-7 font-black text-xs ${expired ? 'text-rose-500' : 'text-[var(--text-muted)]'}`}>
                             {school.subscription_expires_at ? new Date(school.subscription_expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Lifetime'}
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
            </div>

            {/* Diagnostics */}
            <div className="bg-[var(--bg-main)] rounded-[3rem] p-12 border border-[var(--border-main)] border-dashed">
               <div className="mb-10">
                 <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight">System Worker Diagnostics</h3>
                 <p className="text-[var(--text-muted)] font-bold text-sm mt-1">Algorithmic worker manual synchronization triggers</p>
               </div>
               <div className="flex flex-wrap gap-5">
                 {[
                   { job: 'error-patterns', icon: '🧠' },
                   { job: 'student-recs', icon: '👥' },
                   { job: 'teacher-recs', icon: '👨‍🏫' },
                   { job: 'parent-sms', icon: '📱' },
                   { job: 'question-variants', icon: '🧩' },
                 ].map(({ job, icon }) => (
                   <button
                     key={job}
                     onClick={() => triggerCron(job)}
                     disabled={!!triggerLoading}
                     className="group flex items-center gap-4 bg-[var(--bg-card)] border border-[var(--border-main)] px-8 py-4 rounded-3xl text-xs font-black text-[var(--text-muted)] uppercase tracking-widest hover:border-blue-500 hover:text-blue-500 transition-all shadow-xl shadow-black/5 active:scale-95 disabled:opacity-50"
                   >
                     <span className="text-xl group-hover:rotate-12 group-hover:scale-125 transition-transform">{icon}</span>
                     {triggerLoading === job ? 'Executing…' : job.replace('-', ' ')}
                   </button>
                 ))}
               </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default AdminDashboard;
