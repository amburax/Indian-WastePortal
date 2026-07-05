'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Plus, LogOut, ExternalLink, CreditCard, FileCheck2, Clock, MailWarning, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import LanguageSwitcher from '../../components/LanguageSwitcher';

const STATUS_STYLES = {
  New: 'bg-slate-100 text-slate-700', UnderReview: 'bg-blue-100 text-blue-800',
  Scheduled: 'bg-indigo-100 text-indigo-800', AwaitingPayment: 'bg-amber-100 text-amber-800',
  Paid: 'bg-emerald-100 text-emerald-800', Queued: 'bg-indigo-100 text-indigo-800',
  'In Progress': 'bg-cyan-100 text-cyan-800', NeedsAttention: 'bg-red-100 text-red-800',
  Completed: 'bg-green-100 text-green-800', Failed: 'bg-red-100 text-red-800',
};
const chip = (s) => STATUS_STYLES[s] || 'bg-gray-100 text-gray-700';
const fmt  = (d) => d ? new Date(d.includes('T') ? d : d.replace(' ', 'T') + 'Z').toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—';
const inr  = (p) => `₹${((p || 0) / 100).toLocaleString('en-IN')}`;
const svcLabel = (s) => ({ solid_waste: 'Solid Waste', ewaste: 'E-Waste' }[s] || 'Registration');

