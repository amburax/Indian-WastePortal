'use client';
import { Check, Zap, Building2, Globe2, Star } from 'lucide-react';
import Link from 'next/link';

const PLANS = [
  {
    id: 'standard',
    name: 'Standard',
    subtitle: 'Residential',
    icon: Building2,
    price: '2,999',
    period: 'one-time consultation',
    color: '#475569',
    accent: 'rgba(71,85,105,0.08)',
    border: 'rgba(71,85,105,0.2)',
    description: 'For housing societies, apartments, and small residential complexes.',
    features: [
      'BWG threshold eligibility check',
      'CPCB SWM portal registration',
      'LGD-verified address mapping',
      'Acknowledgement Number delivery',
      'Email status notifications',
      '30-day post-filing support',
    ],
    cta: 'Get your quote',
    ctaHref: '/register?plan=standard',
    popular: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    subtitle: 'Commercial / Institutional',
    icon: Zap,
    price: '7,499',
    period: 'one-time consultation',
    color: '#16654a',
    accent: 'rgba(22, 101, 74,0.06)',
    border: '#16654a',
    description: 'For hospitals, hotels, malls, schools, and commercial establishments.',
    features: [
      'Everything in Standard',
      'Priority agent processing (24hr)',
      'GST & PAN verification',
      'Multi-contact org management',
      'Dedicated compliance officer',
      '90-day post-filing support',
      'Renewal reminder alerts',
    ],
    cta: 'Get your quote',
    ctaHref: '/register?plan=professional',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'Multi-site Corporations',
    icon: Globe2,
    price: '24,999',
    period: 'per site / one-time',
    color: '#7c3aed',
    accent: 'rgba(124,58,237,0.06)',
    border: 'rgba(124,58,237,0.25)',
    description: 'For large industries, SEZs, and multi-location corporate campuses.',
    features: [
      'Everything in Professional',
      'Multi-site bulk registration',
      'Custom API integration hook',
      'Dedicated account manager',
      'SLA-backed 6-hour processing',
      '1-year compliance support',
      'Quarterly audit reports',
      'White-label option available',
    ],
    cta: 'Get your quote',
    ctaHref: '/register?plan=enterprise',
    popular: false,
  },
];

function PricingCard({ plan }) {
  const Icon = plan.icon;

  return (
    <div
      className={`glass card flex flex-col h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-glass-lg ${plan.popular ? 'pricing-popular' : ''}`}
      style={plan.popular ? {} : { border: `1px solid ${plan.border}` }}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="flex items-center justify-center mb-4">
          <span className="flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #16654a, #46a67c)' }}>
            <Star size={10} fill="currentColor" /> Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: plan.accent }}>
          <Icon size={20} style={{ color: plan.color }} />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-slate-800">{plan.name}</h3>
          <p className="text-xs text-slate-500">{plan.subtitle}</p>
        </div>
      </div>

      <p className="text-sm text-slate-500 mb-5 leading-relaxed">{plan.description}</p>

      {/* Price — tailored (confirmed on consultation, not shown publicly) */}
      <div className="mb-5">
        <span className="font-display text-3xl font-bold" style={{ color: plan.color }}>Custom quote</span>
        <p className="text-xs text-slate-400 mt-0.5">One-time fee · based on your facility type &amp; location</p>
      </div>

      <div className="divider" />

      {/* Features */}
      <ul className="space-y-2.5 flex-1 mb-6">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
            <Check size={14} className="shrink-0 mt-0.5" style={{ color: plan.color }} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        href={plan.ctaHref}
        id={`pricing-cta-${plan.id}`}
        className={`w-full text-center py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${plan.popular ? 'btn-ruby' : 'btn-ghost'}`}
        style={!plan.popular ? { color: plan.color, borderColor: plan.border } : {}}
      >
        {plan.cta}
      </Link>
    </div>
  );
}

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-14">
          <p className="section-label mb-3">Transparent Pricing</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-800 mb-4 leading-tight">
            One fee, tailored to<br />
            <span className="text-gradient-ruby">your facility.</span>
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-lg">
            Every facility is different. Register in minutes — a consultant confirms a single,
            all-inclusive fee for your type &amp; location. No subscriptions, no hidden charges.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-slate-400 mt-10">
          Your consultant confirms a single all-inclusive fee after a quick review.
          Government portal fees (if any) are separate.{' '}
          <Link href="/register" className="text-ruby-800 font-medium hover:underline">Get your quote →</Link>
        </p>
      </div>
    </section>
  );
}
