'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarClock, ArrowRight, ChevronLeft, ChevronRight, Scale, ShieldCheck,
  Recycle, Building2, Droplet, Weight, AlertTriangle,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

/**
 * HeroSlider — 5-slide corporate lead-gen banner carousel.
 * Pure CSS/SVG visuals (no image assets). Auto-advances, pauses on hover,
 * arrows + dots, keyboard-friendly. Each slide follows its own visual direction.
 */
function Cta({ href = '/register', tone = 'brand', children }) {
  const tones = {
    brand: 'bg-ruby-700 hover:bg-ruby-800 text-white',
    red:   'bg-red-600 hover:bg-red-700 text-white',
    blue:  'bg-blue-700 hover:bg-blue-800 text-white',
    gold:  'bg-brass hover:bg-brass-dark text-ruby-900',
    light: 'bg-white hover:bg-slate-100 text-slate-900',
  };
  return (
    <Link href={href}
      className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm shadow-lg transition-all hover:scale-[1.03] ${tones[tone]}`}>
      {children} <ArrowRight size={16} />
    </Link>
  );
}

// Live days-until-next-June-30 (annual SWM return deadline). Client-only to
// avoid SSR hydration mismatch; refreshes each minute.
function useDeadlineCountdown() {
  const [c, setC] = useState({ days: null, label: '', year: null });
  useEffect(() => {
    const compute = () => {
      const now = new Date();
      let d = new Date(now.getFullYear(), 5, 30, 23, 59, 59);   // Jun = month 5
      if (now > d) d = new Date(now.getFullYear() + 1, 5, 30, 23, 59, 59);
      const days = Math.max(0, Math.ceil((d - now) / 86400000));
      setC({
        days,
        year: d.getFullYear(),
        label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(),
      });
    };
    compute();
    const t = setInterval(compute, 60000);
    return () => clearInterval(t);
  }, []);
  return c;
}

// ── Slide 1 · Zero-hour deadline urgency ───────────────────────
function SlideDeadline() {
  const { t } = useI18n();
  const { days, label, year } = useDeadlineCountdown();
  const pct = days == null ? 30 : Math.min(100, Math.max(4, Math.round(((365 - days) / 365) * 100)));
  return (
    <div className="relative min-h-[460px] md:min-h-[380px] flex items-center px-6 md:px-12 overflow-hidden"
         style={{ background: 'linear-gradient(135deg,#1b1f27 0%,#0c0e12 100%)' }}>
      <div className="absolute inset-0 opacity-[0.06]"
           style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '38px 38px' }} />
      <div className="relative grid md:grid-cols-2 gap-8 items-center w-full max-w-6xl mx-auto">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/30 rounded-full px-3 py-1 mb-4">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> {t('sld.d.badge')}
          </span>
          <h2 className="font-display text-2xl md:text-4xl font-bold text-white leading-tight">{t('sld.d.h')}</h2>
          <p className="text-slate-300 text-sm md:text-base mt-3 max-w-xl leading-relaxed">{t('sld.d.sub')}</p>
          <div className="mt-6"><Cta tone="red">{t('sld.d.cta')}</Cta></div>
        </div>
        {/* live countdown graphic */}
        <div className="hidden md:flex justify-end">
          <div className="rounded-2xl border-2 border-red-500/40 bg-black/40 backdrop-blur p-6 text-center w-64 shadow-[0_0_40px_rgba(239,68,68,0.25)]">
            <CalendarClock size={34} className="text-red-500 mx-auto animate-pulse" />
            <p className="text-[11px] uppercase tracking-widest text-red-300 mt-3">{t('sld.d.days')}</p>
            <p className="font-display text-6xl font-bold text-white mt-1 tabular-nums">{days == null ? '—' : days}</p>
            <p className="font-display text-lg font-bold text-red-400 -mt-1">{label || 'NEXT 30 JUN'}</p>
            <div className="mt-4 h-1.5 rounded-full bg-red-500/20 overflow-hidden">
              <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-slate-400 mt-2">{year ? `FY return due ${year}` : 'Filing window'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Slide 2 · Footprint filter (self-identification) ───────────
function MetricCard({ icon: Icon, big, unit, label }) {
  return (
    <div className="rounded-xl bg-white/10 border border-white/15 backdrop-blur px-3 py-3 text-center">
      <Icon size={18} className="text-brass-light mx-auto" />
      <p className="font-display text-lg md:text-xl font-bold text-white mt-1 leading-none">{big}</p>
      <p className="text-[10px] text-emerald-200/80">{unit}</p>
      <p className="text-[10px] text-slate-300 mt-1">{label}</p>
    </div>
  );
}
function SlideFootprint() {
  const { t } = useI18n();
  return (
    <div className="relative min-h-[460px] md:min-h-[380px] flex items-center px-6 md:px-12 overflow-hidden"
         style={{ background: 'linear-gradient(135deg,#0e3b2e 0%,#16654a 100%)' }}>
      <div className="relative grid md:grid-cols-2 gap-8 items-center w-full max-w-6xl mx-auto">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-brass-light bg-black/20 rounded-full px-3 py-1 mb-4 inline-block">{t('sld.f.badge')}</span>
          <h2 className="font-display text-2xl md:text-4xl font-bold text-white leading-tight">{t('sld.f.h')}</h2>
          <p className="text-emerald-50/90 text-sm md:text-base mt-3 max-w-xl leading-relaxed">{t('sld.f.sub')}</p>
          <div className="mt-6"><Cta tone="gold">{t('sld.f.cta')}</Cta></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard icon={Building2} big="≥20,000" unit="sq.m" label="Built-up area" />
          <MetricCard icon={Droplet}   big="≥40,000" unit="L / day" label="Water use" />
          <MetricCard icon={Weight}    big="≥100"    unit="kg / day" label="Waste output" />
          <div className="col-span-3 mt-1 rounded-xl bg-white/95 p-3 shadow-lg">
            <div className="flex items-center gap-2 text-[11px] text-slate-400"><div className="h-2 w-2 rounded-full bg-red-400" /><div className="h-2 w-2 rounded-full bg-amber-400" /><div className="h-2 w-2 rounded-full bg-emerald-400" /><span className="ml-1">Instant eligibility check</span></div>
            <div className="mt-2 space-y-1.5">
              <div className="h-6 rounded-md bg-slate-100 border border-slate-200" />
              <div className="h-6 rounded-md bg-slate-100 border border-slate-200" />
              <div className="h-6 rounded-md bg-ruby-700/90 w-1/2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Slide 3 · Supreme Court risk mitigation ────────────────────
function SlideLegal() {
  const { t } = useI18n();
  return (
    <div className="relative min-h-[460px] md:min-h-[380px] flex items-center px-6 md:px-12 overflow-hidden"
         style={{ background: 'linear-gradient(135deg,#0b1f3a 0%,#12325c 100%)' }}>
      <Scale className="absolute right-4 -bottom-6 text-white/5" size={260} strokeWidth={1} />
      <div className="relative w-full max-w-6xl mx-auto">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/30 rounded-full px-3 py-1 mb-4">
          <Scale size={12} /> {t('sld.l.badge')}
        </span>
        <h2 className="font-display text-2xl md:text-4xl font-bold text-white leading-tight max-w-3xl">{t('sld.l.h')}</h2>
        <div className="mt-4 max-w-2xl rounded-xl bg-red-950/40 border border-red-500/30 p-4 flex gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-slate-200 text-sm leading-relaxed">{t('sld.l.sub')}</p>
        </div>
        <div className="mt-6"><Cta tone="blue">{t('sld.l.cta')}</Cta></div>
      </div>
    </div>
  );
}

// ── Slide 4 · 4-stream compliance ──────────────────────────────
function StreamBlock({ color, name, tag }) {
  return (
    <div className="flex-1 rounded-xl p-4 flex flex-col justify-between min-h-[120px]" style={{ background: color }}>
      <Recycle size={20} className="text-white/90" />
      <div>
        <p className="text-white font-bold text-sm leading-tight">{name}</p>
        <p className="text-white/80 text-[11px]">{tag}</p>
      </div>
    </div>
  );
}
function SlideStreams() {
  const { t } = useI18n();
  return (
    <div className="relative min-h-[460px] md:min-h-[380px] flex items-center px-6 md:px-12 bg-slate-50">
      <div className="relative w-full max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-ruby-800 bg-ruby-50 rounded-full px-3 py-1 mb-4 inline-block">{t('sld.s.badge')}</span>
          <h2 className="font-display text-2xl md:text-4xl font-bold text-slate-800 leading-tight">{t('sld.s.h')}</h2>
          <p className="text-slate-500 text-sm md:text-base mt-3 max-w-xl leading-relaxed">{t('sld.s.sub')}</p>
          <div className="mt-6"><Cta tone="brand">{t('sld.s.cta')}</Cta></div>
        </div>
        <div className="flex gap-3">
          <StreamBlock color="#16a34a" name="Wet"     tag="Biodegradable" />
          <StreamBlock color="#2563eb" name="Dry"     tag="Recyclable" />
          <StreamBlock color="#dc2626" name="Sanitary" tag="Hygiene" />
          <StreamBlock color="#d4a017" name="Special" tag="Special care" />
        </div>
      </div>
    </div>
  );
}

// ── Slide 5 · EBWGR ledger ─────────────────────────────────────
function SlideEbwgr() {
  const { t } = useI18n();
  return (
    <div className="relative min-h-[460px] md:min-h-[380px] flex items-center px-6 md:px-12 bg-white overflow-hidden">
      <div className="absolute inset-0 opacity-[0.5]"
           style={{ backgroundImage: 'linear-gradient(#eef2f7 1px,transparent 1px),linear-gradient(90deg,#eef2f7 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
      <div className="relative w-full max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brass-dark bg-brass/10 border border-brass/30 rounded-full px-3 py-1 mb-4">
            <ShieldCheck size={12} /> {t('sld.e.badge')}
          </span>
          <h2 className="font-display text-2xl md:text-4xl font-bold text-slate-800 leading-tight">{t('sld.e.h')}</h2>
          <p className="text-slate-500 text-sm md:text-base mt-3 max-w-xl leading-relaxed">{t('sld.e.sub')}</p>
          <div className="mt-6"><Cta tone="gold">{t('sld.e.cta')}</Cta></div>
        </div>
        <div className="hidden md:flex justify-center items-center">
          <div className="relative w-[320px] h-[300px]">
            {/* Certificate */}
            <svg viewBox="0 0 200 250" className="absolute right-2 top-1/2 -translate-y-1/2 w-[190px] drop-shadow-2xl">
              <defs>
                <linearGradient id="ebwgrGold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#efd67f" />
                  <stop offset="0.5" stopColor="#c8a24b" />
                  <stop offset="1" stopColor="#9c7b2d" />
                </linearGradient>
              </defs>
              <rect x="6" y="6" width="188" height="238" rx="7" fill="#ffffff" stroke="#ece2c4" />
              <rect x="14" y="14" width="172" height="222" rx="3" fill="none" stroke="url(#ebwgrGold)" strokeWidth="1.5" />
              {/* corner flourishes */}
              {[[24,24,1,1],[176,24,-1,1],[24,226,1,-1],[176,226,-1,-1]].map(([x,y,sx,sy],i)=>(
                <g key={i} stroke="url(#ebwgrGold)" strokeWidth="1.6" fill="none" strokeLinecap="round">
                  <path d={`M${x} ${y} h${13*sx}`} />
                  <path d={`M${x} ${y} v${13*sy}`} />
                  <circle cx={x} cy={y} r="1.7" fill="url(#ebwgrGold)" stroke="none" />
                </g>
              ))}
              {/* title */}
              <rect x="62" y="36" width="76" height="7" rx="3.5" fill="url(#ebwgrGold)" />
              <rect x="78" y="49" width="44" height="4" rx="2" fill="#ddd5c2" />
              {/* body lines */}
              {[80,92,104,116].map((y,i)=>(
                <rect key={i} x="34" y={y} width={i===3?92:132} height="4.5" rx="2.25" fill="#eef1f5" />
              ))}
              <rect x="34" y="134" width="70" height="4.5" rx="2.25" fill="#dceee4" />
              {/* wax seal + ribbon */}
              <g transform="translate(150,190)">
                <path d="M-6 14 L-9 34 L-3 28 L1 34 L-2 15 Z" fill="#c8a24b" />
                <path d="M6 14 L9 34 L3 28 L-1 34 L2 15 Z" fill="#a07e2f" />
                <circle r="18" fill="url(#ebwgrGold)" stroke="#8a6d28" strokeWidth="1" />
                <circle r="12.5" fill="none" stroke="#ffffff" strokeWidth="1.4" opacity="0.65" />
                <path d="M-6 0 L-1.5 5 L6 -5" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </svg>

            {/* Shield in front */}
            <svg viewBox="0 0 120 140" className="absolute left-0 top-1/2 -translate-y-1/2 w-[135px]"
              style={{ filter: 'drop-shadow(0 14px 22px rgba(154,123,45,0.45))' }}>
              <defs>
                <linearGradient id="ebwgrShield" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#f6e08c" />
                  <stop offset="0.45" stopColor="#c8a24b" />
                  <stop offset="1" stopColor="#8f6f28" />
                </linearGradient>
              </defs>
              <path d="M60 6 L112 26 L112 72 C112 102 90 126 60 134 C30 126 8 102 8 72 L8 26 Z"
                fill="url(#ebwgrShield)" stroke="#7d611f" strokeWidth="2" />
              <path d="M60 12 L106 30 L106 72 C106 98 87 120 60 128 C33 120 14 98 14 72 L14 30 Z"
                fill="none" stroke="#ffffff" strokeWidth="1.4" opacity="0.35" />
              <path d="M40 68 L54 84 L84 48" fill="none" stroke="#ffffff" strokeWidth="11"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

const SLIDES = [
  { id: 'deadline',  node: <SlideDeadline /> },
  { id: 'footprint', node: <SlideFootprint /> },
  { id: 'legal',     node: <SlideLegal /> },
  { id: 'streams',   node: <SlideStreams /> },
  { id: 'ebwgr',     node: <SlideEbwgr /> },
];
const AUTO_MS = 6500;

export default function HeroSlider() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);
  const n = SLIDES.length;

  const go = useCallback((i) => setIdx(((i % n) + n) % n), [n]);

  useEffect(() => {
    if (paused) return;
    timer.current = setInterval(() => setIdx(i => (i + 1) % n), AUTO_MS);
    return () => clearInterval(timer.current);
  }, [paused, n]);

  return (
    <section className="px-4 py-8" aria-roledescription="carousel" aria-label="Compliance highlights">
      <div className="max-w-6xl mx-auto relative rounded-3xl overflow-hidden hairline shadow-xl"
           onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="flex transition-transform duration-700 ease-out"
             style={{ transform: `translateX(-${idx * 100}%)` }}>
          {SLIDES.map(s => (
            <div key={s.id} className="w-full shrink-0" aria-hidden={SLIDES[idx].id !== s.id}>{s.node}</div>
          ))}
        </div>

        {/* arrows */}
        <button onClick={() => go(idx - 1)} aria-label="Previous slide"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/25 hover:bg-black/45 text-white flex items-center justify-center backdrop-blur transition">
          <ChevronLeft size={20} />
        </button>
        <button onClick={() => go(idx + 1)} aria-label="Next slide"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/25 hover:bg-black/45 text-white flex items-center justify-center backdrop-blur transition">
          <ChevronRight size={20} />
        </button>

        {/* dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {SLIDES.map((s, i) => (
            <button key={s.id} onClick={() => go(i)} aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${i === idx ? 'w-7 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
