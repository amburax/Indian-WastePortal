'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Mail, ArrowRight, Loader2, CheckCircle2, Zap } from 'lucide-react';

/**
 * EWasteModal — Glassmorphic E-Waste waitlist capture modal
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 */
export default function EWasteModal({ isOpen, onClose }) {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState('');
  const inputRef  = useRef(null);
  const overlayRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setDone(false);
      setError('');
      setEmail('');
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ewaste-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ewaste-modal-title"
    >
      {/* Modal Panel */}
      <div className="glass-frosted rounded-3xl p-8 w-full max-w-md relative animate-scale-in overflow-hidden">

        {/* Decorative gradient orbs */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20 pointer-events-none"
             style={{ background: 'radial-gradient(circle, #10b981, transparent)' }} />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full opacity-15 pointer-events-none"
             style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />

        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
        >
          <X size={16} />
        </button>

        {!done ? (
          <>
            {/* Badge */}
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <Zap size={14} className="text-white" />
              </div>
              <span className="text-xs font-bold tracking-widest uppercase text-emerald-700">
                E-Waste Compliance
              </span>
            </div>

            {/* Heading */}
            <h2 id="ewaste-modal-title" className="font-display text-2xl font-bold text-slate-800 leading-tight mb-2">
              Mandates are{' '}
              <span className="text-transparent bg-clip-text"
                    style={{ backgroundImage: 'linear-gradient(135deg, #10b981, #059669)' }}>
                tightening.
              </span>
            </h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              New GPCB E-Waste rules take effect soon. Drop your email to <strong className="text-slate-700">
              pre-book a 20% discount</strong> on your first E-Waste compliance filing — exclusively for early registrants.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="ewaste-email" className="form-label">Your Work Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={inputRef}
                    id="ewaste-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@company.com"
                    className={`form-input pl-10 ${error ? 'error' : ''}`}
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
                {error && (
                  <p className="text-xs text-red-500 mt-1.5">{error}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="btn-ruby w-full gap-2"
                style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
                id="ewaste-submit-btn"
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" />Reserving your spot…</>
                  : <><span>Reserve My 20% Discount</span><ArrowRight size={15} /></>
                }
              </button>
            </form>

            <p className="text-xs text-slate-400 text-center mt-4">
              No spam. Only the launch announcement + your discount code.
            </p>
          </>
        ) : (
          /* Success state */
          <div className="text-center py-6 animate-scale-in">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                 style={{ background: 'rgba(16,185,129,0.12)' }}>
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <h3 className="font-display text-xl font-bold text-slate-800 mb-2">You&apos;re on the list!</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              We&apos;ll send your exclusive 20% discount code to <strong>{email}</strong> the moment E-Waste filing opens.
            </p>
            <button onClick={onClose} className="btn-ghost mt-6 mx-auto" style={{ color: '#059669', borderColor: 'rgba(16,185,129,0.35)' }}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
