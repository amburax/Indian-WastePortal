'use client';
import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import {
  ShieldCheck, Cpu, Lock, ArrowRight, ArrowLeft, ChevronDown,
  Shield, Zap, CheckCircle, Globe, Phone, Mail,
  Star, TrendingUp, AlertTriangle, Recycle, Leaf,
  Calendar, Scale, MapPin, FileText, Landmark, Battery,
  Sparkles, Building2, Clock, Users, BadgeCheck,
  Droplets, Truck, Menu, X
} from 'lucide-react';
import PricingSection from '../../components/PricingSection';
import EWasteModal   from '../../components/EWasteModal';
import LoginModal    from '../../components/LoginModal';
import GlassCard     from '../../components/GlassCard';
import PreScreenWizard from '../../components/PreScreenWizard';
import CapabilityMosaic from '../../components/CapabilityMosaic';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import FullscreenHero from '../../components/FullscreenHero';
import { useI18n } from '../../lib/i18n';

// ── Top Urgency Banner ────────────────────────────────────
function TopAlertBanner() {
  const { t } = useI18n();
  // Real days to the next annual-return deadline (30 June), computed client-side
  // to stay accurate — no hardcoded/stale number.
  const [days, setDays] = useState(null);
  useEffect(() => {
    const now = new Date();
    let due = new Date(now.getFullYear(), 5, 30);
    if (due < now) due = new Date(now.getFullYear() + 1, 5, 30);
    setDays(Math.max(0, Math.ceil((due - now) / 86_400_000)));
  }, []);
  return (
    <div id="top-alert-banner" className="w-full bg-[#831818] text-white/90 text-xs font-bold py-2.5 px-4 flex items-center justify-center gap-3 relative z-50 shadow-md">
      <div className="w-2 h-2 bg-ruby-400 rounded-full animate-pulse shrink-0" />
      <span className="text-center sm:text-left">
        <span dangerouslySetInnerHTML={{ __html: t('pg.alert.force') }} />
      </span>
      {days != null && (
        <>
          <span className="hidden lg:inline mx-1 opacity-40">|</span>
          <span className="hidden lg:inline text-ruby-200">{t('pg.alert.due').replace('{days}', days)}</span>
        </>
      )}
      <Link href="/register" className="hidden sm:inline-flex ml-2 bg-white text-ruby-900 px-4 py-1.5 rounded-full hover:bg-ruby-50 transition-colors shadow-sm">
        {t('pg.alert.reg')}
      </Link>
    </div>
  );
}

