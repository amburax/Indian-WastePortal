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

        <TwoFactorCard />

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

// ── Two-factor authentication (for the logged-in admin's own account) ──
function TwoFactorCard() {
  const [enabled, setEnabled] = useState(null);   // null = loading
  const [enroll, setEnroll]   = useState(null);   // { secret, otpauth, qr } during setup
  const [code, setCode]       = useState('');
  const [pw, setPw]           = useState('');
  const [msg, setMsg]         = useState('');
  const [busy, setBusy]       = useState(false);

  const refresh = useCallback(async () => {
    try { const r = await fetch('/api/admin/2fa', { cache: 'no-store' }); const d = await r.json(); if (r.ok) setEnabled(!!d.enabled); } catch {}
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function post(body) {
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/admin/2fa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) { setMsg(d.error || 'Failed'); return null; }
      return d;
    } catch { setMsg('Network error'); return null; }
    finally { setBusy(false); }
  }

  async function startSetup() { const d = await post({ action: 'setup' }); if (d) { setEnroll(d); setMsg(''); } }
  async function confirmEnable(e) {
    e.preventDefault();
    const d = await post({ action: 'enable', token: code });
    if (d) { setEnroll(null); setCode(''); setEnabled(true); setMsg('✓ Two-factor authentication enabled.'); }
  }
  async function disable(e) {
    e.preventDefault();
    const d = await post({ action: 'disable', password: pw || undefined, token: code || undefined });
    if (d) { setPw(''); setCode(''); setEnabled(false); setMsg('Two-factor authentication disabled.'); }
  }

  return (
    <div className="glass-card hairline rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-800 text-sm">Two-factor authentication</h2>
          <p className="text-xs text-gray-500 mt-0.5">Protect your admin account with an authenticator app (TOTP).</p>
        </div>
        <span className={`text-[11px] px-2 py-0.5 rounded-full ${enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
          {enabled == null ? '…' : enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      {msg && <p className={`mt-3 text-xs ${msg.startsWith('✓') ? 'text-emerald-700' : 'text-gray-600'}`}>{msg}</p>}

      {/* Not enabled, not mid-enrolment → offer setup */}
      {enabled === false && !enroll && (
        <button onClick={startSetup} disabled={busy} className="btn-ruby mt-3 px-4 py-2 rounded-lg text-sm disabled:opacity-50">Enable 2FA</button>
      )}

      {/* Mid-enrolment → show QR + secret + confirm code */}
      {enroll && (
        <div className="mt-4 flex flex-col sm:flex-row gap-5 items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="Scan this QR in your authenticator app" className="w-40 h-40 rounded-lg border border-gray-200" />
          <div className="flex-1">
            <p className="text-xs text-gray-600 mb-2">Scan the QR in Google Authenticator / Authy, or enter this key manually:</p>
            <p className="font-mono text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 break-all mb-3">{enroll.secret}</p>
            <form onSubmit={confirmEnable} className="flex items-center gap-2">
              <input inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000"
                className="w-28 px-3 py-2 rounded-lg border border-gray-300 text-center font-mono tracking-widest" />
              <button type="submit" disabled={busy} className="btn-ruby px-4 py-2 rounded-lg text-sm disabled:opacity-50">Verify & enable</button>
              <button type="button" onClick={() => { setEnroll(null); setCode(''); }} className="text-xs text-gray-500 hover:underline">Cancel</button>
            </form>
          </div>
        </div>
      )}

      {/* Enabled → allow disable */}
      {enabled === true && (
        <form onSubmit={disable} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password"
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm" autoComplete="current-password" />
          <span className="text-xs text-gray-400">or</span>
          <input inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000"
            className="w-24 px-3 py-2 rounded-lg border border-gray-300 text-center font-mono tracking-widest text-sm" />
          <button type="submit" disabled={busy} className="text-sm px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50">Disable 2FA</button>
        </form>
      )}
    </div>
  );
}
