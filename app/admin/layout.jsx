'use client';
/**
 * Admin shell — persistent sidebar for every /admin/* page.
 * Drop this in at app/admin/layout.jsx. It wraps all admin routes
 * (Submissions, Calendar, Pricing, Notifications, Audit, Users) but
 * skips the login page so /admin/login stays full-bleed.
 *
 * Uses the existing Tailwind theme: `ruby-*` (re-themed to emerald),
 * `font-display` (Outfit) and the glass utilities in globals.css.
 */
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { href: '/admin',               label: 'Submissions',   exact: true,  icon: 'M3 4h18v16H3zM3 9h18M8 14h8' },
  { href: '/admin/calendar',      label: 'Calendar',      icon: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18' },
  { href: '/admin/pricing',       label: 'Pricing',       icon: 'M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L2 12V2h10l8.6 8.6a2 2 0 010 2.8z' },
  { href: '/admin/notifications', label: 'Notifications', icon: 'M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0' },
  { href: '/admin/audit',         label: 'Audit',         icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4' },
  { href: '/admin/users',         label: 'Users',         icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 108 0 4 4 0 00-8 0' },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState('');

  // The login page must not get the shell.
  const isLogin = pathname === '/admin/login';

  useEffect(() => {
    if (isLogin) return;
    fetch('/api/admin/stats', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setEmail(d.admin || ''))
      .catch(() => {});
  }, [isLogin]);

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  if (isLogin) return children;

  const active = (n) => (n.exact ? pathname === n.href : pathname.startsWith(n.href));

  return (
    <div className="flex min-h-screen bg-[#eef2f0]">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-[250px] flex-col bg-gradient-to-b from-[#0d3327] to-[#0a2a21]">
        <div className="flex items-center gap-3 px-5 pb-4 pt-5">
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-gradient-to-br from-[#1f8a60] to-[#16654a] font-display text-[15px] font-extrabold text-white shadow-[0_4px_14px_rgba(22,101,74,0.4)]">IW</div>
          <div>
            <div className="font-display text-[15px] font-bold leading-tight text-white">Indian Waste</div>
            <div className="text-[11px] font-medium text-[#6fae93]">Admin Console</div>
          </div>
        </div>

        <div className="mt-1.5 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#4f8570]">Operations</div>
        <nav className="flex flex-col gap-0.5 px-3">
          {NAV.map(n => (
            <a key={n.href} href={n.href}
              className={`relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13.5px] transition ${active(n)
                ? 'bg-white/[0.11] font-semibold text-white'
                : 'font-medium text-[#9dc4b3] hover:bg-white/[0.07] hover:text-[#e6f2ec]'}`}>
              {active(n) && <span className="absolute -left-3 bottom-2 top-2 w-[3px] rounded-r-[3px] bg-[#46a67c]" />}
              <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={n.icon} /></svg>
              {n.label}
            </a>
          ))}
        </nav>

        <div className="mt-auto p-3">
          <div className="rounded-xl bg-white/[0.06] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#8fbaa7]">
              <span className="h-[7px] w-[7px] rounded-full bg-[#46a67c] shadow-[0_0_0_3px_rgba(70,166,124,0.25)]" />
              Live · auto-refresh 20s
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#16654a] text-xs font-bold text-white">
                {(email || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-[#e6f2ec]">{email || '—'}</div>
                <div className="text-[10.5px] text-[#6fae93]">Administrator</div>
              </div>
            </div>
            <button onClick={logout}
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-[9px] border border-white/[0.12] py-2 text-xs font-semibold text-[#d9a3a3] transition hover:bg-white/[0.07]">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="ml-[250px] flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
