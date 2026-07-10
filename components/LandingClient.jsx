'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck, ArrowRight, Lock, Recycle, Package, Cpu, Syringe,
  Battery, Droplet, Disc, Building2, Repeat, ClipboardCheck,
  Target, Trophy, Globe, Phone, Mail, Sparkles, AlertTriangle, Layers,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import LanguageSwitcher from './LanguageSwitcher';

// A circular category badge. Shows a real photo when one exists at `img`
// (drop files into /public/waste/<key>.jpg) and cleanly falls back to the icon.
function CategoryCircle({ img, Icon, live }) {
  const [broken, setBroken] = useState(false);
  const showImg = img && !broken;
  return (
    <div
      className={`relative w-32 h-32 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full overflow-hidden flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${live ? 'ring-4 ring-[#c8a24b]/70' : 'ring-2 ring-slate-200'}`}
      style={showImg ? undefined : { background: live ? 'linear-gradient(135deg,#16654a,#0e3b2e)' : 'linear-gradient(135deg,#eef2f0,#cbd5e1)' }}
    >
      {showImg ? (
        <img src={img} alt="" onError={() => setBroken(true)} loading="lazy" decoding="async"
             className={`w-full h-full object-cover ${live ? '' : 'grayscale'}`} />
      ) : (
        <Icon size={54} className={live ? 'text-white' : 'text-slate-400'} />
      )}
      {!live && (
        <div className="absolute inset-0 bg-slate-900/35 flex items-center justify-center">
          <Lock size={18} className="text-white/90" />
        </div>
      )}
    </div>
  );
}

