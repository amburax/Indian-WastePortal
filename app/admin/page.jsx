'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── status → colour mapping ──────────────────────────────────
const STATUS_STYLES = {
  New:            'bg-slate-100 text-slate-700 border-slate-200',
  Submitted:      'bg-slate-100 text-slate-700 border-slate-200',
  UnderReview:    'bg-amber-100 text-amber-800 border-amber-200',
  Scheduled:      'bg-blue-100 text-blue-800 border-blue-200',
  AwaitingPayment:'bg-amber-100 text-amber-800 border-amber-200',
  Paid:           'bg-emerald-100 text-emerald-800 border-emerald-200',
  Queued:         'bg-indigo-100 text-indigo-800 border-indigo-200',
  'In Progress':  'bg-cyan-100 text-cyan-800 border-cyan-200',
  Filing:         'bg-cyan-100 text-cyan-800 border-cyan-200',
  AwaitingOTP:    'bg-orange-100 text-orange-800 border-orange-200',
  Verifying:      'bg-violet-100 text-violet-800 border-violet-200',
  Completed:      'bg-green-100 text-green-800 border-green-200',
  NeedsAttention: 'bg-red-100 text-red-800 border-red-200',
  Failed:         'bg-red-100 text-red-800 border-red-200',
  Rejected:       'bg-red-100 text-red-800 border-red-200',
  Cancelled:      'bg-gray-100 text-gray-600 border-gray-200',
};
const chip = (s) => STATUS_STYLES[s] || 'bg-gray-100 text-gray-700 border-gray-200';
const fmt  = (d) => d ? new Date(d.includes('Z') || d.includes('T') ? d : d.replace(' ', 'T') + 'Z').toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const inr  = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN')}`;
const LIMIT = 25;
// Manual filing is the default. Set NEXT_PUBLIC_ENABLE_AUTO_FILING=true only when
// the Playwright worker is running and you want the automated "Start Filing" path.
const AUTO_FILING = process.env.NEXT_PUBLIC_ENABLE_AUTO_FILING === 'true';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats]     = useState(null);
  const [data, setData]       = useState(null);
  const [error, setError]     = useState('');
  const [filter, setFilter]   = useState('All');
  const [query, setQuery]     = useState('');
  const [dq, setDq]           = useState('');
  const [page, setPage]       = useState(0);
  const [exportState, setExportState] = useState('All');
  const [selId, setSelId]     = useState(null);
  const [detail, setDetail]   = useState(null);
  const [detailLoading, setDL] = useState(false);
  const [acting, setActing]   = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [callAt, setCallAt]     = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [showInvoice, setShowInvoice] = useState(false);
  const [invAmt, setInvAmt]     = useState('');
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [editForm, setEditForm] = useState(null);
  const [rules, setRules]       = useState([]);
  const [showAck, setShowAck]   = useState(false);
  const [ackNum, setAckNum]     = useState('');
  const [ackStatus, setAckStatus] = useState('Pending Verification at ULB');

  // While waiting for the client's OTP, refresh the open detail so it appears live.
  useEffect(() => {
    const o = detail?.org;
    if (!o || !o.otp_requested_at || o.status === 'Completed') return;
    const received = o.manual_otp && o.manual_otp_at >= o.otp_requested_at;
    if (received) return;
    const id = setInterval(() => { if (selId) openDetail(selId); }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.org?.otp_requested_at, detail?.org?.manual_otp, detail?.org?.manual_otp_at, detail?.org?.status, selId]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats', { cache: 'no-store' });
      if (res.status === 401) { router.push('/admin/login'); return; }
      const d = await res.json();
      if (res.ok) setStats(d);
    } catch { /* keep last */ }
  }, [router]);

  const loadSubs = useCallback(async () => {
    try {
      const p = new URLSearchParams({ limit: String(LIMIT), offset: String(page * LIMIT) });
      if (filter !== 'All') p.set('status', filter);
      if (dq) p.set('q', dq);
      const res = await fetch(`/api/admin/submissions?${p}`, { cache: 'no-store' });
      if (res.status === 401) { router.push('/admin/login'); return; }
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Failed to load'); return; }
      setData(d); setError('');
    } catch { setError('Network error'); }
  }, [page, filter, dq, router]);

  // debounce search + reset to first page
  useEffect(() => { const t = setTimeout(() => { setDq(query); setPage(0); }, 400); return () => clearTimeout(t); }, [query]);
  useEffect(() => { loadSubs(); }, [loadSubs]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { fetch('/api/admin/pricing', { cache: 'no-store' }).then(r => r.ok ? r.json() : { rules: [] }).then(d => setRules((d.rules || []).filter(x => x.active))).catch(() => {}); }, []);
  useEffect(() => { const t = setInterval(() => { loadStats(); loadSubs(); }, 20000); return () => clearInterval(t); }, [loadStats, loadSubs]);
  // deep-link: /admin?org=<id> opens that drawer
  useEffect(() => {
    const org = new URLSearchParams(window.location.search).get('org');
    if (org) openDetail(org);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openDetail(id) {
    setSelId(id); setDetail(null); setDL(true);
    setShowCall(false); setShowInvoice(false); setShowNote(false);
    try {
      const res = await fetch(`/api/admin/submission/${id}`, { cache: 'no-store' });
      const d = await res.json();
      if (res.ok) setDetail(d);
    } finally { setDL(false); }
  }

  async function runAction(path, body) {
    setActing(true);
    try {
      const res = await fetch(`/api/admin/action/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error || 'Action failed'); return; }
      setShowCall(false); setCallAt(''); setCallNotes(''); setShowNote(false); setNoteText(''); setEditForm(null); setShowAck(false);
      await openDetail(body.orgId);
      await loadSubs(); loadStats();
    } catch { alert('Network error'); }
    finally { setActing(false); }
  }

  async function logout() { await fetch('/api/admin/logout', { method: 'POST' }); router.push('/admin/login'); }

  const rows = data?.submissions || [];
  const total = data?.total ?? 0;
  const statusList = ['All', ...Object.keys(stats?.counts || {})];
  const from = total === 0 ? 0 : page * LIMIT + 1;
  const to   = Math.min((page + 1) * LIMIT, total);

  const KPIS = stats ? [
    { label: 'Submissions',    value: stats.total,                       tone: 'text-slate-800' },
    { label: 'Retainer paid',  value: stats.funnel.retainer_paid,        tone: 'text-emerald-700' },
    { label: 'Balance paid',   value: stats.funnel.balance_paid,         tone: 'text-emerald-700' },
    { label: 'Completed',      value: stats.funnel.completed,            tone: 'text-green-700' },
    { label: 'Needs attention',value: stats.funnel.needs_attention,      tone: 'text-red-600' },
    { label: 'Revenue',        value: inr(stats.revenue.total),          tone: 'text-ruby-800' },
  ] : [];

  return (
    <div className="min-h-screen bg-mesh-light">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-ruby-700 flex items-center justify-center text-white font-bold text-sm">IW</div>
            <div>
              <h1 className="font-bold text-ruby-900 leading-tight">Command Center</h1>
              <p className="text-[11px] text-gray-500">{stats?.admin || '—'} · {total} matching</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <nav className="hidden md:flex items-center gap-1 text-sm mr-1">
              <span className="px-3 py-1.5 rounded-lg bg-ruby-50 text-ruby-800 font-medium">Submissions</span>
              <a href="/admin/calendar" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600">Calendar</a>
              <a href="/admin/pricing" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600">Pricing</a>
              <a href="/admin/notifications" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600">Notifications</a>
              <a href="/admin/audit" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600">Audit</a>
              <a href="/admin/users" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600">Users</a>
            </nav>
            <select value={exportState} onChange={e => setExportState(e.target.value)} className="text-sm px-2 py-1.5 rounded-lg border border-gray-300 bg-white outline-none">
              <option value="All">All States (Export)</option>
              <option value="Andhra Pradesh">Andhra Pradesh</option>
              <option value="Assam">Assam</option>
              <option value="Bihar">Bihar</option>
              <option value="Chhattisgarh">Chhattisgarh</option>
              <option value="Delhi">Delhi</option>
              <option value="Gujarat">Gujarat</option>
              <option value="Haryana">Haryana</option>
              <option value="Jharkhand">Jharkhand</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Kerala">Kerala</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Odisha">Odisha</option>
              <option value="Punjab">Punjab</option>
              <option value="Rajasthan">Rajasthan</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Telangana">Telangana</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="West Bengal">West Bengal</option>
            </select>
            <a href={`/api/admin/export?state=${encodeURIComponent(exportState)}`} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Export
            </a>
            <button onClick={() => { loadStats(); loadSubs(); }} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">Refresh</button>
            <button onClick={logout} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-red-600">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-6">
        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {KPIS.map(k => (
            <div key={k.label} className="glass-card hairline rounded-xl px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">{k.label}</p>
              <p className={`font-display text-2xl font-bold ${k.tone}`}>{k.value}</p>
            </div>
          ))}
          {!stats && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card hairline rounded-xl px-4 py-3 h-[68px] animate-pulse" />
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {statusList.map(s => (
            <button key={s} onClick={() => { setFilter(s); setPage(0); }}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${filter === s ? 'bg-ruby-700 text-white border-ruby-700' : 'bg-white text-gray-600 border-gray-200 hover:border-ruby-300'}`}>
              {s}{s !== 'All' && stats?.counts?.[s] != null ? ` (${stats.counts[s]})` : ''}
            </button>
          ))}
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name / email / phone / ACK…"
            className="ml-auto text-sm px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ruby-400 outline-none w-72 max-w-full" />
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Organisation</th>
                  <th className="text-left font-medium px-4 py-3">Contact</th>
                  <th className="text-left font-medium px-4 py-3">Category</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-left font-medium px-4 py-3">Agent job</th>
                  <th className="text-left font-medium px-4 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!data && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>}
                {data && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No submissions match.</td></tr>}
                {rows.map(r => (
                  <tr key={r.id} onClick={() => openDetail(r.id)} className="hover:bg-ruby-50/40 cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.org_name}</div>
                      {r.ack_number && <div className="text-[11px] text-emerald-700">ACK {r.ack_number}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{r.auth_person}</div>
                      <div className="text-[11px] text-gray-400">{r.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.category || '—'}</td>
                    <td className="px-4 py-3"><span className={`text-[11px] px-2 py-1 rounded-full border ${chip(r.status)}`}>{r.status}</span></td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.job_status ? <span className="text-[11px]">{r.job_status}{r.otp_attempts > 0 ? ` · OTP×${r.otp_attempts}` : ''}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            <span>{total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}</span>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
                className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <button disabled={(page + 1) * LIMIT >= total} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        </div>
      </main>

      {/* Detail drawer */}
      {selId && (
        <div className="fixed inset-0 z-30 flex justify-end" onClick={() => setSelId(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between">
              <h2 className="font-bold text-ruby-900">Submission detail</h2>
              <button onClick={() => setSelId(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>

            {detailLoading && <p className="p-6 text-gray-400">Loading…</p>}
            {detail && (
              <div className="p-5 space-y-5 text-sm">
                {/* ── Actions ── */}
                <div className="rounded-xl border border-ruby-200 bg-ruby-50/50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-ruby-800">Actions</h3>
                    {!detail.org.payment_verified && (
                      <span className="text-[10px] text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">unpaid</span>
                    )}
                  </div>
                  {/* payment posture line */}
                  <div className="flex flex-wrap gap-2 mb-2 text-[11px]">
                    <span className={`px-2 py-0.5 rounded-full border ${detail.org.payment_verified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      Payment {detail.org.payment_verified ? 'received' : 'pending'}{detail.org.balance_amount_paise ? ` · ₹${(detail.org.balance_amount_paise / 100).toLocaleString('en-IN')}` : ''}
                    </span>
                    {detail.org.balance_invoice_url && (
                      <a href={detail.org.balance_invoice_url} target="_blank" rel="noopener noreferrer"
                        className="px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200 underline">invoice link</a>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {['New', 'UnderReview', 'Scheduled'].includes(detail.org.status) && (
                      <button disabled={acting} onClick={() => { setShowCall(v => !v); setShowInvoice(false); setShowNote(false); setEditForm(null); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-ruby-300 bg-white text-ruby-800 hover:bg-ruby-50 disabled:opacity-50">
                        Log Consultant Call
                      </button>
                    )}
                    {['New', 'UnderReview', 'Scheduled'].includes(detail.org.status) && (
                      <button disabled={acting} onClick={() => { setShowInvoice(v => !v); setShowCall(false); setShowNote(false); setEditForm(null); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-blue-300 bg-white text-blue-800 hover:bg-blue-50 disabled:opacity-50">
                        Send Invoice
                      </button>
                    )}
                    {detail.org.status === 'AwaitingPayment' && (
                      <>
                        <button disabled={acting} onClick={() => runAction('mark-paid', { orgId: detail.org.id })}
                          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                          ✓ Mark Balance Paid
                        </button>
                        <button disabled={acting} onClick={() => { setShowInvoice(v => !v); setShowCall(false); setShowNote(false); }}
                          className="text-xs px-3 py-1.5 rounded-lg border border-blue-300 bg-white text-blue-800 hover:bg-blue-50 disabled:opacity-50">
                          Resend Invoice
                        </button>
                      </>
                    )}
                    {/* Automated path — only when the worker is running (opt-in) */}
                    {AUTO_FILING && (detail.org.payment_verified && ['Paid', 'Scheduled'].includes(detail.org.status)) && (
                      <button disabled={acting} onClick={() => runAction('start-filing', { orgId: detail.org.id })}
                        className="text-xs px-3 py-1.5 rounded-lg bg-ruby-700 text-white hover:bg-ruby-800 disabled:opacity-50">
                        ▶ Start Filing (automated)
                      </button>
                    )}
                    {/* Manual path — record the ACK after you file on CPCB yourself */}
                    {detail.org.payment_verified && detail.org.status !== 'Completed' && (
                      <button disabled={acting} onClick={() => { setShowAck(v => !v); setShowInvoice(false); setShowNote(false); setShowCall(false); setEditForm(null); }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50">
                        ✅ Record ACK &amp; Complete
                      </button>
                    )}
                    {/* Ask the client to share the CPCB OTP on their own status page */}
                    {detail.org.payment_verified && detail.org.status !== 'Completed' && (
                      <button disabled={acting} onClick={() => runAction('request-otp', { orgId: detail.org.id })}
                        className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-amber-800 hover:bg-amber-50 disabled:opacity-50">
                        📩 Request OTP from client
                      </button>
                    )}
                    {['NeedsAttention', 'Failed'].includes(detail.org.status) && (
                      <button disabled={acting} onClick={() => runAction('reset-otp', { orgId: detail.org.id })}
                        className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">
                        ↻ Reset &amp; Retry
                      </button>
                    )}
                    <button disabled={acting} onClick={() => { setShowNote(v => !v); setShowCall(false); setShowInvoice(false); setEditForm(null); }}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                      Add Note
                    </button>
                    <button disabled={acting} onClick={() => { setEditForm(f => f ? null : { org_name: detail.org.org_name || '', auth_person: detail.org.auth_person || '', email: detail.org.email || '', phone: detail.org.phone || '', category: detail.org.category || '', sub_category: detail.org.sub_category || '', plan: detail.org.plan || 'standard' }); setShowCall(false); setShowInvoice(false); setShowNote(false); }}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                      Edit details
                    </button>
                    <select disabled={acting} value=""
                      onChange={e => { if (e.target.value) runAction('set-status', { orgId: detail.org.id, status: e.target.value }); }}
                      className="text-xs px-2 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 disabled:opacity-50">
                      <option value="">Set status…</option>
                      {['UnderReview', 'NeedsAttention', 'Rejected', 'Cancelled', 'Completed', 'Paid', 'New'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {showInvoice && (
                    <form onSubmit={e => { e.preventDefault(); runAction('send-invoice', { orgId: detail.org.id, amountRupees: Number(invAmt) }); setInvAmt(''); }}
                      className="mt-3 space-y-2 border-t border-ruby-200 pt-3">
                      <label className="block text-[11px] font-medium text-gray-600">Invoice amount (₹)</label>
                      {rules.length > 0 && (
                        <select defaultValue="" onChange={e => { if (e.target.value) setInvAmt(e.target.value); }}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-300 bg-white">
                          <option value="">Pick from price book…</option>
                          {rules.map(r => (
                            <option key={r.id} value={r.amount_paise / 100}>
                              {r.est_type} · {r.location} — ₹{(r.amount_paise / 100).toLocaleString('en-IN')}
                            </option>
                          ))}
                        </select>
                      )}
                      <input type="number" min="1" value={invAmt} onChange={e => setInvAmt(e.target.value)} placeholder="e.g. 2999"
                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-300" />
                      <button type="submit" disabled={acting || !invAmt}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50">
                        Create &amp; send payment link → AwaitingPayment
                      </button>
                    </form>
                  )}

                  {showCall && (
                    <form onSubmit={e => { e.preventDefault(); runAction('log-call', { orgId: detail.org.id, appointment_at: callAt || null, consultant_notes: callNotes || null }); }}
                      className="mt-3 space-y-2 border-t border-ruby-200 pt-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">Appointment slot</label>
                        <input type="datetime-local" value={callAt} onChange={e => setCallAt(e.target.value)}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-300" />
                      </div>
                      <textarea value={callNotes} onChange={e => setCallNotes(e.target.value)} rows={2}
                        placeholder="Consultant notes (what was discussed, documents pending…)"
                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-300" />
                      <button type="submit" disabled={acting}
                        className="text-xs px-3 py-1.5 rounded-lg bg-ruby-700 text-white hover:bg-ruby-800 disabled:opacity-50">
                        Save → Scheduled
                      </button>
                    </form>
                  )}

                  {showNote && (
                    <form onSubmit={e => { e.preventDefault(); if (noteText.trim()) runAction('add-note', { orgId: detail.org.id, note: noteText }); }}
                      className="mt-3 space-y-2 border-t border-ruby-200 pt-3">
                      <label className="block text-[11px] font-medium text-gray-600">Internal note</label>
                      <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={2}
                        placeholder="Add a timestamped note to this org…"
                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-300" />
                      <button type="submit" disabled={acting || !noteText.trim()}
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-50">
                        Save note
                      </button>
                    </form>
                  )}
                  {editForm && (
                    <form onSubmit={e => { e.preventDefault(); runAction('update-org', { orgId: detail.org.id, fields: editForm }); }}
                      className="mt-3 space-y-2 border-t border-ruby-200 pt-3">
                      <label className="block text-[11px] font-medium text-gray-600">Edit organisation details</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[['org_name', 'Organisation'], ['auth_person', 'Auth person'], ['email', 'Email'], ['phone', 'Phone'], ['category', 'Category'], ['sub_category', 'Sub-category']].map(([k, label]) => (
                          <input key={k} value={editForm[k]} onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))}
                            placeholder={label}
                            className="text-xs px-2 py-1.5 rounded-lg border border-gray-300" />
                        ))}
                        <select value={editForm.plan} onChange={e => setEditForm(f => ({ ...f, plan: e.target.value }))}
                          className="text-xs px-2 py-1.5 rounded-lg border border-gray-300 col-span-2">
                          {['standard', 'professional', 'enterprise'].map(p => <option key={p} value={p}>{p} plan</option>)}
                        </select>
                      </div>
                      <button type="submit" disabled={acting}
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-50">
                        Save changes
                      </button>
                    </form>
                  )}
                  {showAck && (
                    <form onSubmit={e => { e.preventDefault(); runAction('record-ack', { orgId: detail.org.id, ackNumber: ackNum, portalStatus: ackStatus }); setAckNum(''); }}
                      className="mt-3 space-y-2 border-t border-emerald-200 pt-3">
                      <label className="block text-[11px] font-medium text-gray-600">CPCB Acknowledgement number (from the portal)</label>
                      <input value={ackNum} onChange={e => setAckNum(e.target.value)} required placeholder="SWM/BWG-C/MH/2026/0000563"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 font-mono" />
                      <label className="block text-[11px] font-medium text-gray-600">Portal status</label>
                      <input value={ackStatus} onChange={e => setAckStatus(e.target.value)} placeholder="Pending Verification at ULB"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300" />
                      <button type="submit" disabled={acting}
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50">
                        Save ACK &amp; mark Completed
                      </button>
                    </form>
                  )}
                  {acting && <p className="text-[11px] text-gray-400 mt-2">Working…</p>}
                </div>

                {detail.org.otp_requested_at && detail.org.status !== 'Completed' && (
                  <div className="mb-4 p-3 rounded-xl border border-amber-200 bg-amber-50">
                    {detail.org.manual_otp && detail.org.manual_otp_at >= detail.org.otp_requested_at ? (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-amber-900">
                          Client's CPCB OTP: <span className="font-mono font-bold text-base">{detail.org.manual_otp}</span>
                          <span className="text-amber-700"> · shared {fmt(detail.org.manual_otp_at)}</span>
                        </p>
                        <button onClick={() => navigator.clipboard.writeText(detail.org.manual_otp)}
                          className="text-[11px] px-2 py-1 rounded-lg border border-amber-300 bg-white text-amber-800 hover:bg-amber-100">Copy</button>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-800 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Waiting for the client to enter the OTP on their status page… (auto-refreshing)
                      </p>
                    )}
                  </div>
                )}

                <Section title="Organisation">
                  <Row k="Name"      v={detail.org.org_name} />
                  <Row k="Auth person" v={detail.org.auth_person} />
                  <Row k="Email"     v={detail.org.email} />
                  <Row k="Phone"     v={detail.org.phone} />
                  <Row k="Category"  v={`${detail.org.category || '—'}${detail.org.sub_category ? ' · ' + detail.org.sub_category : ''}`} />
                  <Row k="Plan"      v={detail.org.plan} />
                  <Row k="Status"    v={<span className={`text-[11px] px-2 py-0.5 rounded-full border ${chip(detail.org.status)}`}>{detail.org.status}</span>} />
                  {detail.org.assigned_admin && <Row k="Assigned" v={detail.org.assigned_admin} />}
                  {detail.org.ack_number && <Row k="ACK number" v={detail.org.ack_number} />}
                  {detail.org.appointment_at && <Row k="Appointment" v={fmt(detail.org.appointment_at)} />}
                  <Row k="Submitted" v={fmt(detail.org.created_at)} />
                </Section>

                {detail.org.consultant_notes && (
                  <Section title="Notes">
                    <p className="text-xs text-gray-600 whitespace-pre-line bg-gray-50 rounded-lg p-3 border border-gray-100">{detail.org.consultant_notes}</p>
                  </Section>
                )}

                {detail.address && (
                  <Section title="Location">
                    <Row k="State"        v={detail.address.state_name} />
                    <Row k="District"     v={detail.address.district_name} />
                    <Row k="Sub-district" v={detail.address.sub_district} />
                    <Row k="City"         v={detail.address.city_name} />
                    <Row k="Body type"    v={detail.address.local_body_type} />
                    {detail.address.zone_ward && <Row k="Zone/Ward" v={detail.address.zone_ward} />}
                    <Row k="Pincode"      v={detail.address.pincode} />
                    <Row k="Address"      v={detail.address.full_address} />
                    <Row k="Lat, Long"    v={detail.address.latitude != null ? `${detail.address.latitude}, ${detail.address.longitude}` : '—'} />
                  </Section>
                )}

                {detail.metrics && (
                  <Section title="BWG metrics">
                    <Row k="Floor area" v={`${detail.metrics.floor_area_sqm} sq.m`} />
                    <Row k="Waste/day"  v={`${detail.metrics.waste_kg_per_day} kg`} />
                    <Row k="Water/day"  v={`${detail.metrics.water_liters_per_day} L`} />
                    <Row k="Bulk generator" v={detail.metrics.is_bulk_waste_generator ? 'Yes' : 'No'} />
                  </Section>
                )}

                {detail.payment && (
                  <Section title="Payment">
                    <Row k="Status" v={detail.payment.status} />
                    <Row k="Amount" v={detail.payment.amount_paise != null ? `₹${(detail.payment.amount_paise / 100).toFixed(2)}` : '—'} />
                    <Row k="Razorpay ID" v={detail.payment.razorpay_payment_id} />
                    <Row k="Paid at" v={fmt(detail.payment.paid_at)} />
                  </Section>
                )}

                {detail.job && (
                  <Section title="Agent job">
                    <Row k="Status"    v={detail.job.status} />
                    <Row k="Attempts"  v={detail.job.attempt_count} />
                    <Row k="OTP attempts" v={detail.job.otp_attempts} />
                    {detail.job.otp_locked_until && <Row k="OTP locked until" v={fmt(detail.job.otp_locked_until)} />}
                    {detail.job.last_error && <Row k="Last error" v={<span className="text-red-600">{detail.job.last_error}</span>} />}
                  </Section>
                )}

                <Section title={`Agent log (${detail.logs?.length || 0})`}>
                  {(!detail.logs || detail.logs.length === 0) && <p className="text-gray-400">No log entries yet.</p>}
                  <ol className="space-y-2">
                    {detail.logs?.map((l, i) => (
                      <li key={i} className="flex gap-2">
                        <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${l.status === 'error' ? 'bg-red-500' : l.status === 'retry' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <div>
                          <div className="text-gray-800"><span className="font-medium">{l.step}</span> · {l.status}</div>
                          {l.message && <div className="text-[11px] text-gray-500">{l.message}</div>}
                          <div className="text-[10px] text-gray-400">{fmt(l.created_at)}</div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </Section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Row({ k, v }) {
  if (v == null || v === '') return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500 shrink-0">{k}</span>
      <span className="text-gray-900 text-right break-words">{v}</span>
    </div>
  );
}
