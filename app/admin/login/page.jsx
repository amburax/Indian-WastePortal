'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail]   = useState('');
  const [password, setPass] = useState('');
  const [token, setToken]   = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoad]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoad(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, token: token || undefined }),
      });
      const data = await res.json();
      // Password OK but a 2FA code is required (or was wrong).
      if (data.needs2fa) { setNeeds2fa(true); setError(data.error || ''); setLoad(false); return; }
      if (!res.ok) { setError(data.error || 'Login failed'); setLoad(false); return; }
      router.push('/admin');
    } catch {
      setError('Network error'); setLoad(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-mesh-light px-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-8 rounded-2xl shadow-glow-ruby">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-ruby-700 flex items-center justify-center text-white font-bold text-lg">IW</div>
            <div>
              <h1 className="text-lg font-bold text-ruby-900 leading-tight">Command Center</h1>
              <p className="text-xs text-gray-500">Indian Waste Portal · Admin</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ruby-500 focus:border-ruby-500 outline-none"
                placeholder="admin@indianwasteportal.in" autoComplete="username" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password" required value={password} onChange={e => setPass(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ruby-500 focus:border-ruby-500 outline-none"
                placeholder="••••••••" autoComplete="current-password" />
            </div>

            {needs2fa && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Authentication code</label>
                <input
                  inputMode="numeric" autoFocus maxLength={6} value={token}
                  onChange={e => setToken(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 tracking-[0.4em] text-center font-mono text-lg focus:ring-2 focus:ring-ruby-500 focus:border-ruby-500 outline-none"
                  placeholder="000000" autoComplete="one-time-code" />
                <p className="text-xs text-gray-400 mt-1">Enter the 6-digit code from your authenticator app.</p>
              </div>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            <button type="submit" disabled={loading}
              className="btn-ruby w-full py-2.5 rounded-lg font-semibold disabled:opacity-60">
              {loading ? 'Signing in…' : needs2fa ? 'Verify & sign in' : 'Sign in'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">Authorised personnel only · all actions are audited</p>
      </div>
    </div>
  );
}
