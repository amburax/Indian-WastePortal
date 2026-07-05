'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const inr = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN')}`;

export default function PricingBook() {
  const router = useRouter();
  const [rules, setRules] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy]   = useState(false);
  const [form, setForm]   = useState({ est_type: '', location: 'Any', amountRupees: '' });
  const [role, setRole]   = useState('');
  const canEdit = role === 'superadmin';   // pricing mutations are superadmin-only (also enforced server-side)
  useEffect(() => { fetch('/api/admin/stats', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => d && setRole(d.role || '')).catch(() => {}); }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pricing', { cache: 'no-store' });
      if (res.status === 401) { router.push('/admin/login'); return; }
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Failed'); return; }
      setRules(d.rules); setError('');
    } catch { setError('Network error'); }
  }, [router]);
  useEffect(() => { load(); }, [load]);

  async function create(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Failed'); return; }
      setForm({ est_type: '', location: 'Any', amountRupees: '' }); await load();
    } catch { setError('Network error'); } finally { setBusy(false); }
  }

  async function update(id, body) {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/pricing', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) });
      const d = await res.json(); if (!res.ok) alert(d.error || 'Failed'); await load();
    } catch { alert('Network error'); } finally { setBusy(false); }
  }
  async function remove(id) {
    if (!confirm('Delete this pricing rule?')) return;
    setBusy(true);
    try { await fetch(`/api/admin/pricing?id=${id}`, { method: 'DELETE' }); await load(); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-mesh-light">
      <header className="sticky top-0 z-10 bg-[#eef2f0]/85 backdrop-blur border-b border-[#dde5e1]">
        <div className="px-6 md:px-8 py-4">
          <h1 className="font-display text-[20px] font-bold text-[#0e3b2e] leading-tight">Price Book</h1>
          <p className="text-[12.5px] text-slate-500">{rules?.length ?? 0} rules · used to fill invoices</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6">
        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <p className="text-sm text-gray-500 mb-4">Set a one-time fee per <strong>establishment type × location</strong>. When you send an invoice, pick the matching rule and the amount fills in (you can still override).</p>
        {role && !canEdit && (
          <p className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">🔒 Read-only — pricing is managed by a superadmin. You can view the rules but not change them.</p>
        )}

        <div className="glass-card hairline rounded-xl overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-medium px-4 py-3">Establishment type</th>
                <th className="text-left font-medium px-4 py-3">Location</th>
                <th className="text-left font-medium px-4 py-3">Amount (₹)</th>
                <th className="text-left font-medium px-4 py-3">Active</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!rules && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
              {rules && rules.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No rules yet — add one below.</td></tr>}
              {rules?.map(r => (
                <PriceRow key={r.id} r={r} busy={busy} canEdit={canEdit} onSave={update} onDelete={remove} />
              ))}
            </tbody>
          </table>
        </div>

        {canEdit && (
        <form onSubmit={create} className="glass-card hairline rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Add a pricing rule</h2>
          <div className="grid sm:grid-cols-4 gap-3">
            <input required value={form.est_type} onChange={e => setForm(f => ({ ...f, est_type: e.target.value }))} placeholder="e.g. Big Hospital"
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm sm:col-span-2" />
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Location (Metro / Urban / Any)"
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            <input type="number" min="1" required value={form.amountRupees} onChange={e => setForm(f => ({ ...f, amountRupees: e.target.value }))} placeholder="₹ amount"
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
          </div>
          <button type="submit" disabled={busy} className="btn-ruby mt-3 px-5 py-2 rounded-lg text-sm disabled:opacity-50">Add rule</button>
        </form>
        )}
      </main>
    </div>
  );
}

function PriceRow({ r, busy, canEdit, onSave, onDelete }) {
  // Read-only view for non-superadmins.
  if (!canEdit) {
    return (
      <tr className="hover:bg-gray-50/60">
        <td className="px-4 py-2.5 text-gray-800">{r.est_type}</td>
        <td className="px-4 py-2.5 text-gray-600">{r.location}</td>
        <td className="px-4 py-2.5 text-gray-800">{inr(r.amount_paise)}</td>
        <td className="px-4 py-2.5">
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${r.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>{r.active ? 'active' : 'inactive'}</span>
        </td>
        <td className="px-4 py-2.5 text-right text-gray-300 text-xs">—</td>
      </tr>
    );
  }
  return <PriceRowEditable r={r} busy={busy} onSave={onSave} onDelete={onDelete} />;
}

function PriceRowEditable({ r, busy, onSave, onDelete }) {
  const [amt, setAmt] = useState(String((r.amount_paise || 0) / 100));
  const [saved, setSaved] = useState(false);
  // Keep the field in sync if the rule changes (e.g. after a save/reload).
  useEffect(() => { setAmt(String((r.amount_paise || 0) / 100)); }, [r.amount_paise]);
  const paise = Math.round(Number(amt) * 100);
  const dirty = amt !== '' && !Number.isNaN(paise) && paise !== r.amount_paise;

  async function commit() {
    if (!dirty || paise < 100) return;
    await onSave(r.id, { amountRupees: Number(amt) });
    setSaved(true); setTimeout(() => setSaved(false), 1600);
  }

  return (
    <tr className="hover:bg-gray-50/60">
      <td className="px-4 py-2.5 text-gray-800">{r.est_type}</td>
      <td className="px-4 py-2.5 text-gray-600">{r.location}</td>
      <td className="px-4 py-2.5 whitespace-nowrap">
        <span className="text-gray-400 mr-1">₹</span>
        <input type="number" min="1" value={amt}
          onChange={e => { setAmt(e.target.value); setSaved(false); }}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
          className={`w-24 px-2 py-1 rounded border text-sm ${dirty ? 'border-ruby-400 ring-1 ring-ruby-200' : 'border-gray-300'}`} />
        {dirty
          ? <button disabled={busy} onClick={commit}
              className="ml-2 text-xs font-semibold px-2.5 py-1 rounded-md bg-ruby-700 text-white hover:bg-ruby-800 disabled:opacity-50">Save</button>
          : saved && <span className="ml-2 text-xs font-medium text-emerald-600">✓ Saved</span>}
      </td>
      <td className="px-4 py-2.5">
        <button disabled={busy} onClick={() => onSave(r.id, { active: r.active ? 0 : 1 })}
          className={`text-[11px] px-2 py-0.5 rounded-full ${r.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
          {r.active ? 'active' : 'inactive'}
        </button>
      </td>
      <td className="px-4 py-2.5 text-right">
        <button disabled={busy} onClick={() => onDelete(r.id)} className="text-xs text-red-600 hover:underline disabled:opacity-40">Delete</button>
      </td>
    </tr>
  );
}
