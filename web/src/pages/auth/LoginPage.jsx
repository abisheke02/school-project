import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../services/authStore';
import { supabase } from '../../services/supabase';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, setDemoAuth, demoLogin } = useAuthStore();
  const [portalTab, setPortalTab] = useState('teacher'); // 'teacher' | 'admin'
  const [authMethod, setAuthMethod] = useState('phone'); // 'phone' | 'email'
  const [step, setStep] = useState('input'); // 'input' | 'otp'
  const [identifier, setIdentifier] = useState(''); // phone or email
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword.trim()) {
      toast.error('Enter username and password');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername.trim(), password: adminPassword }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Login failed');
      setDemoAuth(data.user, data.token);
      toast.success('Welcome, Admin!');
      navigate('/admin');
    } catch (err) {
      toast.error(err.message || 'Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    const val = identifier.trim();
    
    if (authMethod === 'phone' && !/^\+91[6-9]\d{9}$/.test(val)) {
      toast.error('Enter a valid Indian mobile number (+91XXXXXXXXXX)');
      return;
    }
    
    if (authMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      toast.error('Enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp(
        authMethod === 'phone' ? { phone: val } : { email: val }
      );
      
      if (error) {
        if (error.message.includes('Unsupported phone provider')) {
          throw new Error('SMS is not configured. Please use "Email Login" instead.');
        }
        throw error;
      }
      
      setStep('otp');
      toast.success('OTP sent!');
    } catch (err) {
      console.error('Supabase OTP Error:', err);
      toast.error(err.message || 'Could not send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length < 6) { toast.error('Enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      const verifyData = authMethod === 'phone' 
        ? { phone: identifier.trim(), token: otp, type: 'sms' }
        : { email: identifier.trim(), token: otp, type: 'email' };

      const { data, error } = await supabase.auth.verifyOtp(verifyData);
      
      if (error) throw error;

      const user = await login(data.session.access_token, 'supabase');
      
      if (!['teacher', 'admin'].includes(user.role)) {
        toast.error('This portal is for teachers only.');
        await supabase.auth.signOut();
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      console.error('Supabase Verify Error:', err);
      toast.error(err.message || 'Wrong OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-blue-800 mb-2">LD Support</h1>
          <p className="text-slate-500 font-medium">School Platform</p>
        </div>

        {/* Portal tab switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setPortalTab('teacher'); setStep('input'); }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${portalTab === 'teacher' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            🏫 Teacher Portal
          </button>
          <button
            type="button"
            onClick={() => setPortalTab('admin')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${portalTab === 'admin' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            🔑 Admin Portal
          </button>
        </div>

        {/* Admin credentials form */}
        {portalTab === 'admin' && (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Username</label>
              <input
                type="text"
                placeholder="admin"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-purple-500 transition-colors"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-purple-500 transition-colors"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-purple-200 transition-all active:scale-[0.98] disabled:bg-purple-300"
            >
              {loading ? 'Signing in…' : 'Sign In as Admin'}
            </button>
          </form>
        )}

        {portalTab === 'teacher' && step === 'input' ? (
          <form onSubmit={handleSendOTP} className="space-y-6">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setAuthMethod('phone'); setIdentifier(''); }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${authMethod === 'phone' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Phone
              </button>
              <button
                type="button"
                onClick={() => { setAuthMethod('email'); setIdentifier(''); }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${authMethod === 'email' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Email
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">
                {authMethod === 'phone' ? 'Mobile Number' : 'Email Address'}
              </label>
              
              {authMethod === 'phone' ? (
                <div className="flex gap-2">
                  <span className="flex items-center px-4 bg-blue-50 border border-blue-200 rounded-xl font-bold text-blue-700">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    maxLength={10}
                    value={identifier.replace('+91', '')}
                    onChange={(e) => setIdentifier('+91' + e.target.value.replace(/\D/g, ''))}
                    className="flex-1 border-2 border-slate-100 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
              ) : (
                <input
                  type="email"
                  placeholder="teacher@school.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:bg-blue-300"
            >
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">Or for testing</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    await demoLogin('teacher');
                    toast.success('Demo Teacher — entering dashboard');
                    navigate('/dashboard');
                  } catch (err) {
                    toast.error(err?.message || 'Demo login failed');
                  } finally { setLoading(false); }
                }}
                disabled={loading}
                className="border-2 border-slate-100 hover:border-blue-200 hover:bg-blue-50 text-blue-700 font-bold py-3 rounded-xl transition-all text-sm"
              >
                🏫 Demo Teacher
              </button>
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    await demoLogin('student');
                    toast.success('Demo Student — entering dashboard');
                    navigate('/student');
                  } catch (err) {
                    toast.error(err?.message || 'Demo login failed');
                  } finally { setLoading(false); }
                }}
                disabled={loading}
                className="border-2 border-slate-100 hover:border-purple-200 hover:bg-purple-50 text-purple-700 font-bold py-3 rounded-xl transition-all text-sm"
              >
                🎒 Demo Student
              </button>
            </div>
            
            {authMethod === 'phone' && (
              <p className="text-center text-xs text-slate-400 mt-4">
                Note: Standard SMS rates may apply. Use Email if SMS fails.
              </p>
            )}
          </form>
        ) : portalTab === 'teacher' ? (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="text-center">
              <p className="text-slate-600 text-sm">OTP sent to</p>
              <p className="font-bold text-slate-800 text-lg">{identifier}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 text-center">
                Enter 6-digit OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full border-2 border-slate-100 rounded-2xl px-4 py-4 text-3xl tracking-[0.5em] font-mono text-center focus:outline-none focus:border-blue-500 transition-colors"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:bg-blue-300"
            >
              {loading ? 'Verifying…' : 'Verify & Login'}
            </button>

            <button
              type="button"
              onClick={() => setStep('input')}
              className="w-full text-blue-600 text-sm font-semibold hover:text-blue-800 transition-colors"
            >
              ← Back to login
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
};

export default LoginPage;
