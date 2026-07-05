'use client';
/**
 * Submissions dashboard — the main admin view, redesigned.
 * Drop this in at app/admin/page.jsx (replaces the existing one).
 *
 * All data, endpoints and actions are UNCHANGED from the original:
 *   GET  /api/admin/stats
 *   GET  /api/admin/submissions?limit&offset&status&q
 *   GET  /api/admin/submission/:id
 *   GET  /api/admin/pricing
 *   POST /api/admin/action/{log-call|send-invoice|mark-paid|start-filing|
 *         record-ack|request-otp|reset-otp|add-note|update-org|set-status|archive}
 *   GET  /api/admin/export?state=
 *   POST /api/admin/logout
 * The chrome (sidebar, sign-out) now lives in app/admin/layout.jsx.
 */
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── status → colour mapping ──────────────────────────────────
const STATUS_META = {
  New:            ['bg-slate-100',  'text-slate-700',   'bg-slate-400',   'border-slate-200'],
  Submitted:      ['bg-slate-100',  'text-slate-700',   'bg-slate-400',   'border-slate-200'],
  UnderReview:    ['bg-amber-100',  'text-amber-800',   'bg-amber-500',   'border-amber-200'],
  Scheduled:      ['bg-blue-100',   'text-blue-800',    'bg-blue-500',    'border-blue-200'],
  AwaitingPayment:['bg-amber-100',  'text-amber-800',   'bg-amber-500',   'border-amber-200'],
  Paid:           ['bg-emerald-100','text-emerald-800', 'bg-emerald-500', 'border-emerald-200'],
  Queued:         ['bg-indigo-100', 'text-indigo-800',  'bg-indigo-500',  'border-indigo-200'],
  'In Progress':  ['bg-cyan-100',   'text-cyan-800',    'bg-cyan-500',    'border-cyan-200'],
  Filing:         ['bg-cyan-100',   'text-cyan-800',    'bg-cyan-500',    'border-cyan-200'],
  AwaitingOTP:    ['bg-orange-100', 'text-orange-800',  'bg-orange-500',  'border-orange-200'],
  Verifying:      ['bg-violet-100', 'text-violet-800',  'bg-violet-500',  'border-violet-200'],
  Completed:      ['bg-green-100',  'text-green-800',   'bg-green-500',   'border-green-200'],
  NeedsAttention: ['bg-red-100',    'text-red-800',     'bg-red-500',     'border-red-200'],
  Failed:         ['bg-red-100',    'text-red-800',     'bg-red-500',     'border-red-200'],
  Rejected:       ['bg-red-100',    'text-red-800',     'bg-red-500',     'border-red-200'],
  Cancelled:      ['bg-gray-100',   'text-gray-600',    'bg-gray-400',    'border-gray-200'],
};
const meta = (s) => STATUS_META[s] || ['bg-gray-100', 'text-gray-700', 'bg-gray-400', 'border-gray-200'];
function Pill({ status }) {
  const [bg, fg, dot, bd] = meta(status);
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${bg} ${fg} ${bd}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{status}
    </span>
  );
}
const fmt  = (d) => d ? new Date(d.includes('Z') || d.includes('T') ? d : d.replace(' ', 'T') + 'Z').toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const inr  = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN')}`;
const initials = (n) => (!n || n === '—') ? '—' : n.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const LIMIT = 25;
// Manual filing is the default. Set NEXT_PUBLIC_ENABLE_AUTO_FILING=true only when
// the Playwright worker is running and you want the automated "Start Filing" path.
const AUTO_FILING = process.env.NEXT_PUBLIC_ENABLE_AUTO_FILING === 'true';