export default function LandingClient() {
  const { t } = useI18n();

  // Categories CPCB governs. Solid Waste is live; the rest are on the roadmap.
  // `img` points at /public/waste/<key>.jpg — add those photos anytime and they
  // appear automatically; until then a clean icon circle shows.
  const CATEGORIES = [
    { key: 'solid',   name: t('land.cat.solid'),   rule: 'SWM Rules, 2016 / 2026',    icon: Recycle,   href: '/solid-waste', live: true, img: '/mosaic/mrf.webp',   blurb: t('land.cat.solidBlurb') },
    { key: 'plastic', name: t('land.cat.plastic'), rule: 'Plastic Waste Rules · EPR', icon: Package,   img: '/waste/plastic.webp',    blurb: t('land.cat.plasticBlurb') },
    { key: 'ewaste',  name: t('land.cat.ewaste'),  rule: 'E-Waste Rules · EPR',       icon: Cpu,       img: '/waste/ewaste.webp',     blurb: t('land.cat.ewasteBlurb') },
    { key: 'biomed',  name: t('land.cat.biomed'),  rule: 'BMW Rules, 2016',           icon: Syringe,   img: '/waste/biomedical.webp', blurb: t('land.cat.biomedBlurb') },
    { key: 'battery', name: t('land.cat.battery'), rule: 'Battery Waste Rules · EPR', icon: Battery,   img: '/waste/battery.webp',    blurb: t('land.cat.batteryBlurb') },
    { key: 'oil',     name: t('land.cat.oil'),     rule: 'Hazardous Waste Rules',     icon: Droplet,   img: '/waste/oil.webp',        blurb: t('land.cat.oilBlurb') },
    { key: 'tyre',    name: t('land.cat.tyre'),    rule: 'EPR for Waste Tyres',       icon: Disc,      img: '/waste/tyre.webp',       blurb: t('land.cat.tyreBlurb') },
    { key: 'cnd',     name: t('land.cat.cnd'),     rule: 'C&D Waste Rules, 2016',     icon: Building2, img: '/waste/cnd.webp',        blurb: t('land.cat.cndBlurb') },
    { key: 'hazard',  name: t('land.cat.hazard'),  rule: 'Hazardous Waste Rules, 2016', icon: AlertTriangle, img: '/waste/hazardous.webp', blurb: t('land.cat.hazardBlurb') },
    { key: 'metal',   name: t('land.cat.metal'),   rule: 'Metal Recycling Compliance', icon: Layers,   img: '/waste/nonferrous.webp', blurb: t('land.cat.metalBlurb') },
  ];

  const GOALS = [
    { icon: Target, title: t('land.goal1t'), body: t('land.goal1b') },
    { icon: Trophy, title: t('land.goal2t'), body: t('land.goal2b') },
    { icon: Globe,  title: t('land.goal3t'), body: t('land.goal3b') },
  ];

  const STEPS = [
    { n: '01', title: t('land.how.s1t'), desc: t('land.how.s1d') },
    { n: '02', title: t('land.how.s2t'), desc: t('land.how.s2d') },
    { n: '03', title: t('land.how.s3t'), desc: t('land.how.s3d') },
    { n: '04', title: t('land.how.s4t'), desc: t('land.how.s4d') },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8f6] text-slate-800">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#0e3b2e]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center bg-white/10 border border-white/20">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <span className="font-display text-lg font-bold text-white tracking-tight whitespace-nowrap">
              Indian Waste<span className="text-[#c8a24b]">Portal</span>
            </span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <nav className="flex items-center gap-4 sm:gap-6 text-sm font-semibold text-white/85">
              <a href="#services" className="hover:text-white transition-colors">{t('land.nav.services')}</a>
              <a href="#how" className="hover:text-white transition-colors hidden sm:inline">{t('land.nav.how')}</a>
              <a href="#mission" className="hover:text-white transition-colors">{t('land.nav.mission')}</a>
            </nav>
            <LanguageSwitcher dark className="text-white border-white/20 hover:bg-white/10" />
          </div>
        </div>
      </header>

      {/* ── Hero — centered, full-bleed ────────────────────── */}
      <section className="relative">
        <div className="absolute inset-0 overflow-hidden">
          <img src="/mosaic/fleet.webp" alt=""
               className="w-full h-full object-cover blur-[5px] scale-110" />
          {/* base tint keeps the photo visible; centered scrim makes the text razor-sharp */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-[#0b2c22]/65" />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 45%, rgba(0,0,0,0.45), transparent 75%)' }} />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-14 md:py-20 text-center">
          <span className="inline-flex items-center gap-3 px-5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-[0.25em] text-[#fde08b] border border-[#c8a24b]/40 bg-white/5 backdrop-blur-sm">
            <span className="hidden sm:inline w-6 h-px bg-[#c8a24b]/50" />
            {t('land.hero.badge')}
            <span className="hidden sm:inline w-6 h-px bg-[#c8a24b]/50" />
          </span>

          <h1 className="mt-8 font-display text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.02] text-balance drop-shadow">
            Indian Waste Portal
          </h1>
          <p className="mt-4 text-2xl sm:text-3xl font-display font-bold text-[#fde08b]">
            {t('land.hero.tagline')}
          </p>
          <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-white/80 leading-relaxed">
            {t('land.hero.desc')}
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a href="#services"
               className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-slate-900 shadow-xl hover:-translate-y-0.5 transition-transform"
               style={{ background: 'linear-gradient(to right, #fde08b, #c8a24b)' }}>
              {t('land.hero.cta1')} <ArrowRight size={18} />
            </a>
            <a href="#how"
               className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white bg-white/10 border border-white/25 hover:bg-white/15 backdrop-blur-sm transition-colors">
              {t('land.hero.cta2')}
            </a>
          </div>
        </div>
      </section>

      {/* ── Two core capabilities ──────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 -mt-10 relative z-10">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-1.5">
              <Repeat size={18} className="text-[#16654a]" />
              <h3 className="font-bold text-slate-800">{t('land.cap.exchange')}</h3>
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{t('land.badge.soon')}</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">{t('land.cap.exchangeDesc')}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-1.5">
              <ClipboardCheck size={18} className="text-[#16654a]" />
              <h3 className="font-bold text-slate-800">{t('land.cap.compliance')}</h3>
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{t('land.badge.live')}</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">{t('land.cap.complianceDesc')}</p>
          </div>
        </div>
      </section>

      {/* ── Services / categories (circular) ───────────────── */}
      <section id="services" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#16654a]">{t('land.svc.eyebrow')}</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-[#0e3b2e] text-balance">{t('land.svc.h')}</h2>
          <p className="mt-3 text-slate-600">{t('land.svc.desc')}</p>
        </div>

        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
          {CATEGORIES.map(({ key, name, rule, icon: Icon, href, live, img }) => {
            const inner = (
              <>
                <CategoryCircle img={img} Icon={Icon} live={live} />
                <h3 className={`mt-4 font-bold text-sm sm:text-base ${live ? 'text-slate-800' : 'text-slate-500'}`}>{name}</h3>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-0.5">{rule}</p>
                {live ? (
                  <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{t('land.badge.live')}</span>
                ) : (
                  <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                    <Lock size={10} /> {t('land.svc.soon')}
                  </span>
                )}
              </>
            );
            return live ? (
              <Link key={key} href={href} className="group flex flex-col items-center text-center">
                {inner}
              </Link>
            ) : (
              <div key={key} className="group flex flex-col items-center text-center cursor-not-allowed select-none">
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section id="how" className="bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
          <p className="text-xs font-bold uppercase tracking-widest text-[#16654a]">{t('land.how.eyebrow')}</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-[#0e3b2e]">{t('land.how.h')}</h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <div className="font-display text-3xl font-black text-[#c8a24b]">{s.n}</div>
                <h3 className="mt-2 font-bold text-slate-800">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission ────────────────────────────────────────── */}
      <section id="mission" className="relative bg-[#0e3b2e] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.15]" style={{ background: 'radial-gradient(700px 300px at 80% 0%, #c8a24b, transparent 60%)' }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <p className="text-xs font-bold uppercase tracking-widest text-[#fde08b]">{t('land.mission.eyebrow')}</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-balance max-w-2xl">{t('land.mission.h')}</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {GOALS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-xl bg-[#c8a24b]/20 flex items-center justify-center mb-4">
                  <Icon size={22} className="text-[#fde08b]" />
                </div>
                <h3 className="font-display text-xl font-bold">{title}</h3>
                <p className="mt-2 text-sm text-white/70 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 md:p-12 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0e3b2e] text-balance">{t('land.cta.h')}</h2>
          <p className="mt-3 max-w-xl mx-auto text-slate-600">{t('land.cta.desc')}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/solid-waste"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-slate-900 shadow-lg hover:-translate-y-0.5 transition-transform"
                  style={{ background: 'linear-gradient(to right, #fde08b, #c8a24b)' }}>
              {t('land.cta.btn1')} <ArrowRight size={18} />
            </Link>
            <Link href="/login"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-[#0e3b2e] bg-white border border-slate-200 hover:border-[#16654a]/40 transition-colors">
              {t('land.cta.btn2')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="bg-[#0b2c22] text-white/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#c8a24b]" />
              <span className="font-display text-base font-bold text-white">Indian Waste<span className="text-[#c8a24b]">Portal</span></span>
            </div>
            <p className="mt-3 text-sm leading-relaxed">{t('land.foot.tagline')}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">{t('land.foot.services')}</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/solid-waste" className="hover:text-white">{t('land.foot.solidLive')}</Link></li>
              <li><span className="text-white/40">{t('land.foot.moreSoon')}</span></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">{t('land.foot.account')}</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-white">{t('land.foot.login')}</Link></li>
              <li><Link href="/find" className="hover:text-white">{t('land.foot.find')}</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">{t('land.foot.legal')}</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/legal/terms" className="hover:text-white">{t('land.foot.terms')}</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-white">{t('land.foot.privacy')}</Link></li>
              <li><a href="mailto:indianwasteportal@gmail.com" className="inline-flex items-center gap-1.5 hover:text-white break-all"><Mail size={13} className="shrink-0" /> indianwasteportal@gmail.com</a></li>
              <li><a href="tel:+919054047272" className="inline-flex items-center gap-1.5 hover:text-white"><Phone size={13} /> +91 90540 47272</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-xs text-white/40">{t('land.foot.copyright')}</p>
        </div>
      </footer>
    </div>
  );
}
