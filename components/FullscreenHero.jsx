'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, ChevronLeft, ChevronRight, Activity, Clock } from 'lucide-react';
import { useI18n } from '../lib/i18n';

const SLIDES = [
  {
    id: 'liability',
    image: '/mosaic/fleet.webp',
    badge: 'RULE 6 • ARE YOU A BWG?',
    headline: 'One threshold is all it takes to be liable.',
    metrics: [
      { value: '≥ 20,000', unit: 'sq.m', label: 'Built-up area' },
      { value: '≥ 40,000', unit: 'L/day', label: 'Water use' },
      { value: '≥ 100', unit: 'kg/day', label: 'Waste output' },
    ],
    cta: 'Run the 60-second eligibility check',
    ctaLink: '#eligibility-check',
    countdown: true,
  },
  {
    id: 'streams',
    image: '/mosaic/mrf.webp',
    badge: '4-STREAM SEGREGATION',
    headline: 'Mandatory source segregation from day one.',
    metrics: [
      { value: 'Wet', unit: 'Green', label: 'Organic' },
      { value: 'Dry', unit: 'Blue', label: 'Recyclables' },
      { value: 'Sanitary', unit: 'Red', label: 'Special care' },
    ],
    cta: 'View compliance requirements',
    ctaLink: '/register',
    countdown: false,
  },
  {
    id: 'legal',
    image: '/mosaic/compost.webp',
    badge: 'RULE 17 • PENALTIES',
    headline: 'Unregistered generators face daily compensation.',
    metrics: [
      { value: 'Auto', unit: 'Audit', label: 'Centralised Portal' },
      { value: 'GST', unit: 'Sync', label: 'Cross-verification' },
      { value: 'Daily', unit: 'Fines', label: 'Non-compliance' },
    ],
    cta: 'Protect your organisation today',
    ctaLink: '/register',
    countdown: true,
  }
];

export default function FullscreenHero() {
  const { t } = useI18n();
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];

  // Countdown logic
  const DEADLINE = new Date('2027-06-30T00:00:00+05:30').getTime();
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const days = now ? Math.ceil((DEADLINE - now) / 86_400_000) : 362;

  const nextSlide = () => setIdx((i) => (i + 1) % SLIDES.length);
  const prevSlide = () => setIdx((i) => (i - 1 + SLIDES.length) % SLIDES.length);

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between overflow-hidden bg-slate-900">
      
      {/* Background Images */}
      {SLIDES.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${i === idx ? 'opacity-100' : 'opacity-0'}`}
        >
          <img src={s.image} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40" /> {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </div>
      ))}

      {/* Main Content Area (Pushed down to account for absolute header) */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pt-32 pb-20">
        
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Side (Main Copy) */}
          <div className="lg:col-span-8 animate-fade-in-up">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/30 bg-black/20 backdrop-blur-md mb-6 shadow-xl">
              <ShieldCheck size={14} className="text-brass" />
              <span className="text-xs font-bold uppercase tracking-widest text-white/90">{slide.badge}</span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight mb-10 drop-shadow-lg">
              {slide.headline}
            </h1>

            {/* Metric Cards (Inline Bento) */}
            <div className="flex flex-wrap gap-4 mb-10">
              {slide.metrics.map((m, i) => (
                <div key={i} className="flex-1 min-w-[140px] border border-white/20 bg-black/30 backdrop-blur-xl rounded-2xl p-5 shadow-glass-lg hover:bg-black/40 transition-colors">
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-3xl font-extrabold text-white leading-none">{m.value}</span>
                    <span className="text-sm font-bold text-brass mb-0.5">{m.unit}</span>
                  </div>
                  <p className="text-xs font-medium text-white/60 uppercase tracking-wider">{m.label}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Link href={slide.ctaLink} className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-slate-900 font-bold text-lg transition-transform hover:-translate-y-1 hover:shadow-2xl shadow-lg"
                  style={{ background: 'linear-gradient(to right, #fde08b, #c8a24b)' }}>
              {slide.cta} <ArrowRight size={20} />
            </Link>
            
          </div>

          {/* Right Side (Floating Card) */}
          <div className="lg:col-span-4 flex justify-center lg:justify-end animate-fade-in-up delay-100">
            {slide.countdown && (
              <div className="border border-white/10 bg-black/40 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-3">Annual Return Closes In</p>
                
                <div className="font-display text-7xl font-black text-white mb-2 drop-shadow-md tabular-nums tracking-tighter">
                  {days}
                </div>
                <p className="text-sm font-bold text-white/70 mb-8">days • 30 JUN 2027</p>

                {/* Progress bar line */}
                <div className="relative w-full h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
                  <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-ruby-600 to-ruby-400 w-1/3 rounded-full" />
                </div>
                
                <p className="text-xs font-medium text-white/60 leading-relaxed">
                  Environmental Compensation applies to late filings
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Slider Controls & Ticker */}
      <div className="relative z-10 w-full pb-4">
        
        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button onClick={prevSlide} className="w-10 h-10 rounded-full bg-black/40 border border-white/20 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-colors">
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex gap-2">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? 'w-8 bg-brass' : 'w-4 bg-white/30 hover:bg-white/50'}`} />
            ))}
          </div>

          <button onClick={nextSlide} className="w-10 h-10 rounded-full bg-black/40 border border-white/20 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>

      </div>

    </div>
  );
}
