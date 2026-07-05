'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const TYPE_STYLES = {
  submission_ack:  'bg-emerald-100 text-emerald-800 border-emerald-200',
  otp_link:        'bg-blue-100 text-blue-800 border-blue-200',
  needs_attention: 'bg-red-100 text-red-800 border-red-200',
};
const STATUS_STYLES = {
  sent:   'bg-emerald-100 text-emerald-800',
  queued: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
};
const typeChip = (t) => TYPE_STYLES[t] || 'bg-gray-100 text-gray-700 border-gray-200';
const fmt = (d) => d ? new Date(d.includes('T') ? d : d.replace(' ', 'T') + 'Z').toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function NotificationsLog() {
  const router = useRouter();
  const [data, setData]   = useState(null);
  const [type, setType]   = useState('');
  const [error, setError] = useState('');

  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const qs = type ? `?type=${encodeURIComponent(type)}` : '';
      const res = await fetch(`/api/admin/notifications${qs}`, { cache: 'no-store' });
      if (res.status === 401) { router.push('/admin/login'); return; }
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Failed'); return; }
      setData(d); setError('');
    } catch { setError('Network error'); }
  }, [type, router]);
  useEffect(() => { load(); }, [load]);

  async function retry(id) {
    setBusy(id);
    try {
      const res = await fetch('/api/admin/notifications/retry', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
      });
      const d = await res.json();
      if (!res.ok) alert(d.error || 'Retry failed');
      await load();
    } catch { alert('Network error'); } finally { setBusy(''); }
  }

  return (
    <div className="min-h-screen bg-mesh-light">
      <header className="sticky top-0 z-10 bg-[#eef2f0]/85 backdrop-blur border-b border-[#dde5e1]">
        <div className="px-6 md:px-8 py-4">
          <h1 className="font-display text-[20px] font-bold text-[#0e3b2e] leading-tight">Notifications</h1>
          <p className="text-[12.5px] text-slate-500">{data?.rows?.length ?? 0} recent messages</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6">
        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button onClick={() => setType('')}
            className={`text-xs px-3 py-1.5 rounded-full border ${type === '' ? 'bg-ruby-700 text-white border-ruby-700' : 'bg-white text-gray-600 border-gray-200'}`}>All types</button>
          {(data?.types || []).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`text-xs px-3 py-1.5 rounded-full border ${type === t ? 'bg-ruby-700 text-white border-ruby-700' : 'bg-white text-gray-600 border-gray-200'}`}>{t}</button>
          ))}
        </div>

        <div className="glass-card hairline rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-medium px-4 py-3">When</th>
                <th className="text-left font-medium px-4 py-3">Org</th>
                <th className="text-left font-medium px-4 py-3">Channel</th>
                <th className="text-left font-medium px-4 py-3">Type</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Message</th>
                <th className="text-right font-medium px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!data && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>}
              {data && data.rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No notifications yet.</td></tr>}
              {data?.rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50/60 align-top">
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">{fmt(r.created_at)}</td>
                  <td className="px-4 py-2.5 text-gray-700">{r.org_name || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.channel}</td>
                  <td className="px-4 py-2.5"><span className={`text-[11px] px-2 py-1 rounded-full border ${typeChip(r.type)}`}>{r.type}</span></td>
                  <td className="px-4 py-2.5"><span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] || 'bg-gray-100 text-gray-600'}`}>{r.status}</span></td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs max-w-md">{r.payload}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button disabled={busy === r.id} onClick={() => retry(r.id)}
                      className="text-xs text-ruby-700 hover:underline disabled:opacity-40">
                      {busy === r.id ? '…' : 'Retry'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
