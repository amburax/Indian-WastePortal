import Link from 'next/link';
import {
  ShieldCheck, ArrowRight, Lock, Recycle, Package, Cpu, Syringe,
  Battery, Droplet, Disc, Building2, Repeat, ClipboardCheck,
  Target, Trophy, Globe, Phone, Mail, CheckCircle2, Sparkles,
} from 'lucide-react';

export const metadata = {
  title: 'Indian Waste Portal — Waste Exchange & CPCB Compliance',
  description:
    'India’s waste exchange and CPCB compliance platform. We connect waste generators with authorised recyclers and handle your official registration — across every category of waste India regulates. Mission: a waste-free India by 2035.',
};

// The categories India's CPCB rules govern. Solid Waste is live today; the rest
// are on the roadmap and shown honestly as "Coming soon".
const CATEGORIES = [
  { name: 'Solid Waste', rule: 'SWM Rules, 2016 / 2026', icon: Recycle, href: '/solid-waste', live: true,
    blurb: 'Bulk Waste Generator registration on the CPCB SWM portal — eligibility, filing & acknowledgement.' },
  { name: 'Plastic Waste', rule: 'Plastic Waste Rules · EPR', icon: Package,
    blurb: 'Producer, importer & brand-owner EPR registration and reporting.' },
  { name: 'E-Waste', rule: 'E-Waste Rules · EPR', icon: Cpu,
    blurb: 'Extended Producer Responsibility for electronics and appliances.' },
  { name: 'Biomedical Waste', rule: 'BMW Rules, 2016', icon: Syringe,
    blurb: 'Healthcare facility authorisation and annual returns.' },
  { name: 'Battery Waste', rule: 'Battery Waste Rules · EPR', icon: Battery,
    blurb: 'Battery producer EPR registration and compliance.' },
  { name: 'Used Oil Waste', rule: 'Hazardous Waste Rules', icon: Droplet,
    blurb: 'Used & waste-oil collection and recycler compliance.' },
  { name: 'Tyre Waste', rule: 'EPR for Waste Tyres', icon: Disc,
    blurb: 'Waste-tyre producer & recycler EPR obligations.' },
  { name: 'Construction & Demolition', rule: 'C&D Waste Rules, 2016', icon: Building2,
    blurb: 'C&D waste management, processing and disposal compliance.' },
];

const GOALS = [
  { icon: Target, title: 'A waste-free India by 2035', body: 'Every stream accounted for, routed and recovered — not dumped.' },
  { icon: Trophy, title: '#1 in global waste management', body: 'Lift India’s waste systems to the world’s top rank.' },
  { icon: Globe,  title: 'Raise India’s standing', body: 'Turn organised, transparent waste management into national prestige.' },
];