// ── Header ──────────────────────────────────────────────
function Header({ onLogin }) {
  const { t } = useI18n();
  const [authed, setAuthed] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bannerH, setBannerH] = useState(44);
  useEffect(() => { fetch('/api/account/me', { cache: 'no-store' }).then(r => setAuthed(r.ok)).catch(() => setAuthed(false)); }, []);
  // Sticky, scroll-aware: transparent over the hero at rest, solid bar once scrolled
  // (so the navbar stays visible everywhere and the white text stays readable).
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // Sit the navbar exactly below the alert banner, whatever its height is.
  // The banner wraps to 2 lines on small screens, so a hardcoded offset overlaps it.
  useEffect(() => {
    const measure = () => {
      const el = document.getElementById('top-alert-banner');
      if (el) setBannerH(el.offsetHeight);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  const NAV = [
    { href: '#whats-new', label: t('pg.nav.swm') },
    { href: '#services', label: t('nav.services') },
    { href: '#how-it-works', label: t('nav.how') },
    { href: '#pricing', label: t('nav.pricing') },
  ];
  return (
    <header style={{ top: scrolled ? 0 : bannerH }} className={`fixed w-full z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-[#0e3b2e]/95 backdrop-blur-md shadow-lg border-b border-white/10'
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-3">
        {/* Back to platform home + Logo */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <Link href="/" aria-label="Back to home"
                className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 text-white/85 hover:text-white hover:bg-white/10 text-xs font-semibold px-2.5 py-1.5 transition-colors">
            <ArrowLeft size={14} /><span className="hidden lg:inline">Home</span>
          </Link>
          <div className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <span className="font-display text-lg sm:text-xl font-bold text-white tracking-tight drop-shadow-md whitespace-nowrap">
            Indian Waste<span className="text-[#c8a24b]">Portal</span>
          </span>
        </div>

        {/* Nav (desktop) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-white/90 drop-shadow-sm">
          {NAV.map(n => <a key={n.href} href={n.href} className="hover:text-white transition-colors">{n.label}</a>)}
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <LanguageSwitcher dark className="hidden sm:inline-flex text-white border-white/20 hover:bg-white/10" />
          {authed
            ? <Link href="/dashboard" id="header-register-btn" className="bg-[#fde08b] text-slate-900 text-xs sm:text-sm font-bold px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:bg-[#c8a24b] transition-colors shadow-lg whitespace-nowrap">{t('pg.nav.dash')}</Link>
            : (
              <>
                <button type="button" onClick={onLogin} className="text-white text-sm font-bold hover:text-white/80 drop-shadow-md hidden sm:block">{t('pg.nav.login')}</button>
                <Link href="/register" className="bg-[#fde08b] text-slate-900 text-xs sm:text-sm font-bold px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:bg-[#c8a24b] transition-colors shadow-lg whitespace-nowrap">{t('pg.nav.start')}</Link>
              </>
            )}
          <button onClick={() => setMenuOpen(v => !v)} aria-label={t('pg.aria.menu')}
            className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-white bg-white/10 backdrop-blur-md border border-white/20">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/20 bg-slate-900/95 backdrop-blur-xl absolute w-full left-0">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-2 text-sm font-semibold text-white/80">
            {NAV.map(n => (
              <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-xl hover:bg-white/10 hover:text-white">{n.label}</a>
            ))}
            <div className="h-px bg-white/10 my-2" />
            <button type="button" onClick={() => { setMenuOpen(false); onLogin?.(); }} className="text-left px-3 py-2.5 rounded-xl hover:bg-white/10 hover:text-white">{t('pg.nav.login')}</button>
            <Link href="/register" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-xl bg-[#c8a24b] text-slate-900 font-bold text-center mt-2">{t('pg.nav.start')}</Link>
            <div className="px-3 pt-4 pb-2"><LanguageSwitcher dark className="text-white w-full justify-center" /></div>
          </nav>
        </div>
      )}
    </header>
  );
}

// ── Ticker Tape ──────────────────────────────────────────
function TickerTape() {
  const { t } = useI18n();
  // Honest, factual ticker — no fabricated counts or "live activity".
  const items = [
    t('pg.tick.1'),
    t('pg.tick.2'),
    t('pg.tick.3'),
    t('pg.tick.4'),
    t('pg.tick.5'),
    t('pg.tick.6'),
  ];
  return (
    <div className="w-full bg-[#16654a] text-white/90 text-[11px] font-semibold py-2.5 overflow-hidden flex items-center shadow-inner relative z-20">
      <div className="animate-marquee whitespace-nowrap flex gap-8">
        {[...items, ...items].map((s, i) => (
          <span key={i} className="flex items-center gap-2 shrink-0">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── "Any entity with" — BWG threshold band (like official infographic) ──
function ThresholdBand() {
  const { t } = useI18n();
  const CRITERIA = [
    { icon: Building2, tint: '#16654a', soft: 'rgba(22,101,74,0.10)',  label: t('sec.threshold.area'),  value: '≥ 20,000', unit: t('pg.unit.sqm')  },
    { icon: Droplets,  tint: '#2563eb', soft: 'rgba(37,99,235,0.10)',  label: t('sec.threshold.water'), value: '≥ 40,000', unit: t('pg.unit.lday') },
    { icon: Truck,     tint: '#16a34a', soft: 'rgba(22,163,74,0.10)',  label: t('sec.threshold.waste'), value: '≥ 100',    unit: t('pg.unit.kgday')},
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
                          style={{ background: '#0e3b2e' }}>{t('pg.thresh.or')}</span>
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
  const { t } = useI18n();
  const changes = [
    { icon: Globe, tag: t('pg.nw.t1.tag'), title: t('pg.nw.t1.title'), desc: t('pg.nw.t1.desc') },
    { icon: Recycle, tag: t('pg.nw.t2.tag'), title: t('pg.nw.t2.title'), desc: t('pg.nw.t2.desc') },
    { icon: FileText, tag: t('pg.nw.t3.tag'), title: t('pg.nw.t3.title'), desc: t('pg.nw.t3.desc') },
    { icon: Scale, tag: t('pg.nw.t4.tag'), title: t('pg.nw.t4.title'), desc: t('pg.nw.t4.desc') },
  ];

  return (
    <section id="whats-new" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{ background: 'rgba(16,185,129,0.10)', color: '#047857' }}>
            <Sparkles size={13} /> {t('pg.nw.gazette')}
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
    { name: t('sec.seg.wet'), bin: t('pg.seg.b1'),  color: '#16a34a', soft: 'rgba(22,163,74,0.10)',  icon: Leaf,      eg: t('pg.seg.e1') },
    { name: t('sec.seg.dry'), bin: t('pg.seg.b2'),   color: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: Recycle,   eg: t('pg.seg.e2') },
    { name: t('sec.seg.san'), bin: t('pg.seg.b3'),    color: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: Sparkles,  eg: t('pg.seg.e3') },
    { name: t('sec.seg.spc'), bin: t('pg.seg.b4'), color: '#ca8a04', soft: 'rgba(202,138,4,0.12)',  icon: Battery,   eg: t('pg.seg.e4') },
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
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{t('pg.svc.live')}</span>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                     style={{ background: 'linear-gradient(135deg, rgba(22, 101, 74,0.12), rgba(22, 101, 74,0.06))' }}>
                  <ShieldCheck size={24} className="text-ruby-800" />
                </div>
              </div>

              <h3 className="font-display text-2xl font-bold text-slate-800 mb-2">
                {t('pg.svc.s1')}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                {t('pg.svc.d1')}
              </p>

              {/* Threshold pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {[t('pg.svc.t1'), t('pg.svc.t2'), t('pg.svc.t3')].map(t => (
                  <span key={t} className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{ background: 'rgba(22, 101, 74,0.08)', color: '#16654a' }}>
                    {t}
                  </span>
                ))}
              </div>

              <Link href="/register" id="solid-waste-tile-cta"
                    className="btn-ruby w-full justify-center gap-2 py-3.5 rounded-xl text-base">
                {t('pg.svc.reg')} <ArrowRight size={16} />
              </Link>
            </GlassCard>
          </div>

          {/* ── E-Waste — LOCKED ── */}
          <div className="relative group">
            <GlassCard variant="frosted" className="p-8 border border-slate-200/60">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">{t('pg.svc.soon')}</span>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                     style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <Cpu size={24} className="text-indigo-500" />
                </div>
              </div>

              <h3 className="font-display text-2xl font-bold text-slate-800 mb-2">{t('pg.svc.s2')}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                {t('pg.svc.d2')}
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {[t('pg.svc.p1'), t('pg.svc.p2'), t('pg.svc.p3')].map(t => (
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
              >{t('pg.svc.lock1')}</button>
            </GlassCard>

            {/* Frosted lock overlay */}
            <div
              className="lock-overlay rounded-2xl"
              onClick={onEWasteClick}
              role="button"
              tabIndex={0}
              id="ewaste-tile-lock"
              onKeyDown={(e) => e.key === 'Enter' && onEWasteClick()}
              aria-label={t('pg.aria.ewaste')}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                   style={{ background: 'rgba(255,255,255,0.85)', boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}>
                <Lock size={24} className="text-slate-600" />
              </div>
              <p className="font-semibold text-slate-700 text-center mb-1 px-6">
                {t('pg.svc.lock2')}
              </p>
              <p className="text-sm text-slate-500 text-center mb-4 px-8">
                <span dangerouslySetInnerHTML={{ __html: t('pg.svc.lock3') }} />
              </p>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white"
                   style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                <Mail size={14} />
                {t('pg.svc.early')}
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
  const { t } = useI18n();
  const steps = [
    { n: '01', icon: TrendingUp, title: t('pg.hw.t1'), desc: t('pg.hw.d1') },
    { n: '02', icon: Globe,      title: t('pg.hw.t2'), desc: t('pg.hw.d2') },
    { n: '03', icon: CheckCircle,title: t('pg.hw.t3'), desc: t('pg.hw.d3') },
    { n: '04', icon: Zap,        title: t('pg.hw.t4'), desc: t('pg.hw.d4') },
  ];

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
    { date: t('pg.dl.d1'), label: t('pg.dl.l1'), tone: '#16654a' },
    { date: t('pg.dl.d2'), label: t('pg.dl.l2'), tone: '#a16207' },
    { date: t('pg.dl.d3'), label: t('pg.dl.l3'), tone: '#1d4ed8' },
    { date: t('pg.dl.d4'), label: t('pg.dl.l4'), tone: '#047857' },
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
  const { t } = useI18n();
  const stats = [
    { value: t('pg.st.v1'), label: t('pg.st.l1') },
    { value: t('pg.st.v2'), label: t('pg.st.l2') },
    { value: t('pg.st.v3'), label: t('pg.st.l3') },
    { value: t('pg.st.v4'), label: t('pg.st.l4') },
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
    { icon: BadgeCheck, title: t('pg.why.t1'), desc: t('pg.why.d1') },
    { icon: Lock,       title: t('pg.why.t2'), desc: t('pg.why.d2') },
    { icon: Users,      title: t('pg.why.t3'), desc: t('pg.why.d3') },
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
          <a href="mailto:indianwasteportal@gmail.com" className="hover:text-slate-600 transition-colors flex items-center gap-1">
            <Mail size={12} />indianwasteportal@gmail.com
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
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="min-h-screen page-transition">
      <TopAlertBanner />
      <Header onLogin={() => setShowLogin(true)} />
      <main>
        <FullscreenHero />
        <TickerTape />
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
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
}
