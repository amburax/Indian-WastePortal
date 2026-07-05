'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const fmt = (d) => d ? new Date(d.includes('T') ? d : d.replace(' ', 'T') + 'Z').toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—';

export default function AdminUsers() {
  const router = useRouter();
  const [data, setData]   = useState(null);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw]       = useState('');
  const [role, setRole]   = useState('admin');
  const [busy, setBusy]   = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      if (res.status === 401) { router.push('/admin/login'); return; }
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Failed'); return; }
      setData(d); setError('');
    } catch { setError('Network error'); }
  }, [router]);
  useEffect(() => { load(); }, [load]);

  const isSuper = data?.myRole === 'superadmin';

  async function create(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pw, role }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Failed'); return; }
      setEmail(''); setPw(''); setRole('admin'); await load();
    } catch { setError('Network error'); } finally { setBusy(false); }
  }

  async function remove(targetEmail) {
    if (!confirm(`Remove admin ${targetEmail}?`)) return;
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/admin/users?email=${encodeURIComponent(targetEmail)}`, { method: 'DELETE' });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Failed'); return; }
      await load();
    } catch { setError('Network error'); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-mesh-light">
      <header className="sticky top-0 z-10 bg-[#eef2f0]/85 backdrop-blur border-b border-[#dde5e1]">
        <div className="px-6 md:px-8 py-4">
          <h1 className="font-display text-[20px] font-bold text-[#0e3b2e] leading-tight">Admin Users</h1>
          <p className="text-[12.5px] text-slate-500">{data?.users?.length ?? 0} admins · you are {data?.myRole || '—'}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-6">
        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="glass-card hairline rounded-xl overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-medium px-4 py-3">Email</th>
                <th className="text-left font-medium px-4 py-3">Role</th>
                <th className="text-left font-medium px-4 py-3">Added</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!data && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
              {data?.users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 text-gray-800">{u.email}{u.email === data.me && <span className="ml-2 text-[10px] text-gray-400">(you)</span>}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${u.role === 'superadmin' ? 'bg-ruby-100 text-ruby-800' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{fmt(u.created_at)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {isSuper && u.email !== data.me && (
                      <button disabled={busy} onClick={() => remove(u.email)}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50">Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isSuper ? (
          <form onSubmit={create} className="glass-card hairline rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Add an admin</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="email@domain.in"
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm" autoComplete="off" />
              <input type="password" required value={pw} onChange={e => setPw(e.target.value)} placeholder="password (min 8)"
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm" autoComplete="new-password" />
              <select value={role} onChange={e => setRole(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 text-sm">
                <option value="admin">admin</option>
                <option value="superadmin">superadmin</option>
              </select>
            </div>
            <button type="submit" disabled={busy} className="btn-ruby mt-3 px-5 py-2 rounded-lg text-sm disabled:opacity-50">Create admin</button>
          </form>
        ) : (
          <p className="text-sm text-gray-400">Only a superadmin can add or remove admins.</p>
        )}
      </main>
    </div>
  );
}
