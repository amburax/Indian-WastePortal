'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const STATUS_DOT = {
  Paid: 'bg-emerald-500', Scheduled: 'bg-blue-500', Queued: 'bg-indigo-500',
  'In Progress': 'bg-cyan-500', Completed: 'bg-green-500', NeedsAttention: 'bg-red-500',
};
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// appointment_at is stored as 'YYYY-MM-DDTHH:mm' (datetime-local) — take the date part.
const apptDayKey = (a) => (a.appointment_at || '').slice(0, 10);
const apptTime   = (a) => (a.appointment_at || '').slice(11, 16) || '';

export default function CalendarView() {
  const router = useRouter();
  const [appts, setAppts] = useState([]);
  const [cursor, setCursor] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/appointments', { cache: 'no-store' });
      if (res.status === 401) { router.push('/admin/login'); return; }
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Failed'); return; }
      setAppts(d.appointments || []); setError('');
    } catch { setError('Network error'); }
  }, [router]);
  useEffect(() => { load(); }, [load]);

  // Group appointments by day.
  const byDay = useMemo(() => {
    const m = {};
    for (const a of appts) { const k = apptDayKey(a); if (!k) continue; (m[k] ||= []).push(a); }
    return m;
  }, [appts]);

  // Build the month grid (leading blanks + days).
  const cells = useMemo(() => {
    const year = cursor.getFullYear(), month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lead = first.getDay(); // 0=Sun
    const arr = [];
    for (let i = 0; i < lead; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(year, month, d));
    return arr;
  }, [cursor]);

  const monthLabel = cursor.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const todayKey = dayKey(new Date());

  return (
    <div className="min-h-screen bg-mesh-light">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-ruby-700 flex items-center justify-center text-white font-bold text-sm">IW</div>
            <div>
              <h1 className="font-bold text-ruby-900 leading-tight">Appointments</h1>
              <p className="text-[11px] text-gray-500">{appts.length} booked slots</p>
            </div>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/admin" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600">Submissions</Link>
            <span className="px-3 py-1.5 rounded-lg bg-ruby-50 text-ruby-800 font-medium">Calendar</span>
            <Link href="/admin/audit" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600">Audit</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6">
        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">{monthLabel}</h2>
          <div className="flex gap-2">
            <button onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">← Prev</button>
            <button onClick={() => { const n = new Date(); setCursor(new Date(n.getFullYear(), n.getMonth(), 1)); }}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">Today</button>
            <button onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">Next →</button>
          </div>
        </div>

        <div className="glass-card hairline rounded-xl p-3">
          <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="min-h-[84px] rounded-lg bg-gray-50/40" />;
              const k = dayKey(d);
              const list = byDay[k] || [];
              const isToday = k === todayKey;
              return (
                <button key={i} onClick={() => setSelected(list.length ? { day: k, list } : null)}
                  className={`min-h-[84px] rounded-lg border p-1.5 text-left align-top transition
                    ${isToday ? 'border-ruby-400 bg-ruby-50/40' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                  <div className={`text-xs font-semibold ${isToday ? 'text-ruby-800' : 'text-gray-500'}`}>{d.getDate()}</div>
                  <div className="mt-1 space-y-0.5">
                    {list.slice(0, 3).map(a => (
                      <div key={a.id} className="flex items-center gap-1 text-[10px] text-gray-600 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[a.status] || 'bg-gray-400'}`} />
                        <span className="truncate">{apptTime(a)} {a.org_name}</span>
                      </div>
                    ))}
                    {list.length > 3 && <div className="text-[10px] text-gray-400">+{list.length - 3} more</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day detail */}
        {selected && (
          <div className="mt-5 glass-card hairline rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">{new Date(selected.day + 'T00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 text-sm">Close</button>
            </div>
            <ul className="space-y-2">
              {selected.list.map(a => (
                <li key={a.id} className="flex items-start gap-3 text-sm border-b border-gray-100 pb-2 last:border-0">
                  <span className="text-xs font-mono text-gray-500 w-12 shrink-0 mt-0.5">{apptTime(a) || '—'}</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{a.org_name} <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_DOT[a.status] ? 'text-white ' + STATUS_DOT[a.status] : 'bg-gray-200 text-gray-600'}`}>{a.status}</span></div>
                    <div className="text-xs text-gray-500">{a.phone}{a.assigned_admin ? ` · ${a.assigned_admin}` : ''}</div>
                    {a.consultant_notes && <div className="text-xs text-gray-400 mt-0.5">{a.consultant_notes}</div>}
                  </div>
                  <Link href={`/admin?org=${a.id}`} className="text-xs text-ruby-700 underline shrink-0">Open</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
