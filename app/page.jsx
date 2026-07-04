'use client';
import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import {
  ShieldCheck, Cpu, Lock, ArrowRight, ChevronDown,
  Shield, Zap, CheckCircle, Globe, Phone, Mail,
  Star, TrendingUp, AlertTriangle, Recycle, Leaf,
  Calendar, Scale, MapPin, FileText, Landmark, Battery,
  Sparkles, Building2, Clock, Users, BadgeCheck,
  Droplets, Truck, Menu, X
} from 'lucide-react';
import PricingSection from '../components/PricingSection';
import EWasteModal   from '../components/EWasteModal';
import GlassCard     from '../components/GlassCard';
import HeroSlider    from '../components/HeroSlider';
import PreScreenWizard from '../components/PreScreenWizard';
import CapabilityMosaic from '../components/CapabilityMosaic';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useI18n } from '../lib/i18n';

// ── Urgency banner: live deadline countdown before 1 Apr 2026,
//    flips to an "in force / penalties" red alert once the date has passed. ──
function UrgencyBanner() {
  const { t } = useI18n();
  const DEADLINE = new Date('2026-04-01T00:00:00+05:30').getTime();
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return null;            // avoid SSR/CSR hydration mismatch
  const days = Math.ceil((DEADLINE - now) / 86_400_000);
  const past = days <= 0;
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-5 shadow-sm animate-fade-in ${
      past ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
      <AlertTriangle size={15} className={past ? 'text-red-600 animate-pulse' : 'text-amber-600'} />
      {past
        ? <span>{t('hero.inforceAlert')}</span>
        : <span>{t('hero.countPre')} <span className="tabular-nums font-extrabold">{days}</span> {t('hero.countLabel')}</span>}
    </div>
  );
}