const EXPORT_STATES = ['Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Gujarat','Haryana','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','West Bengal'];

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
  const [tab, setTab]           = useState('Details');   // Details | Actions | History
  const [selected, setSelected] = useState(() => new Set());   // bulk-selected org ids

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
    setSelId(id); setDetail(null); setDL(true); setTab('Details');
    setShowCall(false); setShowInvoice(false); setShowNote(false);
    try {
      const res = await fetch(`/api/admin/submission/${id}`, { cache: 'no-store' });
      const d = await res.json();
      if (res.ok) setDetail(d);
    } finally { setDL(false); }
  }

  // Soft delete — archive/restore then close the drawer and refresh the list.
  async function archiveOrg(orgId, archive) {
    if (archive && !confirm('Archive this submission? It will be hidden from the list — you can restore it any time from the Archived filter.')) return;
    setActing(true);
    try {
      const res = await fetch('/api/admin/action/archive', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orgId, archive }),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error || 'Action failed'); return; }
      setSelId(null);
      await loadSubs(); loadStats();
    } catch { alert('Network error'); }
    finally { setActing(false); }
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

  // ── Bulk selection ──
  const toggleSel = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSel  = () => setSelected(new Set());
  async function bulkArchive() {
    const ids = [...selected];
    if (!ids.length) return;
    const restoring = filter === 'Archived';
    if (!restoring && !confirm(`Archive ${ids.length} submission(s)? They'll be hidden from the list — restorable from the Archived filter.`)) return;
    setActing(true);
    try {
      const res = await fetch('/api/admin/action/archive', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgIds: ids, archive: !restoring }),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error || 'Action failed'); return; }
      clearSel(); await loadSubs(); loadStats();
    } catch { alert('Network error'); }
    finally { setActing(false); }
  }
  function exportSelected() {
    const ids = [...selected];
    if (!ids.length) return;
    window.open(`/api/admin/export?ids=${encodeURIComponent(ids.join(','))}`, '_blank');
  }

  const rows = data?.submissions || [];
  const total = data?.total ?? 0;
  const statusList = ['All', ...Object.keys(stats?.counts || {}), 'Archived'];
  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id));
  const toggleAll = () => setSelected(s => { const n = new Set(s); allSelected ? rows.forEach(r => n.delete(r.id)) : rows.forEach(r => n.add(r.id)); return n; });
  const from = total === 0 ? 0 : page * LIMIT + 1;
  const to   = Math.min((page + 1) * LIMIT, total);

  const KPIS = stats ? [
    { label: 'Submissions',     value: stats.total,                  sub: 'active in pipeline', valueClass: 'text-[#0e3b2e]' },
    { label: 'Retainer paid',   value: stats.funnel.retainer_paid,   sub: `of ${stats.total} orgs`, valueClass: 'text-[#16654a]' },
    { label: 'Balance paid',    value: stats.funnel.balance_paid,    sub: 'ready to file', valueClass: 'text-[#16654a]' },
    { label: 'Completed',       value: stats.funnel.completed,       sub: 'ACK recorded', valueClass: 'text-green-700' },
    { label: 'Needs attention', value: stats.funnel.needs_attention, sub: stats.funnel.needs_attention ? 'action required' : 'all clear', valueClass: stats.funnel.needs_attention ? 'text-red-600' : 'text-slate-400', alert: !!stats.funnel.needs_attention },
    { label: 'Revenue',         value: inr(stats.revenue.total),     sub: 'collected to date', revenue: true },
  ] : [];

  // Pipeline funnel: submitted → retainer paid → balance paid → completed.
  const FUNNEL = stats ? [
    { label: 'Submitted',     value: stats.funnel.total,         color: '#64748b' },
    { label: 'Retainer paid', value: stats.funnel.retainer_paid, color: '#2563eb' },
    { label: 'Balance paid',  value: stats.funnel.balance_paid,  color: '#16654a' },
    { label: 'Completed',     value: stats.funnel.completed,     color: '#15803d' },
  ] : [];
  const funnelTop = FUNNEL[0]?.value || 0;
  const REV = stats ? [
    { label: 'Retainer', v: stats.revenue.retainer },
    { label: 'Balance',  v: stats.revenue.balance },
    { label: 'Full',     v: stats.revenue.full },
  ] : [];

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-4 border-b border-[#dde5e1] bg-[#eef2f0]/85 px-6 py-4 backdrop-blur-md md:px-8">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold tracking-tight text-[#0e3b2e]">Submissions</h1>
          <p className="mt-0.5 text-[12.5px] text-slate-500">{total} matching · auto-refreshes</p>
        </div>
        <div className="relative min-w-[200px] max-w-[360px] flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4-4" /></svg>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, email, phone or ACK…"
            className="w-full rounded-[10px] border border-[#dbe3df] bg-white py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-[#16654a] focus:ring-[3px] focus:ring-[#16654a]/[0.13]" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select value={exportState} onChange={e => setExportState(e.target.value)}
            className="cursor-pointer rounded-[10px] border border-[#dbe3df] bg-white px-3 py-2.5 text-[12.5px] text-slate-700 outline-none">
            <option value="All">All States (Export)</option>
            {EXPORT_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <a href={`/api/admin/export?state=${encodeURIComponent(exportState)}`}
            className="flex items-center gap-1.5 rounded-[10px] border border-[#dbe3df] bg-white px-3.5 py-2.5 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 4v12m0 0l-4-4m4 4l4-4" /></svg>
            Export
          </a>
          <button onClick={() => { loadStats(); loadSubs(); }} title="Refresh"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-[#dbe3df] bg-white text-slate-700 hover:bg-slate-50">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-2.6-6.4M21 3v6h-6" /></svg>
          </button>
        </div>
      </header>

      <main className="px-6 pb-16 pt-6 md:px-8">
        {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {/* KPI strip */}
        <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(158px,1fr))] gap-3.5">
          {!stats && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-[15px] border border-[#e2e9e5] bg-white" />
          ))}
          {KPIS.map(k => (
            <div key={k.label}
              className={`rounded-[15px] border p-[15px_17px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${k.revenue ? 'border-transparent bg-gradient-to-br from-[#1f8a60] to-[#0e3b2e] text-white' : k.alert ? 'border-red-200 bg-red-50/50' : 'border-[#e2e9e5] bg-white'}`}>
              <p className={`text-[10.5px] font-bold uppercase tracking-[0.09em] ${k.revenue ? 'text-white/70' : 'text-[#8a9a92]'}`}>{k.label}</p>
              <p className={`mt-2 font-display text-[27px] font-extrabold leading-none tracking-tight ${k.revenue ? 'text-white' : k.valueClass}`}>{k.value}</p>
              <p className={`mt-1.5 text-[11px] font-medium ${k.revenue ? 'text-white/65' : 'text-slate-400'}`}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Pipeline funnel + revenue breakdown */}
        {stats && (
          <div className="mb-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-[15px] border border-[#e2e9e5] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-2">
              <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#8a9a92]">Pipeline funnel</p>
              <div className="space-y-2.5">
                {FUNNEL.map((s, i) => {
                  const pct = funnelTop ? Math.round((s.value / funnelTop) * 100) : 0;
                  return (
                    <div key={s.label} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-[12.5px] font-medium text-slate-600">{s.label}</span>
                      <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-[#f1f5f3]">
                        <div className="flex h-full items-center rounded-md pl-2 text-[11px] font-bold text-white transition-all duration-500"
                          style={{ width: `${Math.max(pct, s.value > 0 ? 8 : 0)}%`, background: s.color }}>
                          {s.value > 0 && s.value}
                        </div>
                      </div>
                      <span className="w-16 shrink-0 text-right text-[12px] font-semibold text-slate-500">{i === 0 ? '100%' : `${pct}%`}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-slate-400">Conversion is shown as a share of all submitted registrations.</p>
            </div>
            <div className="rounded-[15px] border border-[#e2e9e5] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#8a9a92]">Revenue breakdown</p>
              <p className="font-display text-[26px] font-extrabold leading-none tracking-tight text-[#0e3b2e]">{inr(stats.revenue.total)}</p>
              <p className="mb-3 text-[11px] text-slate-400">total collected</p>
              <div className="space-y-1.5">
                {REV.map(r => (
                  <div key={r.label} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-slate-500">{r.label}</span>
                    <span className="font-semibold text-slate-700">{inr(r.v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {statusList.map(s => (
            <button key={s} onClick={() => { setFilter(s); setPage(0); }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition ${filter === s ? 'border-[#16654a] bg-[#16654a] text-white' : 'border-[#dbe3df] bg-white text-slate-600 hover:border-[#46a67c]'}`}>
              {s}{s !== 'All' && s !== 'Archived' && stats?.counts?.[s] != null ? <span className="opacity-70">{stats.counts[s]}</span> : ''}
            </button>
          ))}
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[12px] border border-[#16654a]/25 bg-[#eaf4ef] px-4 py-2.5 text-[13px]">
            <span className="font-semibold text-[#0e3b2e]">{selected.size} selected</span>
            <span className="mx-1 text-slate-300">·</span>
            <button onClick={bulkArchive} disabled={acting}
              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
              {filter === 'Archived' ? '♻ Restore selected' : '🗄 Archive selected'}
            </button>
            <button onClick={exportSelected}
              className="rounded-lg border border-[#16654a] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#16654a] hover:bg-[#16654a]/5">
              ⬇ Export selected (.xlsx)
            </button>
            <button onClick={clearSel} className="ml-auto text-[12.5px] font-medium text-slate-500 hover:text-slate-700">Clear</button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-[16px] border border-[#e2e9e5] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="border-b border-[#e8eeeb] bg-[#f7faf8] text-left text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#8a9a92]">
                  <th className="w-10 px-4 py-3.5">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll}
                      className="h-3.5 w-3.5 cursor-pointer accent-[#16654a] align-middle" title="Select all on this page" />
                  </th>
                  <th className="px-5 py-3.5 font-bold">Organisation</th>
                  <th className="px-5 py-3.5 font-bold">Contact</th>
                  <th className="px-5 py-3.5 font-bold">Category</th>
                  <th className="px-5 py-3.5 font-bold">Status</th>
                  <th className="px-5 py-3.5 font-bold">Agent job</th>
                  <th className="px-5 py-3.5 text-right font-bold">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {!data && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Loading…</td></tr>}
                {data && rows.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No submissions match your filters.</td></tr>}
                {rows.map(r => (
                  <tr key={r.id} onClick={() => openDetail(r.id)} className={`cursor-pointer border-b border-[#f0f4f2] transition hover:bg-[#f4f8f6] ${selected.has(r.id) ? 'bg-[#eaf4ef]' : ''}`}>
                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)}
                        className="h-3.5 w-3.5 cursor-pointer accent-[#16654a] align-middle" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px] bg-[#e7f1ec] text-xs font-bold text-[#16654a]">{initials(r.org_name)}</div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">{r.org_name}</div>
                          {r.ack_number && <div className="font-display text-[11px] font-semibold text-[#0f8a5b]">ACK {r.ack_number}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="whitespace-nowrap font-medium text-slate-700">{r.auth_person || '—'}</div>
                      <div className="whitespace-nowrap text-[11.5px] text-slate-400">{r.phone}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{r.category || '—'}</td>
                    <td className="px-5 py-4"><Pill status={r.status} /></td>
                    <td className="px-5 py-4 text-[12px] text-slate-500">
                      {r.job_status ? `${r.job_status}${r.otp_attempts > 0 ? ` · OTP×${r.otp_attempts}` : ''}` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-[12px] text-slate-400">{fmt(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-[#eef3f0] px-5 py-3.5 text-[12px] text-slate-500">
            <span>{total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}</span>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
                className="rounded-[9px] border border-[#dbe3df] bg-white px-3.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">Prev</button>
              <button disabled={(page + 1) * LIMIT >= total} onClick={() => setPage(p => p + 1)}
                className="rounded-[9px] border border-[#dbe3df] bg-white px-3.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>
      </main>

      {/* Detail drawer */}
      {selId && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setSelId(null)}>
          <div className="absolute inset-0 bg-[#0a1914]/40 backdrop-blur-[2px]" />
          <div className="relative h-full w-full max-w-[680px] animate-[slideUp_0.28s_cubic-bezier(0.16,1,0.3,1)] overflow-y-auto bg-[#f4f7f5] shadow-[-20px_0_60px_rgba(0,0,0,0.22)]" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-[5] border-b border-[#e6ece9] bg-white px-6 pt-[18px]">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#e7f1ec] text-[15px] font-bold text-[#16654a]">{initials(detail?.org?.org_name)}</div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-lg font-bold tracking-tight text-[#0e3b2e]">{detail?.org?.org_name || 'Submission detail'}</h2>
                  {detail?.org && <p className="mt-0.5 truncate text-[12px] text-slate-400">{detail.org.email} · {detail.org.phone}</p>}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {detail?.org && <Pill status={detail.org.status} />}
                  {detail?.org?.archived ? <span className="rounded-full bg-gray-200 px-2.5 py-1 text-[10.5px] font-semibold text-gray-600">archived</span> : null}
                  <button onClick={() => setSelId(null)} className="h-[30px] w-[30px] rounded-lg bg-[#f1f5f3] text-lg leading-none text-slate-500 hover:text-slate-700">×</button>
                </div>
              </div>
              <div className="mt-4 flex gap-1">
                {['Details', 'Actions', 'History'].map(tb => (
                  <button key={tb} onClick={() => setTab(tb)}
                    className={`-mb-px border-b-2 px-3.5 py-2.5 text-[12.5px] font-semibold transition-colors ${tab === tb ? 'border-[#16654a] text-[#0e3b2e]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                    {tb}{tb === 'History' ? ` (${detail?.logs?.length || 0})` : ''}
                  </button>
                ))}
              </div>
            </div>

            {detailLoading && <p className="p-6 text-slate-400">Loading…</p>}
            {detail && (
              <div className="space-y-3.5 p-6 text-sm">
                {/* ══ ACTIONS TAB ══ */}
                {tab === 'Actions' && (<>
                {detail.org.otp_requested_at && detail.org.status !== 'Completed' && (
                  <div className="rounded-[14px] border border-[#fcd9a6] bg-[#fff8ec] p-3.5">
                    {detail.org.manual_otp && detail.org.manual_otp_at >= detail.org.otp_requested_at ? (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12.5px] text-amber-900">
                          Client's CPCB OTP: <span className="font-display text-[17px] font-extrabold text-[#0e3b2e]">{detail.org.manual_otp}</span>
                          <span className="text-amber-700"> · shared {fmt(detail.org.manual_otp_at)}</span>
                        </p>
                        <button onClick={() => navigator.clipboard.writeText(detail.org.manual_otp)}
                          className="rounded-lg border border-[#fcd9a6] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-amber-800 hover:bg-amber-50">Copy</button>
                      </div>
                    ) : (
                      <p className="flex items-center gap-2.5 text-[12.5px] text-amber-800">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                        Waiting for the client to enter the OTP on their status page… (auto-refreshing)
                      </p>
                    )}
                  </div>
                )}

                <div className="rounded-[14px] border border-[#cfe6db] bg-[#f2f9f5] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#16654a]">Actions</h3>
                    {!detail.org.payment_verified && (
                      <span className="rounded-full border border-[#fcd9a6] bg-amber-100 px-2.5 py-0.5 text-[10.5px] font-semibold text-amber-800">unpaid</span>
                    )}
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
                    <span className={`rounded-full border px-2.5 py-0.5 font-semibold ${detail.org.payment_verified ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                      Payment {detail.org.payment_verified ? 'received' : 'pending'}{detail.org.balance_amount_paise ? ` · ${inr(detail.org.balance_amount_paise)}` : ''}
                    </span>
                    {detail.org.balance_invoice_url && (
                      <a href={detail.org.balance_invoice_url} target="_blank" rel="noopener noreferrer"
                        className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-700">invoice link ↗</a>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {['New', 'UnderReview', 'Scheduled'].includes(detail.org.status) && (
                      <button disabled={acting} onClick={() => { setShowCall(v => !v); setShowInvoice(false); setShowNote(false); setEditForm(null); }}
                        className="rounded-[9px] border border-[#cfe6db] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#16654a] hover:bg-emerald-50 disabled:opacity-50">Log Consultant Call</button>
                    )}
                    {['New', 'UnderReview', 'Scheduled'].includes(detail.org.status) && (
                      <button disabled={acting} onClick={() => { setShowInvoice(v => !v); setShowCall(false); setShowNote(false); setEditForm(null); }}
                        className="rounded-[9px] border border-blue-200 bg-white px-3.5 py-2 text-[12px] font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50">Send Invoice</button>
                    )}
                    {detail.org.status === 'AwaitingPayment' && (<>
                      <button disabled={acting} onClick={() => runAction('mark-paid', { orgId: detail.org.id })}
                        className="rounded-[9px] bg-emerald-500 px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">✓ Mark Balance Paid</button>
                      <button disabled={acting} onClick={() => { setShowInvoice(v => !v); setShowCall(false); setShowNote(false); }}
                        className="rounded-[9px] border border-blue-200 bg-white px-3.5 py-2 text-[12px] font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50">Resend Invoice</button>
                    </>)}
                    {AUTO_FILING && (detail.org.payment_verified && ['Paid', 'Scheduled'].includes(detail.org.status)) && (
                      <button disabled={acting} onClick={() => runAction('start-filing', { orgId: detail.org.id })}
                        className="rounded-[9px] bg-[#124f3a] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#0e3b2e] disabled:opacity-50">▶ Start Filing (automated)</button>
                    )}
                    {detail.org.payment_verified && detail.org.status !== 'Completed' && (
                      <button disabled={acting} onClick={() => { setShowAck(v => !v); setShowInvoice(false); setShowNote(false); setShowCall(false); setEditForm(null); }}
                        className="rounded-[9px] bg-[#0f8a5b] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#0c7048] disabled:opacity-50">✅ Record ACK &amp; Complete</button>
                    )}
                    {detail.org.payment_verified && detail.org.status !== 'Completed' && (
                      <button disabled={acting} onClick={() => runAction('request-otp', { orgId: detail.org.id })}
                        className="rounded-[9px] border border-[#fcd9a6] bg-white px-3.5 py-2 text-[12px] font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50">📩 Request OTP from client</button>
                    )}
                    {['NeedsAttention', 'Failed'].includes(detail.org.status) && (
                      <button disabled={acting} onClick={() => runAction('reset-otp', { orgId: detail.org.id })}
                        className="rounded-[9px] bg-amber-600 px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-amber-700 disabled:opacity-50">↻ Reset &amp; Retry</button>
                    )}
                    <button disabled={acting} onClick={() => { setShowNote(v => !v); setShowCall(false); setShowInvoice(false); setEditForm(null); }}
                      className="rounded-[9px] border border-[#dbe3df] bg-white px-3.5 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Add Note</button>
                    <button disabled={acting} onClick={() => { setEditForm(f => f ? null : { org_name: detail.org.org_name || '', auth_person: detail.org.auth_person || '', email: detail.org.email || '', phone: detail.org.phone || '', category: detail.org.category || '', sub_category: detail.org.sub_category || '', plan: detail.org.plan || 'standard' }); setShowCall(false); setShowInvoice(false); setShowNote(false); }}
                      className="rounded-[9px] border border-[#dbe3df] bg-white px-3.5 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Edit details</button>
                    <select disabled={acting} value=""
                      onChange={e => { if (e.target.value) runAction('set-status', { orgId: detail.org.id, status: e.target.value }); }}
                      className="rounded-[9px] border border-[#dbe3df] bg-white px-2.5 py-2 text-[12px] font-semibold text-slate-600 disabled:opacity-50">
                      <option value="">Set status…</option>
                      {['UnderReview', 'NeedsAttention', 'Rejected', 'Cancelled', 'Completed', 'Paid', 'New'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {showInvoice && (
                    <form onSubmit={e => { e.preventDefault(); runAction('send-invoice', { orgId: detail.org.id, amountRupees: Number(invAmt) }); setInvAmt(''); }}
                      className="mt-3 space-y-2 border-t border-[#cfe6db] pt-3">
                      <label className="block text-[11px] font-semibold text-slate-600">Invoice amount (₹)</label>
                      {rules.length > 0 && (
                        <select defaultValue="" onChange={e => { if (e.target.value) setInvAmt(e.target.value); }}
                          className="w-full rounded-[9px] border border-[#dbe3df] bg-white px-2.5 py-2 text-xs">
                          <option value="">Pick from price book…</option>
                          {rules.map(r => (
                            <option key={r.id} value={r.amount_paise / 100}>{r.est_type} · {r.location} — ₹{(r.amount_paise / 100).toLocaleString('en-IN')}</option>
                          ))}
                        </select>
                      )}
                      <input type="number" min="1" value={invAmt} onChange={e => setInvAmt(e.target.value)} placeholder="e.g. 2999"
                        className="w-full rounded-[9px] border border-[#dbe3df] px-2.5 py-2 text-xs" />
                      <button type="submit" disabled={acting || !invAmt}
                        className="rounded-[9px] bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50">Create &amp; send payment link → AwaitingPayment</button>
                    </form>
                  )}

                  {showCall && (
                    <form onSubmit={e => { e.preventDefault(); runAction('log-call', { orgId: detail.org.id, appointment_at: callAt || null, consultant_notes: callNotes || null }); }}
                      className="mt-3 space-y-2 border-t border-[#cfe6db] pt-3">
                      <label className="block text-[11px] font-semibold text-slate-600">Appointment slot</label>
                      <input type="datetime-local" value={callAt} onChange={e => setCallAt(e.target.value)}
                        className="w-full rounded-[9px] border border-[#dbe3df] px-2.5 py-2 text-xs" />
                      <textarea value={callNotes} onChange={e => setCallNotes(e.target.value)} rows={2}
                        placeholder="Consultant notes (what was discussed, documents pending…)"
                        className="w-full rounded-[9px] border border-[#dbe3df] px-2.5 py-2 text-xs" />
                      <button type="submit" disabled={acting}
                        className="rounded-[9px] bg-[#16654a] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#124f3a] disabled:opacity-50">Save → Scheduled</button>
                    </form>
                  )}

                  {showNote && (
                    <form onSubmit={e => { e.preventDefault(); if (noteText.trim()) runAction('add-note', { orgId: detail.org.id, note: noteText }); }}
                      className="mt-3 space-y-2 border-t border-[#cfe6db] pt-3">
                      <label className="block text-[11px] font-semibold text-slate-600">Internal note</label>
                      <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={2}
                        placeholder="Add a timestamped note to this org…"
                        className="w-full rounded-[9px] border border-[#dbe3df] px-2.5 py-2 text-xs" />
                      <button type="submit" disabled={acting || !noteText.trim()}
                        className="rounded-[9px] bg-slate-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">Save note</button>
                    </form>
                  )}
                  {editForm && (
                    <form onSubmit={e => { e.preventDefault(); runAction('update-org', { orgId: detail.org.id, fields: editForm }); }}
                      className="mt-3 space-y-2 border-t border-[#cfe6db] pt-3">
                      <label className="block text-[11px] font-semibold text-slate-600">Edit organisation details</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[['org_name', 'Organisation'], ['auth_person', 'Auth person'], ['email', 'Email'], ['phone', 'Phone'], ['category', 'Category'], ['sub_category', 'Sub-category']].map(([k, label]) => (
                          <input key={k} value={editForm[k]} onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))} placeholder={label}
                            className="rounded-[9px] border border-[#dbe3df] px-2.5 py-2 text-xs" />
                        ))}
                        <select value={editForm.plan} onChange={e => setEditForm(f => ({ ...f, plan: e.target.value }))}
                          className="col-span-2 rounded-[9px] border border-[#dbe3df] px-2.5 py-2 text-xs">
                          {['standard', 'professional', 'enterprise'].map(p => <option key={p} value={p}>{p} plan</option>)}
                        </select>
                      </div>
                      <button type="submit" disabled={acting}
                        className="rounded-[9px] bg-slate-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">Save changes</button>
                    </form>
                  )}
                  {showAck && (
                    <form onSubmit={e => { e.preventDefault(); runAction('record-ack', { orgId: detail.org.id, ackNumber: ackNum, portalStatus: ackStatus }); setAckNum(''); }}
                      className="mt-3 space-y-2 border-t border-emerald-200 pt-3">
                      <label className="block text-[11px] font-semibold text-slate-600">CPCB Acknowledgement number (from the portal)</label>
                      <input value={ackNum} onChange={e => setAckNum(e.target.value)} required placeholder="SWM/BWG-C/MH/2026/0000563"
                        className="w-full rounded-[9px] border border-[#dbe3df] px-3 py-2 font-display text-xs" />
                      <label className="block text-[11px] font-semibold text-slate-600">Portal status</label>
                      <input value={ackStatus} onChange={e => setAckStatus(e.target.value)} placeholder="Pending Verification at ULB"
                        className="w-full rounded-[9px] border border-[#dbe3df] px-3 py-2 text-xs" />
                      <button type="submit" disabled={acting}
                        className="rounded-[9px] bg-[#0f8a5b] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0c7048] disabled:opacity-50">Save ACK &amp; mark Completed</button>
                    </form>
                  )}
                  {acting && <p className="mt-2 text-[11px] text-slate-400">Working…</p>}
                </div>

                {/* Danger zone — soft delete (archive / restore) */}
                <div className="rounded-[14px] border border-[#e6ece9] bg-white p-4">
                  <h3 className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.09em] text-slate-400">Danger zone</h3>
                  {detail.org.archived ? (
                    <button disabled={acting} onClick={() => archiveOrg(detail.org.id, false)}
                      className="rounded-[9px] border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">♻ Restore submission</button>
                  ) : (
                    <button disabled={acting} onClick={() => archiveOrg(detail.org.id, true)}
                      className="rounded-[9px] border border-red-300 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">🗄 Archive (remove from list)</button>
                  )}
                  <p className="mt-2 text-[10.5px] text-slate-400">Archiving hides this submission without deleting any data — restore it any time from the “Archived” filter.</p>
                </div>
                </>)}

                {/* ══ DETAILS TAB ══ */}
                {tab === 'Details' && (<>
                <Section title="Organisation">
                  <Row k="Name"      v={detail.org.org_name} />
                  <Row k="Auth person" v={detail.org.auth_person} />
                  <Row k="Email"     v={detail.org.email} />
                  <Row k="Phone"     v={detail.org.phone} />
                  <Row k="Category"  v={`${detail.org.category || '—'}${detail.org.sub_category ? ' · ' + detail.org.sub_category : ''}`} />
                  <Row k="Plan"      v={detail.org.plan} />
                  {detail.org.assigned_admin && <Row k="Assigned" v={detail.org.assigned_admin} />}
                  {detail.org.ack_number && <Row k="ACK number" v={detail.org.ack_number} />}
                  {detail.org.appointment_at && <Row k="Appointment" v={fmt(detail.org.appointment_at)} />}
                  <Row k="Submitted" v={fmt(detail.org.created_at)} />
                </Section>

                {detail.org.consultant_notes && (
                  <Section title="Notes">
                    <p className="whitespace-pre-line rounded-[10px] border border-[#eef3f0] bg-[#f7faf8] p-3 text-[12.5px] leading-relaxed text-slate-600">{detail.org.consultant_notes}</p>
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
                    <div className="grid grid-cols-3 gap-2.5">
                      <MetricCard k="Floor area" v={`${detail.metrics.floor_area_sqm} m²`} on={detail.metrics.floor_area_sqm >= 20000} />
                      <MetricCard k="Waste/day"  v={`${detail.metrics.waste_kg_per_day} kg`} on={detail.metrics.waste_kg_per_day >= 100} />
                      <MetricCard k="Water/day"  v={`${detail.metrics.water_liters_per_day} L`} on={detail.metrics.water_liters_per_day >= 40000} />
                    </div>
                    <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${detail.metrics.is_bulk_waste_generator ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {detail.metrics.is_bulk_waste_generator ? '✓ Qualifies as Bulk Waste Generator' : '✗ Below BWG thresholds'}
                    </div>
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
                </>)}

                {/* ══ HISTORY TAB ══ */}
                {tab === 'History' && (<>
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
                  {(!detail.logs || detail.logs.length === 0) && <p className="text-slate-400">No log entries yet.</p>}
                  <ol className="space-y-0">
                    {detail.logs?.map((l, i) => (
                      <li key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className={`mt-0.5 h-[11px] w-[11px] flex-shrink-0 rounded-full ${l.status === 'error' ? 'bg-red-500 shadow-[0_0_0_3px_#fee2e2]' : l.status === 'retry' ? 'bg-amber-500 shadow-[0_0_0_3px_#fef3c7]' : 'bg-emerald-500 shadow-[0_0_0_3px_#dcfce7]'}`} />
                          <span className="my-0.5 w-0.5 flex-1 bg-[#eef3f0]" />
                        </div>
                        <div className="pb-3.5">
                          <div className="text-[13px] text-slate-800"><span className="font-semibold">{l.step}</span> · {l.status}</div>
                          {l.message && <div className="mt-0.5 text-[11.5px] text-slate-500">{l.message}</div>}
                          <div className="mt-0.5 text-[10.5px] text-slate-400">{fmt(l.created_at)}</div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </Section>
                </>)}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-[14px] border border-[#e6ece9] bg-white p-[17px_18px]">
      <h3 className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.09em] text-slate-400">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Row({ k, v }) {
  if (v == null || v === '') return null;
  return (
    <div className="flex justify-between gap-4 border-t border-[#f4f7f5] py-1.5 first:border-t-0">
      <span className="flex-shrink-0 text-[13px] text-slate-500">{k}</span>
      <span className="break-words text-right text-[13px] font-medium text-slate-900">{v}</span>
    </div>
  );
}
function MetricCard({ k, v, on }) {
  return (
    <div className="rounded-[11px] border border-[#eef3f0] bg-[#f7faf8] p-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#8a9a92]">{k}</div>
      <div className={`mt-1 font-display text-[17px] font-bold ${on ? 'text-[#16654a]' : 'text-slate-400'}`}>{v}</div>
    </div>
  );
}
