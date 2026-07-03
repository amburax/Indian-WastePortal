'use client';
import { useI18n, LANGS } from '../lib/i18n';

export default function LanguageSwitcher({ className = '' }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`inline-flex items-center gap-1.5 text-xs ${className}`} aria-label="Language">
      {Object.entries(LANGS).map(([code, label], i) => (
        <span key={code} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-slate-300">·</span>}
          <button onClick={() => setLang(code)}
            className={lang === code ? 'font-bold text-ruby-800' : 'text-slate-400 hover:text-slate-600'}>
            {label}
          </button>
        </span>
      ))}
    </div>
  );
}
