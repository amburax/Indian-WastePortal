'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ACTION_STYLES = {
  login:            'bg-slate-100 text-slate-700 border-slate-200',
  log_call:         'bg-blue-100 text-blue-800 border-blue-200',
  start_filing:     'bg-emerald-100 text-emerald-800 border-emerald-200',
  reset_otp:        'bg-amber-100 text-amber-800 border-amber-200',
  set_status:       'bg-violet-100 text-violet-800 border-violet-200',
  password_rotated: 'bg-red-100 text-red-800 border-red-200',
};
const chip = (a) => ACTION_STYLES[a] || 'bg-gray-100 text-gray-700 border-gray-200';
const fmt  = (d) => d ? new Date(d.includes('T') ? d : d.replace(' ', 'T') + 'Z').toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function AuditViewer() {
  const router = useRouter();
  const [data, setData]     = useState(null);
  const [filter, setFilter] = useState('');
  const [error, setError]   = useState('');

  const load = useCallback(async () => {
    try {
      const qs = filter ? `?action=${encodeURIComponent(filter)}` : '';
      const res = await fetch(`/api/admin/audit${qs}`, { cache: 'no-store' });
      if (res.status === 401) { router.push('/admin/login'); return; }
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Failed'); return; }
      setData(d); setError('');
    } catch { setError('Network error'); }
  }, [filter, router]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-mesh-light">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-ruby-700 flex items-center justify-center text-white font-bold text-sm">IW</div>
            <div>
              <h1 className="font-bold text-ruby-900 leading-tight">Audit Trail</h1>
              <p className="text-[11px] text-gray-500">{data?.rows?.length ?? 0} entries</p>
            </div>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/admin" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600">Submissions</Link>
            <Link href="/admin/calendar" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600">Calendar</Link>
            <span className="px-3 py-1.5 rounded-lg bg-ruby-50 text-ruby-800 font-medium">Audit</span>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6">
        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button onClick={() => setFilter('')}
            className={`text-xs px-3 py-1.5 rounded-full border ${filter === '' ? 'bg-ruby-700 text-white border-ruby-700' : 'bg-white text-gray-600 border-gray-200'}`}>
            All actions
          </button>
          {(data?.actions || []).map(a => (
            <button key={a} onClick={() => setFilter(a)}
              className={`text-xs px-3 py-1.5 rounded-full border ${filter === a ? 'bg-ruby-700 text-white border-ruby-700' : 'bg-white text-gray-600 border-gray-200'}`}>
              {a}
            </button>
          ))}
        </div>

        <div className="glass-card hairline rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-medium px-4 py-3">When</th>
                <th className="text-left font-medium px-4 py-3">Admin</th>
                <th className="text-left font-medium px-4 py-3">Action</th>
                <th className="text-left font-medium px-4 py-3">Target</th>
                <th className="text-left font-medium px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!data && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>}
              {data && data.rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No audit entries.</td></tr>}
              {data?.rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">{fmt(r.created_at)}</td>
                  <td className="px-4 py-2.5 text-gray-700">{r.admin_email || '—'}</td>
                  <td className="px-4 py-2.5"><span className={`text-[11px] px-2 py-1 rounded-full border ${chip(r.action)}`}>{r.action}</span></td>
                  <td className="px-4 py-2.5 text-gray-600">{r.org_name || (r.org_id ? r.org_id.slice(0, 8) : '—')}</td>
                  <td className="px-4 py-2.5 text-gray-400 font-mono text-[11px] max-w-xs truncate">{r.meta || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
