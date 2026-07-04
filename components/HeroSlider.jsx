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
    <div className="relative min-h-[460px] md:min-h-[380px] flex items-center px-6 md:px-12 overflow-hidden bg-[#0a0505]">
      {/* Deep dark ruby background with dot grid */}
      <div className="absolute inset-0 opacity-[0.05]"
           style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
      {/* Dramatic glowing orb */}
      <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] rounded-full blur-[120px] -z-10 bg-ruby-900/30" />
      
      <div className="relative grid md:grid-cols-2 gap-8 items-center w-full max-w-6xl mx-auto z-10">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ruby-300 bg-ruby-950/60 border border-ruby-500/30 rounded-full px-3 py-1.5 mb-4 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-ruby-500 animate-pulse" /> {t('sld.d.badge')}
          </span>
          <h2 className="font-display text-2xl md:text-4xl font-bold text-white leading-tight">
            {t('sld.d.h')}
          </h2>
          <p className="text-slate-300 text-sm md:text-base mt-4 max-w-xl leading-relaxed">
            {t('sld.d.sub')}
          </p>
          <div className="mt-7">
            <Cta tone="red">{t('sld.d.cta')}</Cta>
          </div>
        </div>
        {/* premium dark glass countdown graphic */}
        <div className="hidden md:flex justify-end">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 text-center w-72 shadow-[0_0_60px_rgba(159,18,57,0.15)] relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ruby-600 to-ruby-400" />
            <div className="absolute inset-0 bg-gradient-to-b from-ruby-500/5 to-transparent pointer-events-none" />
            <CalendarClock size={36} className="text-ruby-400 mx-auto mb-4 animate-pulse relative z-10" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1 relative z-10">{t('sld.d.days')}</p>
            <p className="font-display text-6xl font-black text-white mt-1 mb-2 tabular-nums tracking-tighter relative z-10 drop-shadow-md">
              {days == null ? '—' : days}
            </p>
            <p className="font-display text-lg font-bold text-ruby-400 relative z-10">{label || 'NEXT 30 JUN'}</p>
            
            <div className="mt-5 h-2 rounded-full bg-white/10 overflow-hidden relative z-10">
              <div className="h-full bg-gradient-to-r from-ruby-600 to-ruby-400 transition-all duration-1000 shadow-[0_0_10px_rgba(225,29,72,0.5)]" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] font-semibold text-slate-400 mt-3 uppercase tracking-wider relative z-10">
              {year ? `FY return due ${year}` : 'Filing window'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Slide 2 · Footprint filter (self-identification) ───────────
function MetricCard({ icon: Icon, big, unit, label }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl px-3 py-4 text-center hover:bg-white/[0.06] transition-colors shadow-lg">
      <Icon size={22} className="text-emerald-400 mx-auto mb-2" />
      <p className="font-display text-lg md:text-xl font-black text-white leading-none mb-1">{big}</p>
      <p className="text-[10px] font-bold text-slate-400">{unit}</p>
      <p className="text-[10px] font-semibold text-emerald-500/80 mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}
function SlideFootprint() {
  const { t } = useI18n();
  return (
    <div className="relative min-h-[460px] md:min-h-[380px] flex items-center px-6 md:px-12 overflow-hidden bg-[#050a07]">
      <div className="absolute inset-0 opacity-[0.05]"
           style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="absolute top-[0%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] -z-10 bg-emerald-900/20" />
      <div className="relative grid md:grid-cols-2 gap-8 items-center w-full max-w-6xl mx-auto z-10">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 rounded-full px-3 py-1.5 mb-4 backdrop-blur-sm">
            {t('sld.f.badge')}
          </span>
          <h2 className="font-display text-2xl md:text-4xl font-bold text-white leading-tight">{t('sld.f.h')}</h2>
          <p className="text-slate-300 text-sm md:text-base mt-4 max-w-xl leading-relaxed">{t('sld.f.sub')}</p>
          <div className="mt-7"><Cta tone="brand">{t('sld.f.cta')}</Cta></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard icon={Building2} big="≥20,000" unit="sq.m" label="Built-up area" />
          <MetricCard icon={Droplet}   big="≥40,000" unit="L / day" label="Water use" />
          <MetricCard icon={Weight}    big="≥100"    unit="kg / day" label="Waste output" />
          <div className="col-span-3 mt-2 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-4 shadow-[0_0_40px_rgba(6,95,70,0.15)] relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-3 relative z-10">
              <div className="h-2 w-2 rounded-full bg-red-400" />
              <div className="h-2 w-2 rounded-full bg-amber-400" />
              <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="ml-1 text-slate-300">Instant eligibility check</span>
            </div>
            <div className="space-y-2 relative z-10">
              <div className="h-7 rounded-lg bg-white/5 border border-white/10" />
              <div className="h-7 rounded-lg bg-white/5 border border-white/10" />
              <div className="h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 w-1/2 mt-1 shadow-sm" />
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
    <div className="relative min-h-[460px] md:min-h-[380px] flex items-center px-6 md:px-12 overflow-hidden bg-[#05080f]">
      <div className="absolute inset-0 opacity-[0.05]"
           style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="absolute top-[50%] left-[50%] w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px] -z-10 bg-blue-900/20" />
      <Scale className="absolute right-[-5%] -bottom-[20%] text-white/5 -z-10" size={360} strokeWidth={1} />
      <div className="relative w-full max-w-6xl mx-auto z-10">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-300 bg-blue-950/60 border border-blue-500/30 rounded-full px-3 py-1.5 mb-4 backdrop-blur-sm">
          <Scale size={14} /> {t('sld.l.badge')}
        </span>
        <h2 className="font-display text-2xl md:text-4xl font-bold text-white leading-tight max-w-3xl">{t('sld.l.h')}</h2>
        <div className="mt-5 max-w-2xl rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 flex gap-4 shadow-[0_0_40px_rgba(59,130,246,0.1)] relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
          <AlertTriangle size={24} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-slate-300 text-sm leading-relaxed font-medium">{t('sld.l.sub')}</p>
        </div>
        <div className="mt-7"><Cta tone="blue">{t('sld.l.cta')}</Cta></div>
      </div>
    </div>
  );
}

// ── Slide 4 · 4-stream compliance ──────────────────────────────
function StreamBlock({ color, name, tag }) {
  return (
    <div className="flex-1 rounded-2xl bg-white/[0.02] border border-white/10 p-5 flex flex-col justify-between min-h-[140px] shadow-lg relative overflow-hidden group hover:bg-white/[0.05] transition-colors backdrop-blur-xl">
      <div className="absolute inset-0 opacity-20 transition-opacity group-hover:opacity-30" style={{ background: `radial-gradient(circle at top right, ${color}, transparent 70%)` }} />
      <div className="absolute top-0 left-0 w-full h-1" style={{ background: color }} />
      <Recycle size={24} style={{ color }} className="mb-3 relative z-10 drop-shadow-md" />
      <div className="relative z-10">
        <p className="text-white font-bold text-sm leading-tight mb-1">{name}</p>
        <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">{tag}</p>
      </div>
    </div>
  );
}
function SlideStreams() {
  const { t } = useI18n();
  return (
    <div className="relative min-h-[460px] md:min-h-[380px] flex items-center px-6 md:px-12 overflow-hidden bg-[#08080a]">
       <div className="absolute inset-0 opacity-[0.05]"
           style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[130px] -z-10 bg-emerald-900/15" />
      <div className="relative w-full max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center z-10">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 mb-4 backdrop-blur-sm">
            {t('sld.s.badge')}
          </span>
          <h2 className="font-display text-2xl md:text-4xl font-bold text-white leading-tight">{t('sld.s.h')}</h2>
          <p className="text-slate-300 text-sm md:text-base mt-4 max-w-xl leading-relaxed">{t('sld.s.sub')}</p>
          <div className="mt-7"><Cta tone="white">{t('sld.s.cta')}</Cta></div>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3">
          <StreamBlock color="#34d399" name="Wet"     tag="Biodegradable" />
          <StreamBlock color="#60a5fa" name="Dry"     tag="Recyclable" />
          <StreamBlock color="#f87171" name="Sanitary" tag="Hygiene" />
          <StreamBlock color="#fbbf24" name="Special" tag="Special care" />
        </div>
      </div>
    </div>
  );
}

// ── Slide 5 · EBWGR ledger ─────────────────────────────────────
function SlideEbwgr() {
  const { t } = useI18n();
  return (
    <div className="relative min-h-[460px] md:min-h-[380px] flex items-center px-6 md:px-12 bg-[#0a0805] overflow-hidden">
      <div className="absolute inset-0 opacity-[0.05]"
           style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="absolute top-[50%] right-[10%] -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[120px] -z-10 bg-amber-700/20" />
      <div className="relative w-full max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center z-10">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-amber-900/30 border border-amber-500/30 rounded-full px-3 py-1.5 mb-4 backdrop-blur-sm">
            <ShieldCheck size={14} /> {t('sld.e.badge')}
          </span>
          <h2 className="font-display text-2xl md:text-4xl font-bold text-white leading-tight">{t('sld.e.h')}</h2>
          <p className="text-slate-300 text-sm md:text-base mt-4 max-w-xl leading-relaxed">{t('sld.e.sub')}</p>
          <div className="mt-7"><Cta tone="gold">{t('sld.e.cta')}</Cta></div>
        </div>
        <div className="hidden md:flex justify-center items-center">
          <div className="relative w-[320px] h-[300px]">
            {/* Certificate */}
            <svg viewBox="0 0 200 250" className="absolute right-2 top-1/2 -translate-y-1/2 w-[190px]" style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))' }}>
              <defs>
                <linearGradient id="ebwgrGold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#efd67f" />
                  <stop offset="0.5" stopColor="#c8a24b" />
                  <stop offset="1" stopColor="#9c7b2d" />
                </linearGradient>
                <linearGradient id="certBg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset="1" stopColor="#f3eee0" />
                </linearGradient>
              </defs>
              <rect x="6" y="6" width="188" height="238" rx="7" fill="url(#certBg)" stroke="#ece2c4" />
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
              <rect x="78" y="49" width="44" height="4" rx="2" fill="#d0c6ac" />
              {/* body lines */}
              {[80,92,104,116].map((y,i)=>(
                <rect key={i} x="34" y={y} width={i===3?92:132} height="4.5" rx="2.25" fill="#e2ded3" />
              ))}
              <rect x="34" y="134" width="70" height="4.5" rx="2.25" fill="#c4dfcf" />
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
              style={{ filter: 'drop-shadow(0 14px 30px rgba(0,0,0,0.6))' }}>
              <defs>
                <linearGradient id="ebwgrShield" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#f6e08c" />
                  <stop offset="0.45" stopColor="#c8a24b" />
                  <stop offset="1" stopColor="#8f6f28" />
                </linearGradient>
              </defs>
              <path d="M60 6 L112 26 L112 72 C112 102 90 126 60 134 C30 126 8 102 8 72 L8 26 Z"
                fill="url(#ebwgrShield)" stroke="#594412" strokeWidth="2" />
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
      <div className="max-w-6xl mx-auto relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10"
           onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="flex transition-transform duration-700 ease-out"
             style={{ transform: `translateX(-${idx * 100}%)` }}>
          {SLIDES.map(s => (
            <div key={s.id} className="w-full shrink-0" aria-hidden={SLIDES[idx].id !== s.id}>{s.node}</div>
          ))}
        </div>

        {/* arrows */}
        <button onClick={() => go(idx - 1)} aria-label="Previous slide"
          className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/20 shadow-lg hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition z-20">
          <ChevronLeft size={22} />
        </button>
        <button onClick={() => go(idx + 1)} aria-label="Next slide"
          className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/20 shadow-lg hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition z-20">
          <ChevronRight size={22} />
        </button>

        {/* dots */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2.5 z-20">
          {SLIDES.map((s, i) => (
            <button key={s.id} onClick={() => go(i)} aria-label={`Go to slide ${i + 1}`}
              className={`h-2.5 rounded-full transition-all shadow-sm ${i === idx ? 'w-8 bg-white' : 'w-2.5 bg-white/30 hover:bg-white/50'}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
