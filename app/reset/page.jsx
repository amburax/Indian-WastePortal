'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Loader2, KeyRound } from 'lucide-react';

function ResetContent() {
  const router = useRouter();
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault(); setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/account/reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Reset failed'); setLoading(false); return; }
      router.push('/dashboard');
    } catch { setError('Network error'); setLoading(false); }
  }

  return (
    <div className="w-full max-w-md glass-frosted rounded-2xl p-8">
      <div className="w-12 h-12 rounded-xl bg-ruby-50 flex items-center justify-center mb-4">
        <KeyRound size={22} className="text-ruby-800" />
      </div>
      <h1 className="font-display text-2xl font-bold text-slate-800">Set a new password</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">Choose a new password for your account.</p>

      {!token ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">Missing reset token. Please use the link from your email, or <Link href="/forgot" className="underline">request a new one</Link>.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="New password (min 6)" autoComplete="new-password"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-ruby-400 outline-none" />
          <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" autoComplete="new-password"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-ruby-400 outline-none" />
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="btn-ruby w-full py-2.5 rounded-lg font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Save new password'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPage() {
  return (
    <div className="min-h-screen bg-mesh flex flex-col">
      <header className="glass border-b border-white/50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center">
          <Link href="/login" className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
            <ArrowLeft size={16} />
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-ruby-800" />
              <span className="font-display font-bold text-sm">Indian Waste<span className="text-ruby-800">Portal</span></span>
            </div>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense fallback={<Loader2 size={24} className="animate-spin text-ruby-800" />}>
          <ResetContent />
        </Suspense>
      </main>
    </div>
  );
}
