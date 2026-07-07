'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Error({ error, reset }) {
  // Report the crash so it's visible in logs / alerts (best-effort, never throws).
  useEffect(() => {
    try {
      fetch('/api/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error?.message,
          stack:   error?.stack,
          digest:  error?.digest,
          url:     typeof location !== 'undefined' ? location.href : '',
        }),
      }).catch(() => {});
    } catch { /* noop */ }
  }, [error]);

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center px-4">
      <div className="max-w-md w-full glass-frosted rounded-2xl p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={26} className="text-red-500" />
        </div>
        <h1 className="font-display text-2xl font-bold text-slate-800">Something went wrong</h1>
        <p className="text-sm text-slate-500 mt-2">
          An unexpected error occurred. Please try again — if it keeps happening, contact us at
          {' '}<a href="mailto:indianwasteportal@gmail.com" className="text-ruby-800 underline">indianwasteportal@gmail.com</a>.
        </p>
        {error?.digest && <p className="text-[11px] text-slate-400 mt-3 font-mono">ref: {error.digest}</p>}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => reset()} className="btn-ruby px-5 py-2.5 rounded-xl text-sm">Try again</button>
          <Link href="/" className="btn-ghost px-5 py-2.5 rounded-xl text-sm">Go home</Link>
        </div>
      </div>
    </div>
  );
}
