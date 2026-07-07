'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import SiteNavbar from '../../components/SiteNavbar';
import { useI18n } from '../../lib/i18n';

export default function FindRegistration() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState('');

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setDone('');
    try {
      const res = await fetch('/api/find-registration', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const d = await res.json();
      setDone(d.message || t('find.done'));
    } catch {
      setDone(t('find.done'));
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-mesh flex flex-col">
      <SiteNavbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md glass-frosted rounded-2xl p-8">
          <div className="w-12 h-12 rounded-xl bg-ruby-50 flex items-center justify-center mb-4">
            <Mail size={22} className="text-ruby-800" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-800">{t('find.h')}</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">{t('find.sub')}</p>

          {done ? (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800">{done}</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder={t('auth.emailPh')} autoComplete="email"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ruby-400 focus:border-ruby-400 outline-none" />
              <button type="submit" disabled={loading} className="btn-ruby w-full py-2.5 rounded-lg font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={16} className="animate-spin" /> {t('find.sending')}</> : t('find.send')}
              </button>
            </form>
          )}

          <p className="text-xs text-slate-400 mt-6">
            {t('find.new')} <Link href="/register" className="text-ruby-800 underline">{t('find.startReg')}</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
