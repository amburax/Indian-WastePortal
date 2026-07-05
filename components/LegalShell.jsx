import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

/**
 * Shared shell for legal/policy pages. Server component (no interactivity), so
 * each page can also export its own `metadata`.
 */
export default function LegalShell({ title, updated, children }) {
  return (
    <div className="min-h-screen bg-mesh-light">
      <header className="glass border-b border-white/50 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
            <ArrowLeft size={16} />
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-ruby-800" />
              <span className="font-display font-bold text-sm">Indian Waste<span className="text-ruby-800">Portal</span></span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <span className="text-xs text-slate-400 hidden md:inline">Legal</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="font-display text-3xl font-bold text-slate-800">{title}</h1>
        {updated && <p className="text-xs text-slate-400 mt-1">Last updated: {updated}</p>}

        <div className="mt-3 mb-8 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚖️ Draft template — please have this reviewed and finalised by your legal counsel before public launch.
        </div>

        <article className="legal-prose space-y-5 text-sm text-slate-600 leading-relaxed">
          {children}
        </article>

        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-wrap gap-4 text-sm text-slate-400">
          <Link href="/legal/privacy" className="hover:text-slate-600">Privacy</Link>
          <Link href="/legal/terms" className="hover:text-slate-600">Terms</Link>
          <Link href="/legal/refund" className="hover:text-slate-600">Refund &amp; Cancellation</Link>
          <Link href="/legal/contact" className="hover:text-slate-600">Contact</Link>
          <Link href="/" className="hover:text-slate-600 ml-auto">← Home</Link>
        </div>
      </main>
    </div>
  );
}

export function H2({ children }) {
  return <h2 className="font-display text-lg font-bold text-slate-800 pt-3">{children}</h2>;
}
