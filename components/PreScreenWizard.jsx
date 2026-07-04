'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Building2, Droplet, Weight, CheckCircle2, ArrowRight, Sparkles, Info } from 'lucide-react';
import { useI18n } from '../lib/i18n';

/**
 * PreScreenWizard — 60-second BWG self-check (soft lead capture, NOT a gate).
 * Three inputs (built-up area / water / waste). Instantly tells the visitor if
 * they meet any Bulk Waste Generator threshold, then routes them to registration
 * or a WhatsApp consultation pre-filled with their numbers. Nothing is stored;
 * nothing is blocked — registration is always available regardless of result.
 */
const T = { area: 20000, water: 40000, waste: 100 };

// NOTE: defined at module scope (NOT inside the component) so typing does not
// remount the input and lose focus after each keystroke.
function Field({ icon: Icon, label, unit, value, onChange, hint }) {
  return (
    <div className="flex-1 min-w-0">
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
        <Icon size={14} className="text-ruby-700" /> {label}
      </label>
      <div className="relative">
        <input
          type="number" min="0" inputMode="numeric" value={value} onChange={onChange}
          placeholder="0"
          className="w-full px-3 py-2.5 pr-16 rounded-xl border border-slate-300 focus:ring-2 focus:ring-ruby-400 focus:border-ruby-400 outline-none"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">{unit}</span>
      </div>
      <p className="text-[10px] text-slate-400 mt-1">{hint}</p>
    </div>
  );
}

export default function PreScreenWizard() {
  const { t } = useI18n();
  const [area, setArea]   = useState('');
  const [water, setWater] = useState('');
  const [waste, setWaste] = useState('');
  const [checked, setChecked] = useState(false);

  const a = parseFloat(area) || 0, w = parseFloat(water) || 0, k = parseFloat(waste) || 0;
  const hits = [
    a >= T.area  && `Built-up area ≥ ${T.area.toLocaleString('en-IN')} sq.m`,
    w >= T.water && `Water use ≥ ${T.water.toLocaleString('en-IN')} L/day`,
    k >= T.waste && `Waste ≥ ${T.waste} kg/day`,
  ].filter(Boolean);
  const qualifies = hits.length > 0;
  const hasInput  = a > 0 || w > 0 || k > 0;

  const waNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '').replace(/[^\d]/g, '');
  const waMsg = encodeURIComponent(
    `Hi, I ran the BWG self-check on Indian Waste Portal.\n` +
    `• Built-up area: ${a || '-'} sq.m\n• Water: ${w || '-'} L/day\n• Waste: ${k || '-'} kg/day\n` +
    `Result: ${qualifies ? 'Qualifies as a Bulk Waste Generator' : 'Below threshold'}. I'd like a consultation.`
  );
  const waHref = waNumber ? `https://wa.me/${waNumber}?text=${waMsg}` : null;

  function submit(e) { e.preventDefault(); setChecked(true); }

  return (
    <section id="eligibility-check" className="px-4 pb-14 -mt-2">
      <div className="max-w-6xl mx-auto">
        <div className="glass-card hairline rounded-3xl p-6 md:p-8">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-brass-dark" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-ruby-800">{t('wizard.badge')}</span>
            </div>
          </div>
          <h3 className="font-display text-xl md:text-2xl font-bold text-slate-800">
            {t('wizard.title')}
          </h3>
          <p className="text-sm text-slate-500 mt-1">{t('wizard.sub')}</p>

          <form onSubmit={submit} className="mt-5 flex flex-col md:flex-row gap-4 md:items-end">
            <Field icon={Building2} label={t('wizard.area')}  unit="sq.m"   value={area}  onChange={e => setArea(e.target.value)}  hint={`${t('wizard.bwgIf')} ${T.area.toLocaleString('en-IN')}`} />
            <Field icon={Droplet}   label={t('wizard.water')} unit="L/day"  value={water} onChange={e => setWater(e.target.value)} hint={`${t('wizard.bwgIf')} ${T.water.toLocaleString('en-IN')}`} />
            <Field icon={Weight}    label={t('wizard.waste')} unit="kg/day" value={waste} onChange={e => setWaste(e.target.value)} hint={`${t('wizard.bwgIf')} ${T.waste}`} />
            <button type="submit" disabled={!hasInput}
              className="btn-ruby px-6 py-2.5 rounded-xl whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed md:mb-[18px]">
              {t('wizard.check')}
            </button>
          </form>

          {/* Result */}
          {checked && hasInput && (
            <div className={`mt-5 rounded-2xl p-5 border animate-scale-in ${qualifies ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              {qualifies ? (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-emerald-600" />
                    <p className="font-semibold text-emerald-800">{t('wizard.qualTitle')}</p>
                  </div>
                  <p className="text-sm text-emerald-700/90 mt-1">{t('wizard.qualBody', { x: hits.join(' · ') })}</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Info size={20} className="text-amber-600" />
                    <p className="font-semibold text-amber-800">{t('wizard.belowTitle')}</p>
                  </div>
                  <p className="text-sm text-amber-700/90 mt-1">{t('wizard.belowBody')}</p>
                </>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/register" className="btn-ruby px-5 py-2.5 rounded-xl inline-flex items-center gap-2">
                  {qualifies ? t('wizard.startReg') : t('wizard.registerVol')} <ArrowRight size={16} />
                </Link>
                {waHref && (
                  <a href={waHref} target="_blank" rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-xl inline-flex items-center gap-2 font-semibold text-sm bg-[#25D366] text-white hover:brightness-95">
                    {t('wizard.talk')}
                  </a>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-3">{t('wizard.disclaimer')}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
