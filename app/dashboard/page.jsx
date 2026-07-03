'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Plus, LogOut, ExternalLink, CreditCard, FileCheck2, Clock, MailWarning, CheckCircle2 } from 'lucide-react';

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
    if (npw.length < 8) { setPwMsg('New password must be at least 8 characters'); return; }
    if (npw !== cpw) { setPwMsg('New passwords do not match'); return; }
    setPwBusy(true);
    try {
      const res = await fetch('/api/account/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: cur, newPassword: npw }),
      });
      const d = await res.json();
      setPwMsg(res.ok ? '✓ Password changed. Other devices were signed out.' : (d.error || 'Failed'));
      if (res.ok) { setCur(''); setNpw(''); setCpw(''); }
    } catch { setPwMsg('Network error'); } finally { setPwBusy(false); }
  }
  async function logoutAll() {
    if (!confirm('Sign out of all devices, including this one?')) return;
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
      <header className="sticky top-0 z-20 glass border-b border-white/50">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-ruby-800" />
            <span className="font-display font-bold text-sm">Indian Waste<span className="text-ruby-800">Portal</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">{data?.user?.email}</span>
            <button onClick={logout} className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-white flex items-center gap-1.5 text-slate-600">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        {justVerified && (
          <p className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <CheckCircle2 size={16} /> Your email is verified. Thanks!
          </p>
        )}
        {data && data.user && !data.user.email_verified && !justVerified && (
          <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2"><MailWarning size={16} /> Please verify your email ({data.user.email}) to secure your account.</span>
            <button onClick={resendVerify} disabled={resent} className="text-xs font-semibold text-amber-900 underline disabled:opacity-60 shrink-0">
              {resent ? 'Sent ✓' : 'Resend link'}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-800">Your registrations</h1>
            <p className="text-sm text-slate-500">Track status, pay invoices and view your history.</p>
          </div>
          <Link href="/register" className="btn-ruby px-4 py-2.5 rounded-xl text-sm inline-flex items-center gap-2">
            <Plus size={16} /> New registration
          </Link>
        </div>

        {/* Registrations */}
        {!data ? (
          <p className="text-slate-400 py-10 text-center">Loading…</p>
        ) : data.registrations.length === 0 ? (
          <div className="glass-card hairline rounded-2xl p-10 text-center">
            <p className="text-slate-600 font-medium">No registrations yet.</p>
            <Link href="/register" className="btn-ruby mt-4 inline-flex px-5 py-2.5 rounded-xl text-sm">Start your first registration</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.registrations.map(r => (
              <div key={r.id} className="glass-card hairline rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-ruby-800 bg-ruby-50 rounded-full px-2 py-0.5">{svcLabel(r.service_type)}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${chip(r.status)}`}>{r.status}</span>
                  </div>
                  <p className="font-semibold text-slate-800 mt-1.5">{r.org_name}</p>
                  <p className="text-xs text-slate-400">Registered {fmt(r.created_at)}{r.ack_number ? ` · ACK ${r.ack_number}` : ''}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/status/${r.payment_token}`} className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-white inline-flex items-center gap-1.5">
                    <Clock size={13} /> Track
                  </Link>
                  {r.status === 'AwaitingPayment' && (
                    <Link href={`/portal?token=${r.payment_token}&bwg=1`} className="text-xs px-3 py-1.5 rounded-lg bg-ruby-700 text-white hover:bg-ruby-800 inline-flex items-center gap-1.5">
                      <CreditCard size={13} /> Pay {r.balance_amount_paise ? inr(r.balance_amount_paise) : ''}
                    </Link>
                  )}
                  {r.ack_number && (
                    <a href="https://swm.cpcb.gov.in" target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 inline-flex items-center gap-1.5">
                      <FileCheck2 size={13} /> ACK <ExternalLink size={11} />
                    </a>
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
              {showSettings ? '▾' : '▸'} Account settings
            </button>
            {showSettings && (
              <div className="glass-card hairline rounded-2xl p-5 mt-3 max-w-lg">
                <form onSubmit={changePassword} className="space-y-3">
                  <p className="font-semibold text-slate-800 text-sm">Change password</p>
                  <input type="password" value={cur} onChange={e => setCur(e.target.value)} placeholder="Current password" autoComplete="current-password"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" required />
                  <input type="password" value={npw} onChange={e => setNpw(e.target.value)} placeholder="New password (min 8)" autoComplete="new-password"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" required />
                  <input type="password" value={cpw} onChange={e => setCpw(e.target.value)} placeholder="Confirm new password" autoComplete="new-password"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" required />
                  {pwMsg && <p className={`text-xs ${pwMsg.startsWith('✓') ? 'text-emerald-700' : 'text-red-600'}`}>{pwMsg}</p>}
                  <button type="submit" disabled={pwBusy} className="btn-ruby px-4 py-2 rounded-lg text-sm disabled:opacity-50">Update password</button>
                </form>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button onClick={logoutAll} className="text-sm text-red-600 hover:underline">Log out of all devices</button>
                  <p className="text-[11px] text-slate-400 mt-1">Signs out every device where you’re logged in, including this one.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invoices */}
        {data?.invoices?.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-lg font-bold text-slate-800 mb-3">Invoices &amp; payments</h2>
            <div className="glass-card hairline rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Facility</th>
                    <th className="text-left font-medium px-4 py-3">Amount</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                    <th className="text-left font-medium px-4 py-3">Date</th>
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
