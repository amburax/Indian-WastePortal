'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, LogIn, Loader2 } from 'lucide-react';
import { useI18n } from '../lib/i18n';

/**
 * LoginModal — the client login form in a blurred-backdrop popup.
 * Reuses the same fields/logic as /login (which stays as a fallback route for
 * direct links and the password-reset redirect).
 *
 * Props: isOpen, onClose
 */
export default function LoginModal({ isOpen, onClose }) {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef(null);
  const inputRef = useRef(null);

  // Focus the email field + reset state on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setError(''); setEmail(''); setPassword('');
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen) return null;

  async function submit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/account/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || t('login.failed')); setLoading(false); return; }
      router.push('/dashboard');
    } catch { setError(t('login.neterr')); setLoading(false); }
  }

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div className="glass-frosted rounded-3xl p-8 w-full max-w-md relative animate-scale-in">
        {/* Close */}
        <button onClick={onClose} aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
          <X size={16} />
        </button>

        <div className="w-12 h-12 rounded-xl bg-ruby-50 flex items-center justify-center mb-4">
          <LogIn size={22} className="text-ruby-800" />
        </div>
        <h2 id="login-modal-title" className="font-display text-2xl font-bold text-slate-800">{t('login.title')}</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">{t('login.sub')}</p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('login.email')}</label>
            <input ref={inputRef} type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="username"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-ruby-400 focus:border-ruby-400 outline-none" placeholder="you@company.in" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('login.password')}</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-ruby-400 focus:border-ruby-400 outline-none" placeholder="••••••••" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="btn-ruby w-full py-2.5 rounded-lg font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> {t('login.submitting')}</> : t('login.submit')}
          </button>
        </form>

        <div className="flex justify-between text-xs text-slate-400 mt-6">
          <Link href="/register" onClick={onClose} className="text-ruby-800 underline">{t('login.register')}</Link>
          <Link href="/forgot" onClick={onClose} className="hover:text-slate-600">{t('login.forgot')}</Link>
        </div>
      </div>
    </div>
  );
}