export default function Dashboard() {
  const router = useRouter();
  const { t } = useI18n();
  // Service + status labels, localised (fall back to the raw value if unmapped).
  const svc = (s) => t('dash.svc.' + (s === 'ewaste' ? 'ewaste' : s === 'solid_waste' ? 'solid' : 'reg'));
  const stLabel = (s) => { const k = 'dash.st.' + String(s || '').replace(/\s+/g, ''); const v = t(k); return v === k ? s : v; };
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const justVerified = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('verified') === '1';

  async function resendVerify() {
    setResent(true);
    try { await fetch('/api/account/resend-verify', { method: 'POST' }); } catch {}
  }

  // account settings
  const [showSettings, setShowSettings] = useState(false);
  const [cur, setCur] = useState(''); const [npw, setNpw] = useState(''); const [cpw, setCpw] = useState('');
  const [pwMsg, setPwMsg] = useState(''); const [pwBusy, setPwBusy] = useState(false);
  async function changePassword(e) {
    e.preventDefault(); setPwMsg('');
    if (npw.length < 8) { setPwMsg(t('dash.pwMin')); return; }
    if (npw !== cpw) { setPwMsg(t('dash.pwMismatch')); return; }
    setPwBusy(true);
    try {
      const res = await fetch('/api/account/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: cur, newPassword: npw }),
      });
      const d = await res.json();
      setPwMsg(res.ok ? t('dash.pwChanged') : (d.error || t('dash.failed')));
      if (res.ok) { setCur(''); setNpw(''); setCpw(''); }
    } catch { setPwMsg(t('dash.network')); } finally { setPwBusy(false); }
  }
  async function logoutAll() {
    if (!confirm(t('dash.confirmLogoutAll'))) return;
    await fetch('/api/account/logout-all', { method: 'POST' });
    router.push('/login');
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/account/me', { cache: 'no-store' });
      if (res.status === 401) { router.push('/login'); return; }
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Failed'); return; }
      setData(d);
    } catch { setError('Network error'); }
  }, [router]);
  useEffect(() => { load(); }, [load]);

  async function logout() { await fetch('/api/account/logout', { method: 'POST' }); router.push('/'); }

  return (
    <div className="min-h-screen bg-mesh-light">
      <header className="sticky top-0 z-40 bg-[#0e3b2e]/95 backdrop-blur-md shadow-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <span className="font-display text-xl font-bold text-white tracking-tight">Indian Waste<span className="text-[#c8a24b]">Portal</span></span>
          </Link>
          {/* Nav */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-white/90">
            <Link href="/#whats-new"    className="hover:text-white transition-colors">{t('pg.nav.swm')}</Link>
            <Link href="/#services"     className="hover:text-white transition-colors">{t('nav.services')}</Link>
            <Link href="/#how-it-works" className="hover:text-white transition-colors">{t('nav.how')}</Link>
            <Link href="/#pricing"      className="hover:text-white transition-colors">{t('nav.pricing')}</Link>
          </nav>
          {/* Account */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher dark className="hidden sm:inline-flex" />
            <span className="text-xs text-white/70 hidden lg:inline">{data?.user?.email}</span>
            <button onClick={logout} className="text-sm font-semibold px-4 py-2 rounded-xl border border-white/25 text-white hover:bg-white/10 transition-colors flex items-center gap-1.5">
              <LogOut size={14} /> {t('dash.logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        {justVerified && (
          <p className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <CheckCircle2 size={16} /> {t('dash.verified')}
          </p>
        )}
        {data && data.user && !data.user.email_verified && !justVerified && (
          <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2"><MailWarning size={16} /> {t('dash.verifyPrompt', { email: data.user.email })}</span>
            <button onClick={resendVerify} disabled={resent} className="text-xs font-semibold text-amber-900 underline disabled:opacity-60 shrink-0">
              {resent ? t('dash.sent') : t('dash.resend')}
            </button>
          </div>
        )}

        {data && data.registrations.some(r => r.status === 'Completed' || r.ack_number) && (
          <div className="mb-8 p-5 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldCheck size={120} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <ShieldCheck size={20} className="text-emerald-400" />
                  {t('dash.compliance')}
                </h2>
                <p className="text-emerald-100 text-sm mt-1">{t('dash.complianceSub')}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20">
                <p className="text-xs text-emerald-200 uppercase tracking-wide font-medium">{t('dash.nextDeadline')}</p>
                <p className="text-sm font-bold mt-0.5 flex items-center gap-1.5"><Clock size={14} className="text-emerald-300" /> {t('dash.deadlineVal')}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-800">{t('dash.title')}</h1>
            <p className="text-sm text-slate-500">{t('dash.subtitle')}</p>
          </div>
          <Link href="/register" className="btn-ruby px-4 py-2.5 rounded-xl text-sm inline-flex items-center gap-2 shadow-sm">
            <Plus size={16} /> {t('dash.newReg')}
          </Link>
        </div>

        {/* Registrations */}
        {!data ? (
          <p className="text-slate-400 py-10 text-center">{t('dash.loading')}</p>
        ) : data.registrations.length === 0 ? (
          <div className="glass-card hairline rounded-2xl p-10 text-center">
            <p className="text-slate-600 font-medium">{t('dash.noReg')}</p>
            <Link href="/register" className="btn-ruby mt-4 inline-flex px-5 py-2.5 rounded-xl text-sm">{t('dash.startFirst')}</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.registrations.map(r => (
              <div key={r.id} className="glass-card hairline rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-ruby-800 bg-ruby-50 rounded-full px-2 py-0.5">{svc(r.service_type)}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${chip(r.status)}`}>{stLabel(r.status)}</span>
                  </div>
                  <p className="font-semibold text-slate-800 mt-1.5">{r.org_name}</p>
                  <p className="text-xs text-slate-400">{t('dash.registered', { date: fmt(r.created_at) })}{r.ack_number ? ` · ${t('dash.ack')} ${r.ack_number}` : ''}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/status/${r.payment_token}`} className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-white inline-flex items-center gap-1.5">
                    <Clock size={13} /> {t('dash.track')}
                  </Link>
                  {r.status === 'AwaitingPayment' && (
                    <Link href={`/portal?token=${r.payment_token}&bwg=1`} className="text-xs px-3 py-1.5 rounded-lg bg-ruby-700 text-white hover:bg-ruby-800 inline-flex items-center gap-1.5">
                      <CreditCard size={13} /> {t('dash.pay')} {r.balance_amount_paise ? inr(r.balance_amount_paise) : ''}
                    </Link>
                  )}
                  {r.ack_number && (
                    <a href="https://swm.cpcb.gov.in" target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 inline-flex items-center gap-1.5">
                      {t('dash.cpcb')} <ExternalLink size={11} />
                    </a>
                  )}
                  {(r.status === 'Completed' || r.ack_number) && (
                    <Link href={`/certificate/${r.payment_token}`} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1.5 font-medium shadow-sm border border-emerald-500">
                      <FileCheck2 size={13} /> {t('dash.viewCert')}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Account settings */}
        {data && (
          <div className="mt-10">
            <button onClick={() => setShowSettings(v => !v)} className="text-sm font-semibold text-slate-500 hover:text-ruby-800">
              {showSettings ? '▾' : '▸'} {t('dash.settings')}
            </button>
            {showSettings && (
              <div className="glass-card hairline rounded-2xl p-5 mt-3 max-w-lg">
                <form onSubmit={changePassword} className="space-y-3">
                  <p className="font-semibold text-slate-800 text-sm">{t('dash.changePw')}</p>
                  <input type="password" value={cur} onChange={e => setCur(e.target.value)} placeholder={t('dash.curPw')} autoComplete="current-password"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" required />
                  <input type="password" value={npw} onChange={e => setNpw(e.target.value)} placeholder={t('dash.newPw')} autoComplete="new-password"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" required />
                  <input type="password" value={cpw} onChange={e => setCpw(e.target.value)} placeholder={t('dash.confirmPw')} autoComplete="new-password"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" required />
                  {pwMsg && <p className={`text-xs ${pwMsg.startsWith('✓') ? 'text-emerald-700' : 'text-red-600'}`}>{pwMsg}</p>}
                  <button type="submit" disabled={pwBusy} className="btn-ruby px-4 py-2 rounded-lg text-sm disabled:opacity-50">{t('dash.updatePw')}</button>
                </form>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button onClick={logoutAll} className="text-sm text-red-600 hover:underline">{t('dash.logoutAll')}</button>
                  <p className="text-[11px] text-slate-400 mt-1">{t('dash.logoutAllSub')}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invoices */}
        {data?.invoices?.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-lg font-bold text-slate-800 mb-3">{t('dash.invoices')}</h2>
            <div className="glass-card hairline rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">{t('dash.tblFacility')}</th>
                    <th className="text-left font-medium px-4 py-3">{t('dash.tblAmount')}</th>
                    <th className="text-left font-medium px-4 py-3">{t('dash.tblStatus')}</th>
                    <th className="text-left font-medium px-4 py-3">{t('dash.tblDate')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.invoices.map(p => (
                    <tr key={p.id}>
                      <td className="px-4 py-2.5 text-slate-700">{p.org_name}</td>
                      <td className="px-4 py-2.5 text-slate-800 font-medium">{inr(p.amount_paise)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{p.status}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{fmt(p.paid_at || p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