export default function Landing() {
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
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-white/85">
            <a href="#services" className="hover:text-white transition-colors">Services</a>
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#mission" className="hover:text-white transition-colors">Mission</a>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/login" className="hidden sm:block text-sm font-semibold text-white/85 hover:text-white">Login</Link>
            <Link href="/solid-waste"
                  className="bg-[#fde08b] text-slate-900 text-xs sm:text-sm font-bold px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:bg-[#c8a24b] transition-colors whitespace-nowrap">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero (above the fold: name + mission + what we do) ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(1200px 500px at 50% -10%, rgba(22,101,74,0.14), transparent 70%)' }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-12 md:pt-20 md:pb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-[#0e3b2e] bg-[#c8a24b]/15 border border-[#c8a24b]/30">
            <Sparkles size={13} /> Waste Exchange · Official Compliance
          </span>

          <h1 className="mt-6 font-display text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#0e3b2e] leading-[1.05] text-balance">
            Indian Waste Portal
          </h1>
          <p className="mt-4 font-display text-2xl sm:text-3xl font-bold text-[#16654a]">
            Making India waste-free by 2035.
          </p>
          <p className="mt-5 max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed">
            We connect waste generators with authorised recyclers and end-users, and handle your
            official <strong className="text-slate-800">CPCB compliance</strong> end-to-end —
            across every category of waste India regulates.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#services"
               className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-slate-900 shadow-lg hover:-translate-y-0.5 transition-transform"
               style={{ background: 'linear-gradient(to right, #fde08b, #c8a24b)' }}>
              Explore services <ArrowRight size={18} />
            </a>
            <a href="#how"
               className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-[#0e3b2e] bg-white border border-slate-200 hover:border-[#16654a]/40 transition-colors">
              How it works
            </a>
          </div>

          {/* Two core capabilities — visible without scrolling far */}
          <div className="mt-12 grid sm:grid-cols-2 gap-4 max-w-3xl">
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <Repeat size={18} className="text-[#16654a]" />
                <h3 className="font-bold text-slate-800">Waste Exchange</h3>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Coming soon</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                A marketplace routing surplus waste to the recyclers and authorised facilities that
                need it — for reuse, recycling or safe disposal.
              </p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <ClipboardCheck size={18} className="text-[#16654a]" />
                <h3 className="font-bold text-slate-800">Official Compliance</h3>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Live</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                We register and manage your obligations (EPR &amp; more) on the government’s CPCB
                portal — starting with Solid Waste today.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services / waste categories ─────────────────────── */}
      <section id="services" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[#16654a]">Services</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-[#0e3b2e] text-balance">
            Every waste category India regulates
          </h2>
          <p className="mt-3 text-slate-600">
            Pick your stream. <strong className="text-slate-800">Solid Waste is live now</strong> — the
            rest are rolling out. Join the waitlist and we’ll tell you the moment yours opens.
          </p>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map(({ name, rule, icon: Icon, href, live, blurb }) => {
            const inner = (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${live ? 'bg-[#16654a]/10' : 'bg-slate-100'}`}>
                    <Icon size={20} className={live ? 'text-[#16654a]' : 'text-slate-400'} />
                  </div>
                  {live ? (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Live</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      <Lock size={10} /> Soon
                    </span>
                  )}
                </div>
                <h3 className={`font-bold ${live ? 'text-slate-800' : 'text-slate-500'}`}>{name}</h3>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mt-0.5">{rule}</p>
                <p className={`text-sm mt-3 leading-relaxed ${live ? 'text-slate-500' : 'text-slate-400'}`}>{blurb}</p>
                {live && (
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#16654a]">
                    Open service <ArrowRight size={15} />
                  </span>
                )}
              </>
            );
            return live ? (
              <Link key={name} href={href}
                    className="group rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:border-[#16654a]/40 hover:-translate-y-0.5 transition-all ring-1 ring-[#16654a]/10">
                {inner}
              </Link>
            ) : (
              <div key={name}
                   className="rounded-2xl bg-slate-50 border border-slate-200/70 p-5 cursor-not-allowed select-none">
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section id="how" className="bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
          <p className="text-xs font-bold uppercase tracking-widest text-[#16654a]">How it works</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-[#0e3b2e]">Four steps, done for you</h2>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n: '01', t: 'Pick your waste category', d: 'Tell us your stream and we confirm which CPCB rule applies to you.' },
              { n: '02', t: 'Check eligibility', d: 'A quick check against the official thresholds — no guesswork.' },
              { n: '03', t: 'We file on the portal', d: 'Our team completes your registration on the government CPCB portal.' },
              { n: '04', t: 'Get your acknowledgement', d: 'You receive the official acknowledgement and a downloadable record.' },
            ].map((s) => (
              <div key={s.n} className="relative">
                <div className="font-display text-3xl font-black text-[#c8a24b]">{s.n}</div>
                <h3 className="mt-2 font-bold text-slate-800">{s.t}</h3>
                <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission ─────────────────────────────────────────── */}
      <section id="mission" className="relative bg-[#0e3b2e] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.15]" style={{ background: 'radial-gradient(700px 300px at 80% 0%, #c8a24b, transparent 60%)' }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <p className="text-xs font-bold uppercase tracking-widest text-[#fde08b]">Our mission</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-balance max-w-2xl">
            Waste is not the end of the line. It’s the start of the next one.
          </h2>

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

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 md:p-12 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0e3b2e] text-balance">
            Start with Solid Waste — live today
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-slate-600">
            Check your Bulk Waste Generator eligibility and get your CPCB SWM registration filed and acknowledged.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/solid-waste"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-slate-900 shadow-lg hover:-translate-y-0.5 transition-transform"
                  style={{ background: 'linear-gradient(to right, #fde08b, #c8a24b)' }}>
              Open Solid Waste service <ArrowRight size={18} />
            </Link>
            <Link href="/login"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-[#0e3b2e] bg-white border border-slate-200 hover:border-[#16654a]/40 transition-colors">
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="bg-[#0b2c22] text-white/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#c8a24b]" />
              <span className="font-display text-base font-bold text-white">Indian Waste<span className="text-[#c8a24b]">Portal</span></span>
            </div>
            <p className="mt-3 text-sm leading-relaxed">
              An independent waste-management and compliance platform. Not a government body and not affiliated with CPCB.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Services</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/solid-waste" className="hover:text-white">Solid Waste (live)</Link></li>
              <li><span className="text-white/40">Plastic, E-Waste &amp; more — soon</span></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Account</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-white">Login</Link></li>
              <li><Link href="/find" className="hover:text-white">Find my registration</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Legal &amp; contact</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/legal/terms" className="hover:text-white">Terms</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-white">Privacy</Link></li>
              <li><a href="mailto:indianwasteportal@gmail.com" className="inline-flex items-center gap-1.5 hover:text-white"><Mail size={13} /> Email</a></li>
              <li><a href="tel:+919054047272" className="inline-flex items-center gap-1.5 hover:text-white"><Phone size={13} /> +91 90540 47272</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-xs text-white/40">
            © 2026 Indian Waste Portal. Mission: a waste-free India by 2035.
          </p>
        </div>
      </footer>
    </div>
  );
}
