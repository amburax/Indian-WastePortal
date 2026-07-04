const fs = require('fs');
let code = fs.readFileSync('app/page.jsx', 'utf8');

// TopAlertBanner
code = code.replace(
  'SWM Rules 2026 are <span className="text-white">IN FORCE</span> — unregistered Bulk Waste Generators risk Environmental Compensation',
  '<span dangerouslySetInnerHTML={{ __html: t(\'pg.alert.force\') }} />'
);
code = code.replace(
  '<span className="hidden lg:inline text-ruby-200">Annual return due in {days} days (30 June)</span>',
  '<span className="hidden lg:inline text-ruby-200">{t(\'pg.alert.due\').replace(\'{days}\', days)}</span>'
);
code = code.replace(
  /Register now/g,
  "{t('pg.alert.reg')}"
);
code = code.replace(
  /function TopAlertBanner\(\) {/,
  "function TopAlertBanner() {\n  const { t } = useI18n();"
);

// Header
code = code.replace(
  "{ href: '#whats-new', label: 'SWM 2026' }",
  "{ href: '#whats-new', label: t('pg.nav.swm') }"
);
code = code.replace(
  />Login</g,
  ">{t('pg.nav.login')}<"
);
code = code.replace(
  />Start registration</g,
  ">{t('pg.nav.start')}<"
);
code = code.replace(
  />My Dashboard</,
  ">{t('pg.nav.dash')}<"
);

// TickerTape
code = code.replace(
  /function TickerTape\(\) {/,
  "function TickerTape() {\n  const { t } = useI18n();"
);
code = code.replace(
  /const items = \[\s*'SWM Rules 2026 · GSR 388\(E\) — now in force',\s*'Four streams: Wet · Dry · Sanitary · Special-care',\s*'LGD-verified addresses · exact CPCB portal fields',\s*'Your OTP stays on your device — we never read it',\s*'Filed on the official CPCB SWM portal',\s*'Urban & Rural — every ULB, Panchayat & Gram Panchayat',\s*\];/,
  "const items = [\n    t('pg.tick.1'),\n    t('pg.tick.2'),\n    t('pg.tick.3'),\n    t('pg.tick.4'),\n    t('pg.tick.5'),\n    t('pg.tick.6'),\n  ];"
);

// ThresholdBand
code = code.replace(
  /unit: 'sq.m'/g,
  "unit: t('pg.unit.sqm')"
);
code = code.replace(
  /unit: 'L\/day'/g,
  "unit: t('pg.unit.lday')"
);
code = code.replace(
  /unit: 'Kg\/day'/g,
  "unit: t('pg.unit.kgday')"
);
code = code.replace(
  />\s*OR\s*<\/span>/,
  ">{t('pg.thresh.or')}</span>"
);

// WhatsNew
code = code.replace(
  /function WhatsNew\(\) {/,
  "function WhatsNew() {\n  const { t } = useI18n();"
);
code = code.replace(
  /const changes = \[[\s\S]*?\];/,
  `const changes = [
    { icon: Globe, tag: t('pg.nw.t1.tag'), title: t('pg.nw.t1.title'), desc: t('pg.nw.t1.desc') },
    { icon: Recycle, tag: t('pg.nw.t2.tag'), title: t('pg.nw.t2.title'), desc: t('pg.nw.t2.desc') },
    { icon: FileText, tag: t('pg.nw.t3.tag'), title: t('pg.nw.t3.title'), desc: t('pg.nw.t3.desc') },
    { icon: Scale, tag: t('pg.nw.t4.tag'), title: t('pg.nw.t4.title'), desc: t('pg.nw.t4.desc') },
  ];`
);
code = code.replace(
  /Gazette of India · GSR 388\(E\) · 27 Jan 2026/,
  "{t('pg.nw.gazette')}"
);
code = code.replace(
  /const { t } = useI18n\(\);\s*return \(/,
  "return ("
);

// Segregation
code = code.replace(
  /const streams = \[[\s\S]*?\];/,
  `const streams = [
    { name: t('sec.seg.wet'), bin: t('pg.seg.b1'),  color: '#16a34a', soft: 'rgba(22,163,74,0.10)',  icon: Leaf,      eg: t('pg.seg.e1') },
    { name: t('sec.seg.dry'), bin: t('pg.seg.b2'),   color: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: Recycle,   eg: t('pg.seg.e2') },
    { name: t('sec.seg.san'), bin: t('pg.seg.b3'),    color: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: Sparkles,  eg: t('pg.seg.e3') },
    { name: t('sec.seg.spc'), bin: t('pg.seg.b4'), color: '#ca8a04', soft: 'rgba(202,138,4,0.12)',  icon: Battery,   eg: t('pg.seg.e4') },
  ];`
);

// ServiceTiles
code = code.replace(
  />Live & Active</,
  ">{t('pg.svc.live')}<"
);
code = code.replace(
  /Solid Waste Management/g,
  "{t('pg.svc.s1')}"
);
code = code.replace(
  /Mandatory CPCB \/ GPCB Bulk Waste Generator registration under SWM Rules 2026\.[\s\S]*?threshold below\./,
  "{t('pg.svc.d1')}"
);
code = code.replace(
  /\['≥ 20,000 sqm Floor Area', '≥ 100 kg\/day Waste', '≥ 40,000 L\/day Water'\]/,
  "[t('pg.svc.t1'), t('pg.svc.t2'), t('pg.svc.t3')]"
);
code = code.replace(
  /Start Registration/,
  "{t('pg.svc.reg')}"
);
code = code.replace(
  />Coming Soon</,
  ">{t('pg.svc.soon')}<"
);
code = code.replace(
  />\s*E-Waste Management\s*</,
  ">{t('pg.svc.s2')}<"
);
code = code.replace(
  /Extended Producer Responsibility \(EPR\) registration and e-waste channelisation[\s\S]*?tightening soon\./,
  "{t('pg.svc.d2')}"
);
code = code.replace(
  /\['EPR Registration', 'Channel Partner Mapping', 'Annual Return Filing'\]/,
  "[t('pg.svc.p1'), t('pg.svc.p2'), t('pg.svc.p3')]"
);
code = code.replace(
  />\s*Registration Locked\s*</,
  ">{t('pg.svc.lock1')}<"
);
code = code.replace(
  /E-Waste filing is locked/,
  "{t('pg.svc.lock2')}"
);
code = code.replace(
  /Mandates are tightening\. Pre-book your <strong>20% early-access discount\.<\/strong>/,
  '<span dangerouslySetInnerHTML={{ __html: t(\'pg.svc.lock3\') }} />'
);
code = code.replace(
  /Get Early Access/,
  "{t('pg.svc.early')}"
);

// HowItWorks
code = code.replace(
  /function HowItWorks\(\) {/,
  "function HowItWorks() {\n  const { t } = useI18n();"
);
code = code.replace(
  /const steps = \[[\s\S]*?\];/,
  `const steps = [
    { n: '01', icon: TrendingUp, title: t('pg.hw.t1'), desc: t('pg.hw.d1') },
    { n: '02', icon: Globe,      title: t('pg.hw.t2'), desc: t('pg.hw.d2') },
    { n: '03', icon: CheckCircle,title: t('pg.hw.t3'), desc: t('pg.hw.d3') },
    { n: '04', icon: Zap,        title: t('pg.hw.t4'), desc: t('pg.hw.d4') },
  ];`
);
code = code.replace(
  /const { t } = useI18n\(\);\s*return \(/,
  "return ("
);

// Deadlines
code = code.replace(
  /const dates = \[[\s\S]*?\];/,
  `const dates = [
    { date: t('pg.dl.d1'), label: t('pg.dl.l1'), tone: '#16654a' },
    { date: t('pg.dl.d2'), label: t('pg.dl.l2'), tone: '#a16207' },
    { date: t('pg.dl.d3'), label: t('pg.dl.l3'), tone: '#1d4ed8' },
    { date: t('pg.dl.d4'), label: t('pg.dl.l4'), tone: '#047857' },
  ];`
);

// StatsBanner
code = code.replace(
  /function StatsBanner\(\) {/,
  "function StatsBanner() {\n  const { t } = useI18n();"
);
code = code.replace(
  /const stats = \[[\s\S]*?\];/,
  `const stats = [
    { value: t('pg.st.v1'), label: t('pg.st.l1') },
    { value: t('pg.st.v2'), label: t('pg.st.l2') },
    { value: t('pg.st.v3'), label: t('pg.st.l3') },
    { value: t('pg.st.v4'), label: t('pg.st.l4') },
  ];`
);

// WhyTrust
code = code.replace(
  /const points = \[[\s\S]*?\];/,
  `const points = [
    { icon: BadgeCheck, title: t('pg.why.t1'), desc: t('pg.why.d1') },
    { icon: Lock,       title: t('pg.why.t2'), desc: t('pg.why.d2') },
    { icon: Users,      title: t('pg.why.t3'), desc: t('pg.why.d3') },
  ];`
);

fs.writeFileSync('app/page.jsx', code);