// ── Header ──────────────────────────────────────────────
function Header() {
  const { t } = useI18n();
  const [authed, setAuthed] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { fetch('/api/account/me', { cache: 'no-store' }).then(r => setAuthed(r.ok)).catch(() => setAuthed(false)); }, []);
  const NAV = [
    { href: '#whats-new', label: 'SWM 2026' },
    { href: '#services', label: t('nav.services') },
    { href: '#how-it-works', label: t('nav.how') },
    { href: '#pricing', label: t('nav.pricing') },
  ];
  return (
    <header className="sticky top-0 z-40 glass border-b border-white/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #16654a, #0e3b2e)' }}>
            <ShieldCheck size={16} className="text-white" />
          </div>
          <span className="font-display text-xl font-bold text-slate-800 tracking-tight">
            Indian Waste<span className="text-ruby-800">Portal</span>
          </span>
        </div>

        {/* Nav (desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
          {NAV.map(n => <a key={n.href} href={n.href} className="hover:text-slate-800 transition-colors">{n.label}</a>)}
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          {authed
            ? <Link href="/dashboard" id="header-register-btn" className="btn-ruby text-sm px-4 sm:px-5 py-2.5 rounded-xl">My Dashboard</Link>
            : <Link href="/login" className="btn-ruby text-sm px-4 sm:px-5 py-2.5 rounded-xl">Login</Link>}
          <button onClick={() => setMenuOpen(v => !v)} aria-label="Menu"
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100">
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/50 bg-white/90 backdrop-blur">
          <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1 text-sm font-medium text-slate-600">
            {NAV.map(n => (
              <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className="px-2 py-2 rounded-lg hover:bg-slate-100">{n.label}</a>
            ))}
            <Link href="/register" onClick={() => setMenuOpen(false)} className="px-2 py-2 rounded-lg hover:bg-slate-100 text-ruby-800 font-semibold">Start a registration</Link>
            <div className="px-2 pt-2"><LanguageSwitcher /></div>
          </nav>
        </div>
      )}
    </header>
  );
}

// ── Hero — Concept A: Authority Split ────────────────────
const HERO_BINS = [
  { name: 'Wet',     color: '#16a34a', icon: Leaf },
  { name: 'Dry',     color: '#2563eb', icon: Recycle },
  { name: 'Sanitary',color: '#dc2626', icon: Sparkles },
  { name: 'Special', color: '#ca8a04', icon: Battery },
];

function Hero() {
  const { t } = useI18n();
  return (
    <section className="relative pt-10 pb-20 px-4 overflow-hidden">
      {/* Calm green-tinted canvas */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#ffffff,#f6f8f4)] -z-10" />
      <div className="absolute inset-0 dot-grid opacity-[0.25] -z-10" />
      {/* Faint waste/eco motif — leaf · recycle · droplet · special-waste (self-contained SVG, stays readable) */}
      <svg aria-hidden preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full -z-10"
           style={{ color: 'rgba(22,101,74,0.06)' }}>
        <defs>
          <pattern id="ecoMotif" width="112" height="112" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
            {/* leaf */}
            <path d="M20 16 c 12 0 19 7 19 19 c -12 0 -19 -7 -19 -19 Z M20 16 c 5 7 10 12 16 15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            {/* recycling triangle */}
            <path d="M80 20 l 9 16 h -18 z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
            {/* water droplet */}
            <path d="M34 74 c 7 9 7 16 0 22 c -7 -6 -7 -13 0 -22 Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
            {/* special / e-waste mark */}
            <circle cx="86" cy="84" r="4.5" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ecoMotif)" />
      </svg>
      <div className="absolute -top-[8%] right-[6%] w-[620px] h-[620px] rounded-full blur-[130px] -z-10"
           style={{ background: 'rgba(22,101,74,0.12)' }} />
      <div className="absolute bottom-[2%] left-[2%] w-[520px] h-[520px] rounded-full blur-[120px] -z-10"
           style={{ background: 'rgba(200,162,75,0.10)' }} />

      <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-10 items-center z-10">

        {/* ── LEFT: copy ───────────────────────────── */}
        <div className="text-center lg:text-left">
          <UrgencyBanner />
          {/* Government seal chip */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-bold mb-7 animate-fade-in bg-white/70 backdrop-blur-md"
               style={{ border: '1px solid rgba(200,162,75,0.45)', color: '#0e3b2e' }}>
            <Scale size={15} className="text-brass-dark" />
            SWM RULES 2026 · GSR 388(E)
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-700">{t('hero.inforce')}</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl md:text-6xl lg:text-[4.2rem] font-black text-slate-900 leading-[1.08] tracking-tight mb-6 animate-slide-up">
            {t('hero.h1pre')}{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-ruby-800 via-ruby-600 to-brass bg-clip-text text-transparent">
                {t('hero.h1hi')}
              </span>
              <span className="absolute -bottom-1 left-0 w-full h-2.5 rounded-full -z-10 -rotate-1"
                    style={{ background: 'rgba(200,162,75,0.30)' }} />
            </span>.
          </h1>

          <p className="text-lg md:text-xl text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed mb-8 animate-slide-up"
             style={{ animationDelay: '0.1s' }}>
            {t('hero.sub')}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6 animate-slide-up"
               style={{ animationDelay: '0.2s' }}>
            <Link href="/register" id="hero-primary-cta"
                  className="btn-ruby text-base px-7 py-4 rounded-2xl gap-2 shadow-lg">
              {t('hero.cta1')} <ArrowRight size={19} />
            </Link>
            <a href="mailto:hello@indianwasteportal.in?subject=Talk%20to%20a%20consultant"
               className="inline-flex items-center justify-center gap-2 text-base font-semibold text-slate-700 px-7 py-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200 hover:bg-white hover:-translate-y-0.5 shadow-sm transition-all">
              <Phone size={18} className="text-ruby-700" /> {t('hero.cta2')}
            </a>
          </div>

          {/* Urgency microcopy under the CTAs */}
          <p className="text-sm font-semibold text-ruby-800 mb-5 flex items-center gap-1.5 justify-center lg:justify-start animate-fade-in"
             style={{ animationDelay: '0.28s' }}>
            <Zap size={14} className="text-brass-dark shrink-0" /> {t('hero.ctaUrgency')}
          </p>

          {/* Trust strip */}
          <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-sm font-medium text-slate-500 animate-fade-in"
               style={{ animationDelay: '0.35s' }}>
            {[
              { icon: BadgeCheck, text: t('hero.trust1') },
              { icon: Lock,       text: t('hero.trust2') },
              { icon: MapPin,     text: t('hero.trust3') },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-1.5">
                <Icon size={15} className="text-emerald-600" /> {text}
              </span>
            ))}
          </div>
        </div>

        {/* ── RIGHT: premium bins visual ───────────── */}
        <div className="relative animate-scale-in">
          {/* glow behind */}
          <div className="absolute inset-6 rounded-[2.5rem] blur-3xl -z-10"
               style={{ background: 'radial-gradient(circle at 50% 40%, rgba(22,101,74,0.18), transparent 70%)' }} />

          <div className="relative glass-frosted rounded-[2rem] p-8 pb-10 shadow-glass-lg border border-white/70">
            {/* ACK chip — floating */}
            <div className="absolute -top-4 -right-3 sm:right-4 flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 shadow-glass border border-emerald-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <BadgeCheck size={17} className="text-emerald-600" />
              </div>
              <div className="leading-tight">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">{t('hero.ack')}</p>
                <p className="text-xs font-mono font-semibold text-slate-700">SWM/BWG-I/…</p>
              </div>
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{t('hero.mandatory')}</p>
            <h3 className="font-display text-xl font-bold text-slate-800 mb-6">{t('hero.fourway')}</h3>

            {/* Dustbins on a soft floor */}
            <div className="relative rounded-2xl px-3 pt-5 pb-4"
                 style={{ background: 'linear-gradient(180deg, rgba(22,101,74,0.04), rgba(22,101,74,0.10))' }}>
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {HERO_BINS.map(({ name, color, icon: Icon }) => (
                  <div key={name} className="bin bin-sm" style={{ '--bin': color }}>
                    <div className="bin-handle" />
                    <div className="bin-lid" />
                    <div className="bin-body">
                      <Icon size={20} className="mx-auto mb-1" strokeWidth={2.3} />
                      <span className="text-[9px] font-extrabold uppercase tracking-wide leading-none block">{t('bin.' + name.toLowerCase())}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Capability pills */}
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-400 w-full mb-0.5">We handle every stream</span>
              {['Solid', 'Wet / Organic', 'Sanitary', 'Hazardous', 'Industrial'].map(t => (
                <span key={t} className="px-3 py-1 rounded-lg text-xs font-semibold text-emerald-800"
                      style={{ background: 'rgba(22,101,74,0.08)' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* small stat chip */}
          <div className="absolute -bottom-4 -left-3 sm:left-6 flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-glass border border-slate-100">
            <Star size={16} className="text-brass-dark" />
            <p className="text-xs text-slate-600"><strong className="text-slate-800">Gazette-mapped</strong> SWM 2026 filing</p>
          </div>
        </div>
      </div>

      {/* Responsibility note */}
      <p className="relative z-10 text-center text-sm text-slate-400 mt-14 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.45s' }}>
        <span className="inline-flex items-center gap-1.5">
          <Lock size={13} />
          Indian Waste Portal is responsible only for your <strong className="text-slate-500 font-semibold">registration</strong> — not for ongoing compliance after the ACK is issued. Independent consultant; not affiliated with CPCB/GPCB.
        </span>
      </p>
    </section>
  );
}

// ── "Any entity with" — BWG threshold band (like official infographic) ──
function ThresholdBand() {
  const { t } = useI18n();
  const CRITERIA = [
    { icon: Building2, tint: '#16654a', soft: 'rgba(22,101,74,0.10)',  label: t('sec.threshold.area'),  value: '≥ 20,000', unit: 'sq.m'  },
    { icon: Droplets,  tint: '#2563eb', soft: 'rgba(37,99,235,0.10)',  label: t('sec.threshold.water'), value: '≥ 40,000', unit: 'L/day' },
    { icon: Truck,     tint: '#16a34a', soft: 'rgba(22,163,74,0.10)',  label: t('sec.threshold.waste'), value: '≥ 100',    unit: 'Kg/day'},
  ];
  return (
    <section className="px-4 pb-10">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-7">
          <span className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-sm font-extrabold uppercase tracking-widest text-white shadow-md"
                style={{ background: 'linear-gradient(135deg, #16654a, #0e3b2e)' }}>
            {t('sec.threshold.any')}
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-stretch justify-center gap-4 md:gap-2">
          {CRITERIA.map((c, idx) => {
            const Icon = c.icon;
            return (
              <Fragment key={c.label}>
                <div className="card-zoom flex-1 bg-white rounded-3xl border border-slate-100 shadow-glass p-7 text-center">
                  <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4"
                       style={{ background: c.soft }}>
                    <Icon size={30} style={{ color: c.tint }} strokeWidth={2.1} />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">{c.label}</p>
                  <p className="font-display text-3xl font-extrabold text-slate-800 leading-none">
                    {c.value}{' '}
                    <span className="text-base font-bold text-slate-400">{c.unit}</span>
                  </p>
                </div>

                {idx < CRITERIA.length - 1 && (
                  <div className="flex items-center justify-center md:px-1">
                    <span className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-black text-white shadow-lg"
                          style={{ background: '#0e3b2e' }}>
                      OR
                    </span>
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        <p className="text-center text-sm text-slate-500 mt-7">{t('sec.threshold.tag')}</p>
      </div>
    </section>
  );
}

// ── What's New in SWM 2026 ───────────────────────────────
function WhatsNew() {
  const changes = [
    {
      icon: Globe,
      tag: 'Universal coverage',
      title: 'Urban AND Rural now covered',
      desc: 'The 2016 Rules covered only urban local bodies. SWM 2026 binds every ULB, Panchayat and Gram Panchayat — every square metre of India.',
    },
    {
      icon: Recycle,
      tag: '4-stream segregation',
      title: 'Four mandatory waste streams',
      desc: 'Wet, Dry, Sanitary and Special-Care waste must now be segregated at source from Day One — up from three streams in 2016.',
    },
    {
      icon: FileText,
      tag: 'Centralised portal',
      title: 'Mandatory registration & returns',
      desc: 'Bulk Waste Generators must register on the CPCB centralised portal, fulfil EBWGR obligations, and file annual returns by 30 June each year.',
    },
    {
      icon: Scale,
      tag: 'Polluter-pays',
      title: 'Environmental Compensation',
      desc: 'Non-compliance now triggers Environmental Compensation (Rule 17) — a fast administrative penalty, plus portal audits and GST cross-checks.',
    },
  ];

  const { t } = useI18n();
  return (
    <section id="whats-new" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{ background: 'rgba(16,185,129,0.10)', color: '#047857' }}>
            <Sparkles size={13} /> Gazette of India · GSR 388(E) · 27 Jan 2026
          </span>
        </div>
        <div className="text-center mb-14">
          <h2 className="font-display text-4xl font-bold text-slate-800 mb-4">{t('sec.new.h')}</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">{t('sec.new.lead')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {changes.map(({ icon: Icon, tag, title, desc }) => (
            <GlassCard key={title} className="p-6 card-zoom" hover={false}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                   style={{ background: 'linear-gradient(135deg, rgba(22, 101, 74,0.12), rgba(22, 101, 74,0.05))' }}>
                <Icon size={22} className="text-ruby-800" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-ruby-700/70 mb-2">{tag}</p>
              <h3 className="font-semibold text-slate-800 mb-2 leading-snug">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Four-Stream Segregation (official colour system) ─────
function Segregation() {
  const { t } = useI18n();
  const streams = [
    { name: t('sec.seg.wet'), bin: 'Green Bin',  color: '#16a34a', soft: 'rgba(22,163,74,0.10)',  icon: Leaf,      eg: 'Kitchen, food, vegetable & flower waste' },
    { name: t('sec.seg.dry'), bin: 'Blue Bin',   color: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: Recycle,   eg: 'Paper, cardboard, plastic, glass, metal' },
    { name: t('sec.seg.san'), bin: 'Red Bin',    color: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: Sparkles,  eg: 'Diapers, sanitary pads, bandages' },
    { name: t('sec.seg.spc'), bin: 'Yellow Bin', color: '#ca8a04', soft: 'rgba(202,138,4,0.12)',  icon: Battery,   eg: 'Batteries, medicines, CFL bulbs, paint cans' },
  ];

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="section-label mb-2">{t('sec.seg.label')}</p>
          <h2 className="font-display text-4xl font-bold text-slate-800 mb-3">{t('sec.seg.h')}</h2>
          <p className="text-slate-500 max-w-xl mx-auto">{t('sec.seg.lead')}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 items-start">
          {streams.map(({ name, bin, color, icon: Icon, eg }) => (
            <div key={name} className="flex flex-col items-center text-center">
              {/* Dustbin (1.5× via CSS max-width) */}
              <div className="bin" style={{ '--bin': color }}>
                <div className="bin-handle" />
                <div className="bin-lid" />
                <div className="bin-body">
                  <Icon size={44} className="mx-auto mb-2.5 drop-shadow" strokeWidth={2.2} />
                  <span className="text-sm font-extrabold uppercase tracking-wider leading-tight block">
                    {name}
                  </span>
                </div>
              </div>

              {/* Caption */}
              <p className="mt-5 text-sm font-bold" style={{ color }}>{bin}</p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed px-2">{eg}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Service Tiles ────────────────────────────────────────
function ServiceTiles({ onEWasteClick }) {
  const { t } = useI18n();
  return (
    <section id="services" className="py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="section-label mb-2">{t('sec.svc.label')}</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-800">{t('sec.svc.h')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ── Solid Waste — ACTIVE ── */}
          <div className="relative group">
            <GlassCard
              variant="frosted"
              className="p-8 tile-active cursor-pointer border border-ruby-800/20"
              hover={false}
            >
              {/* Live badge */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Live & Active</span>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                     style={{ background: 'linear-gradient(135deg, rgba(22, 101, 74,0.12), rgba(22, 101, 74,0.06))' }}>
                  <ShieldCheck size={24} className="text-ruby-800" />
                </div>
              </div>

              <h3 className="font-display text-2xl font-bold text-slate-800 mb-2">
                Solid Waste Management
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Mandatory CPCB / GPCB Bulk Waste Generator registration under SWM Rules 2026.
                Covers residential societies, commercial buildings, institutions and industrial
                sites that cross any one threshold below.
              </p>

              {/* Threshold pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {['≥ 20,000 sqm Floor Area', '≥ 100 kg/day Waste', '≥ 40,000 L/day Water'].map(t => (
                  <span key={t} className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{ background: 'rgba(22, 101, 74,0.08)', color: '#16654a' }}>
                    {t}
                  </span>
                ))}
              </div>

              <Link href="/register" id="solid-waste-tile-cta"
                    className="btn-ruby w-full justify-center gap-2 py-3.5 rounded-xl text-base">
                Start Registration <ArrowRight size={16} />
              </Link>
            </GlassCard>
          </div>

          {/* ── E-Waste — LOCKED ── */}
          <div className="relative group">
            <GlassCard variant="frosted" className="p-8 border border-slate-200/60">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Coming Soon</span>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                     style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <Cpu size={24} className="text-indigo-500" />
                </div>
              </div>

              <h3 className="font-display text-2xl font-bold text-slate-800 mb-2">
                E-Waste Management
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Extended Producer Responsibility (EPR) registration and e-waste channelisation
                compliance under E-Waste Management Rules 2022. Mandates tightening soon.
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {['EPR Registration', 'Channel Partner Mapping', 'Annual Return Filing'].map(t => (
                  <span key={t} className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400"
                        style={{ background: 'rgba(148,163,184,0.12)' }}>
                    {t}
                  </span>
                ))}
              </div>

              <button
                className="w-full py-3.5 rounded-xl text-base font-semibold text-slate-400"
                style={{ background: 'rgba(148,163,184,0.12)', cursor: 'default' }}
                disabled
              >
                Registration Locked
              </button>
            </GlassCard>

            {/* Frosted lock overlay */}
            <div
              className="lock-overlay rounded-2xl"
              onClick={onEWasteClick}
              role="button"
              tabIndex={0}
              id="ewaste-tile-lock"
              onKeyDown={(e) => e.key === 'Enter' && onEWasteClick()}
              aria-label="Join E-Waste waitlist"
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                   style={{ background: 'rgba(255,255,255,0.85)', boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}>
                <Lock size={24} className="text-slate-600" />
              </div>
              <p className="font-semibold text-slate-700 text-center mb-1 px-6">
                E-Waste filing is locked
              </p>
              <p className="text-sm text-slate-500 text-center mb-4 px-8">
                Mandates are tightening. Pre-book your <strong>20% early-access discount.</strong>
              </p>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white"
                   style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                <Mail size={14} />
                Get Early Access
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── How It Works ─────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: '01', icon: TrendingUp, title: 'Check Eligibility',     desc: 'Enter your floor area, daily waste and water use. Our calculator instantly checks if you qualify as a Bulk Waste Generator under SWM 2026.' },
    { n: '02', icon: Globe,      title: 'Complete Registration',  desc: 'Add your organisation details, category and LGD-verified address. Our multi-step form validates everything in real time.' },
    { n: '03', icon: CheckCircle,title: 'Pay Consultation Fee',   desc: 'Secure checkout. Our compliance team reviews your submission and prepares the CPCB centralised-portal payload.' },
    { n: '04', icon: Zap,        title: 'Auto-Filing & ACK',     desc: 'Our agent files on the CPCB SWM portal, pauses for your mobile OTP, and returns the Acknowledgement Number to your dashboard.' },
  ];

  const { t } = useI18n();
  return (
    <section id="how-it-works" className="py-20 px-4 bg-white/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="section-label mb-3">{t('sec.how.label')}</p>
          <h2 className="font-display text-4xl font-bold text-slate-800 mb-4">{t('sec.how.h')}</h2>
          <p className="text-slate-500 max-w-xl mx-auto">{t('sec.how.lead')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <GlassCard key={s.n} className="p-6 card-zoom" hover={false}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-display text-5xl font-bold text-ruby-800/15">{s.n}</span>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                       style={{ background: 'rgba(22, 101, 74,0.08)' }}>
                    <Icon size={18} className="text-ruby-800" />
                  </div>
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Compliance Deadlines ─────────────────────────────────
function Deadlines() {
  const { t } = useI18n();
  const dates = [
    { date: '1 Apr 2026',  label: 'SWM Rules 2026 in force — 4-stream segregation begins',  tone: '#16654a' },
    { date: '30 Jun',      label: 'Annual returns due on the centralised portal (yearly)',   tone: '#a16207' },
    { date: '1 Oct 2027',  label: 'Full compliance deadline — million-plus cities',          tone: '#1d4ed8' },
    { date: 'Ongoing',     label: 'Environmental Compensation for any non-compliance',        tone: '#047857' },
  ];
  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-3xl p-8 md:p-10 border border-ruby-200/60"
             style={{ background: 'linear-gradient(135deg, rgba(22, 101, 74,0.04), rgba(248,249,252,0.6))' }}>
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                 style={{ background: 'rgba(22, 101, 74,0.10)' }}>
              <Clock size={22} className="text-ruby-800" />
            </div>
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-slate-800">{t('sec.dead.h')}</h2>
              <p className="text-slate-500 mt-1">{t('sec.dead.lead')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dates.map(d => (
              <div key={d.label} className="flex items-center gap-4 bg-white/70 backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/70">
                <span className="font-display font-bold text-lg shrink-0 w-24" style={{ color: d.tone }}>{d.date}</span>
                <span className="text-sm text-slate-600 leading-snug">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Stats Banner ─────────────────────────────────────────
function StatsBanner() {
  const stats = [
    { value: '4',     label: 'Waste streams handled' },
    { value: '24 hr', label: 'Consultant callback'   },
    { value: '100%',  label: 'SWM 2026 aligned'      },
    { value: '₹0',    label: 'Hidden charges'        },
  ];
  return (
    <section className="py-14 px-4">
      <div className="max-w-5xl mx-auto glass-frosted rounded-3xl px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <p className="font-display text-4xl font-bold text-ruby-800 mb-1">{s.value}</p>
              <p className="text-sm text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Why Trust Us ─────────────────────────────────────────
function WhyTrust() {
  const { t } = useI18n();
  const points = [
    { icon: BadgeCheck, title: 'Built on the actual Gazette', desc: 'Every threshold, form and deadline on this platform is mapped to the notified SWM Rules 2026 (GSR 388(E)).' },
    { icon: Lock,       title: 'OTP stays with you',          desc: 'Our agent pauses on the CPCB portal and asks YOU for the OTP sent to your mobile. We never submit without your verification.' },
    { icon: Users,      title: 'Middleware, not a middleman', desc: 'We are an independent compliance consultant. We do the paperwork; you stay in control of your registration.' },
  ];
  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="section-label mb-2">{t('sec.why.label')}</p>
          <h2 className="font-display text-4xl font-bold text-slate-800">{t('sec.why.h')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {points.map(({ icon: Icon, title, desc }) => (
            <GlassCard key={title} className="p-7 card-zoom" hover={false}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                   style={{ background: 'rgba(16,185,129,0.10)' }}>
                <Icon size={22} className="text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────
function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-slate-200/60 py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #16654a, #0e3b2e)' }}>
            <ShieldCheck size={13} className="text-white" />
          </div>
          <span className="font-display font-bold text-slate-700">
            Indian Waste<span className="text-ruby-800">Portal</span>
          </span>
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
          <a href="/legal/privacy" className="hover:text-slate-600 transition-colors">{t('footer.privacy')}</a>
          <a href="/legal/terms" className="hover:text-slate-600 transition-colors">{t('footer.terms')}</a>
          <a href="/legal/refund" className="hover:text-slate-600 transition-colors">{t('footer.refund')}</a>
          <a href="/legal/contact" className="hover:text-slate-600 transition-colors">{t('footer.contact')}</a>
          <a href="/find" className="hover:text-slate-600 transition-colors">{t('footer.track')}</a>
          <a href="mailto:hello@indianwasteportal.in" className="hover:text-slate-600 transition-colors flex items-center gap-1">
            <Mail size={12} />hello@indianwasteportal.in
          </a>
        </div>

        <div className="text-center md:text-right">
          <LanguageSwitcher className="justify-center md:justify-end mb-2" />
          <p className="text-xs text-slate-400">
            © 2026 Indian Waste Portal. {t('footer.tagline')}<br />
            {t('footer.notaffil')}
          </p>
        </div>
      </div>
    </footer>
  );
}

// ── Page ─────────────────────────────────────────────────
export default function HomePage() {
  const [showEWasteModal, setShowEWasteModal] = useState(false);

  return (
    <div className="min-h-screen page-transition">
      <Header />
      <main>
        <Hero />
        <HeroSlider />
        <PreScreenWizard />
        <ThresholdBand />
        <WhatsNew />
        <Segregation />
        <ServiceTiles onEWasteClick={() => setShowEWasteModal(true)} />
        <HowItWorks />
        <Deadlines />
        <StatsBanner />
        <WhyTrust />
        <CapabilityMosaic />
        <PricingSection />
      </main>
      <Footer />
      <EWasteModal isOpen={showEWasteModal} onClose={() => setShowEWasteModal(false)} />
    </div>
  );
}
