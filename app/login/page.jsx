'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Loader2, LogIn } from 'lucide-react';
import { useI18n } from '../../lib/i18n';

export default function ClientLogin() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/account/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || t('login.failed')); setLoading(false); return; }
      router.push('/dashboard');
    } catch { setError(t('login.neterr')); setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-mesh flex flex-col">
      <header className="glass border-b border-white/50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
            <ArrowLeft size={16} />
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-ruby-800" />
              <span className="font-display font-bold text-sm">Indian Waste<span className="text-ruby-800">Portal</span></span>
            </div>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md glass-frosted rounded-2xl p-8">
          <div className="w-12 h-12 rounded-xl bg-ruby-50 flex items-center justify-center mb-4">
            <LogIn size={22} className="text-ruby-800" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-800">{t('login.title')}</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">{t('login.sub')}</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('login.email')}</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="username"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-ruby-400 focus:border-ruby-400 outline-none" placeholder="you@company.in" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('login.password')}</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-ruby-400 focus:border-ruby-400 outline-none" placeholder="••••••••" />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="btn-ruby w-full py-2.5 rounded-lg font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={16} className="animate-spin" /> {t('login.submitting')}</> : t('login.submit')}
            </button>
          </form>

          <div className="flex justify-between text-xs text-slate-400 mt-6">
            <Link href="/register" className="text-ruby-800 underline">{t('login.register')}</Link>
            <Link href="/forgot" className="hover:text-slate-600">{t('login.forgot')}</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
