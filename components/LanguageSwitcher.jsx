'use client';
import { useI18n, LANGS } from '../lib/i18n';

export default function LanguageSwitcher({ className = '', dark = false }) {
  const { lang, setLang } = useI18n();
  // `dark` = for use on dark backgrounds (e.g. the hero/scrolled navbar) so the
  // text stays readable; default palette is tuned for light (glass) surfaces.
  const sep      = dark ? 'text-white/40' : 'text-slate-300';
  const active   = dark ? 'font-bold text-white' : 'font-bold text-ruby-800';
  const inactive = dark ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-slate-600';
  return (
    <div className={`inline-flex items-center gap-1.5 text-xs ${className}`} aria-label="Language">
      {Object.entries(LANGS).map(([code, label], i) => (
        <span key={code} className="flex items-center gap-1.5">
          {i > 0 && <span className={sep}>·</span>}
          <button onClick={() => setLang(code)}
            className={lang === code ? active : inactive}>
            {label}
          </button>
        </span>
      ))}
    </div>
  );
}
