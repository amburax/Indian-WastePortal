'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Pencil } from 'lucide-react';

/**
 * Searchable combobox with free entry.
 *  - Click / focus → shows the list; typing filters it (type-to-search).
 *  - Pick a suggestion, OR type a value that isn't in the list — free entry is
 *    always accepted (for districts/villages the LGD dataset may not have).
 *
 * Controlled: `value` is the committed string, `onChange(next)` fires on every
 * keystroke and on selection. `options` is an array of strings.
 */
export default function Combobox({
  value = '', onChange, options = [], placeholder, disabled = false,
  error = false, id, maxVisible = 60,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const q = (value || '').toLowerCase().trim();
  const filtered = (q ? options.filter(o => o.toLowerCase().includes(q)) : options).slice(0, maxVisible);
  const exact = options.some(o => o.toLowerCase() === q);
  const hasValue = (value || '').trim().length > 0;

  function pick(opt) {
    onChange(opt);
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          autoComplete="off"
          onChange={(e) => { onChange(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`form-input pr-9 ${error ? 'error' : ''}`}
        />
        <button
          type="button" tabIndex={-1} disabled={disabled}
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle list"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-40">
          <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && !disabled && (
        <div className="absolute left-0 right-0 mt-1 z-30 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length > 0 ? (
              filtered.map((opt) => {
                const active = opt.toLowerCase() === q;
                return (
                  <button
                    key={opt} type="button" onClick={() => pick(opt)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-emerald-50 ${active ? 'bg-emerald-50/60 font-medium text-emerald-800' : 'text-slate-700'}`}>
                    {active ? <Check size={14} className="text-emerald-600 shrink-0" /> : <span className="w-[14px] shrink-0" />}
                    <span className="truncate">{opt}</span>
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-2 text-xs text-slate-400">
                {options.length === 0 ? 'Start typing your name…' : 'No match in the list.'}
              </p>
            )}
          </div>

          {/* Free-entry affordance — keep whatever they typed if it isn't listed. */}
          {hasValue && !exact && (
            <button
              type="button" onClick={() => setOpen(false)}
              className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 border-t border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100">
              <Pencil size={13} className="text-slate-400 shrink-0" />
              Use “<span className="font-medium text-slate-800">{value}</span>” — not in the list
            </button>
          )}
        </div>
      )}
    </div>
  );
}
