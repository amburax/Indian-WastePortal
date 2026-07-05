'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useI18n } from '../../lib/i18n';

export default function ForgotPassword() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState('');

  async function submit(e) {
    e.preventDefault(); setLoading(true); setDone('');
    try {
      const res = await fetch('/api/account/forgot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      });
      const d = await res.json();
      setDone(d.message || t('forgot.done'));
    } catch { setDone(t('forgot.done')); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-mesh flex flex-col">
      <header className="glass border-b border-white/50 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
            <ArrowLeft size={16} />
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-ruby-800" />
              <span className="font-display font-bold text-sm">Indian Waste<span className="text-ruby-800">Portal</span></span>
            </div>
          </Link>
          <LanguageSwitcher className="hidden sm:inline-flex" />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md glass-frosted rounded-2xl p-8">
          <div className="w-12 h-12 rounded-xl bg-ruby-50 flex items-center justify-center mb-4">
            <KeyRound size={22} className="text-ruby-800" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-800">{t('forgot.h')}</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">{t('forgot.sub')}</p>

          {done ? (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800">{done}</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder={t('auth.emailPh')} autoComplete="email"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-ruby-400 outline-none" />
              <button type="submit" disabled={loading} className="btn-ruby w-full py-2.5 rounded-lg font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={16} className="animate-spin" /> {t('forgot.sending')}</> : t('forgot.send')}
              </button>
            </form>
          )}
          <p className="text-xs text-slate-400 mt-6"><Link href="/login" className="text-ruby-800 underline">{t('forgot.back')}</Link></p>
        </div>
      </main>
    </div>
  );
}
