'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2, Recycle, Calendar, FileText, ChevronLeft, ChevronRight,
  CheckCircle, ArrowRight,
} from 'lucide-react';

/**
 * Carousel — auto-rotating informational slides for the homepage.
 * Starter content is built from the official SWM Rules 2026 material.
 * Swap the SLIDES array to use your own copy.
 */
const SLIDES = [
  {
    icon: Building2,
    accent: '#16654a',
    soft: 'rgba(22, 101, 74,0.08)',
    eyebrow: 'Who must register',
    title: 'Are you a Bulk Waste Generator?',
    body: 'Under SWM Rules 2026, any entity that crosses even one threshold must register on the CPCB portal.',
    points: ['Floor area ≥ 20,000 sq.m', 'Waste ≥ 100 kg/day', 'Water ≥ 40,000 L/day'],
    foot: 'Societies · Hotels · Hospitals · Malls · Industries · Campuses',
  },
  {
    icon: Recycle,
    accent: '#16a34a',
    soft: 'rgba(22,163,74,0.08)',
    eyebrow: 'Segregate at source',
    title: 'Four mandatory waste streams',
    body: 'From 1 April 2026 every premises must separate waste into four colour-coded streams.',
    points: ['Wet (Green)', 'Dry (Blue)', 'Sanitary (Red)', 'Special Care (Yellow)'],
    foot: 'Non-segregation can attract Environmental Compensation.',
  },
  {
    icon: Calendar,
    accent: '#1d4ed8',
    soft: 'rgba(29,78,216,0.08)',
    eyebrow: 'Key deadlines',
    title: 'The clock is already running',
    body: 'SWM 2026 created legal obligations, not aspirations. Don’t wait for an audit notice.',
    points: ['1 Apr 2026 — Rules in force', '30 Jun — Annual returns (yearly)', 'Ongoing — Environmental Compensation'],
    foot: 'Million-plus cities: full compliance by 1 Oct 2027.',
  },
  {
    icon: FileText,
    accent: '#a16207',
    soft: 'rgba(161,98,7,0.10)',
    eyebrow: 'What you need',
    title: 'Register in minutes — keep this handy',
    body: 'Have these ready and our agent files everything on the CPCB SWM portal for you.',
    points: ['Organisation & authorised person', 'Official email + 10-digit mobile (for OTP)', 'Category & LGD-verified address'],
    foot: 'We pause and ask YOU for the OTP — your registration stays in your control.',
  },
];

export default function Carousel() {
  const [i, setI] = useState(0);
  const n = SLIDES.length;

  const go   = useCallback((d) => setI((p) => (p + d + n) % n), [n]);
  const goTo = (idx) => setI(idx);

  // Auto-advance every 6s
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % n), 6000);
    return () => clearInterval(t);
  }, [n]);

  const s = SLIDES[i];
  const Icon = s.icon;

  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="relative glass-frosted rounded-3xl overflow-hidden shadow-glass-lg">
          {/* Accent top bar */}
          <div className="h-1.5 w-full transition-colors duration-500" style={{ background: s.accent }} />

          <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 md:p-12 animate-fade-in">
            {/* Left — text */}
            <div>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                   style={{ background: s.soft }}>
                <Icon size={26} style={{ color: s.accent }} />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: s.accent }}>
                {s.eyebrow}
              </p>
              <h3 className="font-display text-3xl font-bold text-slate-800 mb-3 leading-tight">
                {s.title}
              </h3>
              <p className="text-slate-500 leading-relaxed mb-5">{s.body}</p>
              <p className="text-xs text-slate-400 italic">{s.foot}</p>
            </div>

            {/* Right — points */}
            <div className="flex flex-col justify-center gap-3">
              {s.points.map((p) => (
                <div key={p} className="flex items-center gap-3 bg-white/70 rounded-2xl px-5 py-4 border border-white/70">
                  <CheckCircle size={18} style={{ color: s.accent }} className="shrink-0" />
                  <span className="text-sm font-semibold text-slate-700">{p}</span>
                </div>
              ))}
              <Link href="/register"
                    className="btn-ruby justify-center gap-2 py-3 rounded-2xl text-sm mt-2">
                Start Your Registration <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between px-8 md:px-12 pb-6">
            <div className="flex gap-2">
              {SLIDES.map((_, idx) => (
                <button key={idx} onClick={() => goTo(idx)} aria-label={`Slide ${idx + 1}`}
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: idx === i ? 26 : 8,
                          background: idx === i ? s.accent : 'rgba(148,163,184,0.4)',
                        }} />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => go(-1)} aria-label="Previous"
                      className="w-9 h-9 rounded-full bg-white/70 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:shadow-md transition-all">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => go(1)} aria-label="Next"
                      className="w-9 h-9 rounded-full bg-white/70 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:shadow-md transition-all">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
