'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Loader2,
  User, Building2, MapPin, BarChart3, ShieldCheck, CheckCircle,
  Recycle, Battery
} from 'lucide-react';
import GlassCard          from '../../components/GlassCard';
import StepProgress       from '../../components/StepProgress';

// ── Sub-categories from WasteComply_CRM (exact CPCB portal values) ─
const SUBCATS = {
  Institutional: [
    'Central Government department or undertaking',
    'State Government department or undertaking',
    'Local body',
    'Public sector undertaking (PSU)',
    'Private company',
    'School',
    'College',
    'University',
    'Research Institute',
    'Other educational institution',
    'Community place',
    'Public building',
    'Other'
  ],
  Commercial: [
    'Railway Station / Railway',
    'Bus Station / Depot',
    'Airport',
    'Port / Harbour',
    'Industrial unit and industrial area',
    'Mall',
    'Multiplexe',
    'Hotel',
    'Restaurant / Food Court',
    'Wholesale market, like "Mandi", fish market, meat market',
    'Stadium',
    'Sport Complexe',
    'Community Hall',
    'Convention Hall',
    'Marriage or banquet hall',
    'Conference Centre',
    'Expo Centre',
    'Tourist Spot',
    'Hospital',
    'Nursing home'
  ],
  Residential: [
    'Residential society / RWA',
    'Group housing society',
    'Other'
  ],
};

// ── LGD Indian States ─────────────────────────────────────────
const INDIAN_STATES = [
  { code: 'AN', name: 'Andaman and Nicobar Islands' },
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'AR', name: 'Arunachal Pradesh' },
  { code: 'AS', name: 'Assam' },
  { code: 'BR', name: 'Bihar' },
  { code: 'CH', name: 'Chandigarh' },
  { code: 'CG', name: 'Chhattisgarh' },
  { code: 'DL', name: 'Delhi' },
  { code: 'GA', name: 'Goa' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'HR', name: 'Haryana' },
  { code: 'HP', name: 'Himachal Pradesh' },
  { code: 'JK', name: 'Jammu and Kashmir' },
  { code: 'JH', name: 'Jharkhand' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'KL', name: 'Kerala' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'MN', name: 'Manipur' },
  { code: 'ML', name: 'Meghalaya' },
  { code: 'MZ', name: 'Mizoram' },
  { code: 'NL', name: 'Nagaland' },
  { code: 'OD', name: 'Odisha' },
  { code: 'PY', name: 'Puducherry' },
  { code: 'PB', name: 'Punjab' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'SK', name: 'Sikkim' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'TS', name: 'Telangana' },
  { code: 'TR', name: 'Tripura' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'UK', name: 'Uttarakhand' },
  { code: 'WB', name: 'West Bengal' },
];

// ── Validation ────────────────────────────────────────────────
const validate = {
  // Step 1 — Account
  step1: (d) => {
    const e = {};
    if (!d.org_name?.trim() || d.org_name.trim().length < 3)
      e.org_name    = 'Organisation name (min 3 characters)';
    if (!d.auth_person?.trim() || d.auth_person.trim().length < 2)
      e.auth_person = 'Authorised person name required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email?.trim()))
      e.email       = 'Valid email address required';
    if (!/^\d{10}$/.test(d.phone?.replace(/\s/g, '')))
      e.phone       = '10-digit mobile number required';
    return e;
  },
  // Step 2 — Category
  step2: (d) => {
    const e = {};
    if (!d.category)    e.category    = 'Select a category';
    if (!d.sub_category) e.sub_category = 'Select a sub-category';
    if (!(Number(d.floor_area_sqm) > 0))       e.floor_area_sqm       = 'Enter floor area (sq.m.)';
    if (!(Number(d.waste_kg_per_day) > 0))     e.waste_kg_per_day     = 'Enter waste generation (kg/day)';
    if (!(Number(d.water_liters_per_day) > 0)) e.water_liters_per_day = 'Enter water consumption (L/day)';
    return e;
  },
  // Step 3 — Address
  step3: (d) => {
    const e = {};
    if (!d.state_code)           e.state_code    = 'Select a state';
    if (!d.district_name?.trim()) e.district_name = 'District name required';
    if (!d.sub_district?.trim())  e.sub_district  = 'Sub-district / Taluka required';
    if (!d.city_name?.trim())     e.city_name     = 'City / Village name required';
    if (!d.local_body_type)       e.local_body_type = 'Select local body type';
    if (!/^\d{6}$/.test(d.pincode || '')) e.pincode = 'Valid 6-digit pincode required';
    // CPCB Step 2 requires coordinates (there is no "skip" on the portal).
    if (!d.latitude  || Number.isNaN(Number(d.latitude)))  e.latitude  = 'Latitude required (from Google Maps)';
    if (!d.longitude || Number.isNaN(Number(d.longitude))) e.longitude = 'Longitude required (from Google Maps)';
    return e;
  },
};

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-xs text-red-500 mt-1 animate-fade-in">{msg}</p>;
}

// ────────────────────────────────────────────────────────────
//  STEP 1: Account (CPCB Step 1 fields)
// ────────────────────────────────────────────────────────────
function Step1Account({ data, onChange, errors, loggedIn, accountEmail }) {
  const f = (key) => ({
    value:    data[key],
    onChange: (e) => onChange(key, e.target.value),
  });

  return (
    <div className="space-y-4 animate-slide-up">
      {loggedIn ? (
        <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <strong className="text-emerald-700">Adding a facility to your account</strong>
          <span className="text-slate-500 ml-2">Signed in as {accountEmail}. Give this facility its own contact email below.</span>
        </div>
      ) : (
        <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <strong className="text-indigo-700">Create your account</strong>
          <span className="text-slate-500 ml-2">You'll use this email + password to sign in and track everything. <Link href="/login" className="text-ruby-800 underline">Already have an account?</Link></span>
        </div>
      )}

      {/* Org + Auth person */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Organisation / Entity Name *</label>
          <input {...f('org_name')} className={`form-input ${errors.org_name ? 'error' : ''}`}
                 placeholder="Sunrise Residency RWA" id="f-orgname" />
          <FieldError msg={errors.org_name} />
        </div>
        <div>
          <label className="form-label">Authorised Person (Full Name) *</label>
          <input {...f('auth_person')} className={`form-input ${errors.auth_person ? 'error' : ''}`}
                 placeholder="Rajesh Mehta" id="f-authname" />
          <FieldError msg={errors.auth_person} />
        </div>
      </div>

      {/* Email + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Official Email Address *</label>
          <input {...f('email')} type="email" className={`form-input ${errors.email ? 'error' : ''}`}
                 placeholder="info@sunriserwa.org" id="f-email" autoComplete="email" />
          <p className="text-xs text-slate-400 mt-1">Used for CPCB portal account creation.</p>
          <FieldError msg={errors.email} />
        </div>
        <div>
          <label className="form-label">Mobile Number (10-digit) *</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">+91</span>
            <input {...f('phone')} type="tel" maxLength={10}
                   className={`form-input pl-12 ${errors.phone ? 'error' : ''}`}
                   placeholder="9876543210" id="f-mobile" />
          </div>
          <p className="text-xs text-slate-400 mt-1">The CPCB portal will send an OTP to this number during filing.</p>
          <FieldError msg={errors.phone} />
        </div>
      </div>

      {/* Password (account creation) */}
      {!loggedIn && (
        <div>
          <label className="form-label">Create a Password *</label>
          <input value={data.password || ''} onChange={e => onChange('password', e.target.value)} type="password"
                 className={`form-input ${errors.password ? 'error' : ''}`} placeholder="At least 8 characters" autoComplete="new-password" id="f-password" />
          <p className="text-xs text-slate-400 mt-1">Use this with your email to sign in to your dashboard.</p>
          <FieldError msg={errors.password} />
        </div>
      )}

      {/* OTP notice */}
      <div className="p-3 rounded-xl text-xs flex gap-2"
           style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <span className="text-emerald-600 shrink-0">📱</span>
        <span className="text-slate-600">
          <strong className="text-emerald-700">Keep your phone handy.</strong>{' '}
          When our agent files on the CPCB portal, it will pause and ask you to enter the OTP sent to your mobile.
          You'll see this prompt on your status page.
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  STEP 2: Category + Sub-category (CPCB Step 2A)
// ────────────────────────────────────────────────────────────
function Step2Category({ data, onChange, errors }) {
  const subcats = SUBCATS[data.category] || [];

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="p-3 rounded-xl text-xs"
           style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <strong className="text-indigo-700">CPCB SWM Portal — Step 2 (Part A)</strong>
        <span className="text-slate-500 ml-2">Category, sub-category, and waste metrics</span>
      </div>

      {/* Category + Sub-category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Category *</label>
          <select id="f-cat"
                  value={data.category}
                  onChange={e => { onChange('category', e.target.value); onChange('sub_category', ''); }}
                  className={`form-input ${errors.category ? 'error' : ''}`}>
            <option value="">Select category…</option>
            <option>Institutional</option>
            <option>Commercial</option>
            <option>Residential</option>
          </select>
          <FieldError msg={errors.category} />
        </div>
        <div>
          <label className="form-label">Sub-category *</label>
          <select id="f-subcat"
                  value={data.sub_category}
                  onChange={e => onChange('sub_category', e.target.value)}
                  disabled={!data.category}
                  className={`form-input ${errors.sub_category ? 'error' : ''}`}>
            <option value="">{data.category ? 'Select sub-category…' : 'Select category first'}</option>
            {subcats.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <FieldError msg={errors.sub_category} />
        </div>
      </div>

      {/* Waste metrics — required on CPCB Step 2 (they appear under sub-category) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Floor Area (sq.m.) *</label>
          <input id="f-floor" type="number" min="0" inputMode="decimal"
                 value={data.floor_area_sqm}
                 onChange={e => onChange('floor_area_sqm', e.target.value)}
                 className={`form-input ${errors.floor_area_sqm ? 'error' : ''}`} placeholder="5000" />
          <FieldError msg={errors.floor_area_sqm} />
        </div>
        <div>
          <label className="form-label">Waste Generation (kg/day) *</label>
          <input id="f-waste" type="number" min="0" inputMode="decimal"
                 value={data.waste_kg_per_day}
                 onChange={e => onChange('waste_kg_per_day', e.target.value)}
                 className={`form-input ${errors.waste_kg_per_day ? 'error' : ''}`} placeholder="150" />
          <FieldError msg={errors.waste_kg_per_day} />
        </div>
        <div>
          <label className="form-label">Water Consumption (L/day) *</label>
          <input id="f-water" type="number" min="0" inputMode="decimal"
                 value={data.water_liters_per_day}
                 onChange={e => onChange('water_liters_per_day', e.target.value)}
                 className={`form-input ${errors.water_liters_per_day ? 'error' : ''}`} placeholder="5000" />
          <FieldError msg={errors.water_liters_per_day} />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  STEP 3: LGD Address (CPCB Step 2B — full field set)
// ────────────────────────────────────────────────────────────
function Step3Address({ data, onChange, errors }) {
  return (
    <div className="space-y-4 animate-slide-up">
      <div className="p-3 rounded-xl text-xs"
           style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <strong className="text-indigo-700">CPCB SWM Portal — Step 2 (Part B)</strong>
        <span className="text-slate-500 ml-2">LGD-linked address — exact field names as on the portal</span>
      </div>

      {/* State + District */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">State / UT *</label>
          <select id="f-state" value={data.state_code}
                  onChange={e => {
                    onChange('state_code', e.target.value);
                    onChange('state_name', INDIAN_STATES.find(s => s.code === e.target.value)?.name || '');
                  }}
                  className={`form-input ${errors.state_code ? 'error' : ''}`}>
            <option value="">Select state…</option>
            {INDIAN_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
          <FieldError msg={errors.state_code} />
        </div>
        <div>
          <label className="form-label">District *</label>
          <input id="f-dist" value={data.district_name}
                 onChange={e => onChange('district_name', e.target.value)}
                 className={`form-input ${errors.district_name ? 'error' : ''}`}
                 placeholder="Ahmedabad" />
          <FieldError msg={errors.district_name} />
        </div>
      </div>

      {/* Sub-district + City */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Sub-District / Tehsil / Taluka *</label>
          <input id="f-taluka" value={data.sub_district}
                 onChange={e => onChange('sub_district', e.target.value)}
                 className={`form-input ${errors.sub_district ? 'error' : ''}`}
                 placeholder="Bopal Taluka" />
          <FieldError msg={errors.sub_district} />
        </div>
        <div>
          <label className="form-label">City / Village Name *</label>
          <input id="f-city" value={data.city_name}
                 onChange={e => onChange('city_name', e.target.value)}
                 className={`form-input ${errors.city_name ? 'error' : ''}`}
                 placeholder="Bopal" />
          <FieldError msg={errors.city_name} />
        </div>
      </div>

      {/* Full address */}
      <div>
        <label className="form-label">Full Address</label>
        <textarea id="f-addr" rows={2} value={data.full_address}
                  onChange={e => onChange('full_address', e.target.value)}
                  className="form-input resize-none"
                  placeholder="Plot 12, Sector 4, Near Bus Stand, Bopal" />
        <p className="text-xs text-slate-400 mt-1">Letters, numbers, spaces and commas only — the CPCB portal rejects symbols like <code>#</code> <code>/</code> <code>&amp;</code>.</p>
      </div>

      {/* Local body + Pincode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Local Body Type *</label>
          <select id="f-localbody" value={data.local_body_type}
                  onChange={e => onChange('local_body_type', e.target.value)}
                  className={`form-input ${errors.local_body_type ? 'error' : ''}`}>
            <option value="">Select…</option>
            <option value="Urban Local Body (ULB)">Urban Local Body (ULB)</option>
            <option value="Rural Local Body (RLB)">Rural Local Body (RLB)</option>
          </select>
          <FieldError msg={errors.local_body_type} />
        </div>
        <div>
          <label className="form-label">Pincode *</label>
          <input id="f-pin" type="text" maxLength={6} value={data.pincode}
                 onChange={e => onChange('pincode', e.target.value)}
                 className={`form-input ${errors.pincode ? 'error' : ''}`}
                 placeholder="382010" />
          <FieldError msg={errors.pincode} />
        </div>
      </div>

      {/* Zone + Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Zone/Containment Board <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
          <input id="f-zone" value={data.zone_board}
                 onChange={e => onChange('zone_board', e.target.value)}
                 className="form-input" placeholder="Enter Zone/Containment Board" />
        </div>
        <div>
          <label className="form-label">Block/Ward <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
          <input id="f-block" value={data.block_ward}
                 onChange={e => onChange('block_ward', e.target.value)}
                 className="form-input" placeholder="Enter Block/Ward" />
        </div>
      </div>

      {/* Lat/Lng — required by CPCB Step 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="form-label">Enter Lattitude *</label>
          <input id="f-lat" type="number" step="0.0001" value={data.latitude}
                 onChange={e => onChange('latitude', e.target.value)}
                 className={`form-input ${errors.latitude ? 'error' : ''}`} placeholder="19.0760" />
          <FieldError msg={errors.latitude} />
        </div>
        <div>
          <label className="form-label">Enter Longitude *</label>
          <input id="f-lng" type="number" step="0.0001" value={data.longitude}
                 onChange={e => onChange('longitude', e.target.value)}
                 className={`form-input ${errors.longitude ? 'error' : ''}`} placeholder="72.8777" />
          <FieldError msg={errors.longitude} />
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-2">💡 Find lat/lng: right-click your location on Google Maps → "What's here?"</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  CONSENT — declarations gate (before submit)
// ────────────────────────────────────────────────────────────
const CONSENT_ITEMS = [
  { key: 'terms',   text: <>I have read and agree to the <strong>Terms &amp; Conditions</strong>, including the obligations under the <strong>Solid Waste Management Rules 2026</strong>.</> },
  { key: 'declare', text: <>I declare that the information submitted is <strong>true and accurate</strong>. I understand that submitting false information is an offence under the <strong>Environment (Protection) Act, 1986</strong>.</> },
  { key: 'scope',   text: <>I understand <strong>Indian Waste Portal</strong> is an independent consultant responsible <strong>only for my registration filing</strong> — not for any ongoing compliance after the ACK is issued — and is not affiliated with CPCB or GPCB.</> },
];

function ConsentGate({ consent, onChange }) {
  return (
    <div className="mt-7 pt-6 border-t border-slate-100 space-y-3 animate-fade-in">
      <p className="section-label mb-1">Declarations &amp; Consent</p>
      {CONSENT_ITEMS.map(({ key, text }) => (
        <label key={key}
               className="flex gap-3 items-start p-3 rounded-xl cursor-pointer transition-colors"
               style={{
                 background: consent[key] ? 'rgba(16,185,129,0.06)' : 'rgba(148,163,184,0.05)',
                 border: `1px solid ${consent[key] ? 'rgba(16,185,129,0.25)' : 'rgba(148,163,184,0.18)'}`,
               }}>
          <input type="checkbox" checked={consent[key]} required
                 onChange={(e) => onChange(key, e.target.checked)}
                 className="mt-0.5 w-4 h-4 accent-emerald-600 shrink-0" />
          <span className="text-xs text-slate-600 leading-relaxed">{text}</span>
        </label>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  SERVICE SELECTOR — one account, multiple services
// ────────────────────────────────────────────────────────────
function ServiceSelector({ service, onSelect }) {
  const opts = [
    { id: 'solid_waste', label: 'Solid Waste', desc: 'Bulk Waste Generator registration — SWM Rules 2026', icon: Recycle, live: true },
    { id: 'ewaste',      label: 'E-Waste',     desc: 'EPR registration under the E-Waste Rules', icon: Battery, live: false },
  ];
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Choose a service</p>
      <div className="grid grid-cols-2 gap-3">
        {opts.map(o => {
          const active = service === o.id;
          return (
            <button key={o.id} type="button" onClick={() => onSelect(o.id)}
                    className={`text-left rounded-2xl p-4 border transition-all ${active ? 'border-ruby-500 bg-ruby-50/60 shadow-sm' : 'border-slate-200 bg-white/60 hover:border-slate-300'}`}>
              <div className="flex items-center gap-2 mb-1">
                <o.icon size={18} className={active ? 'text-ruby-700' : 'text-slate-500'} />
                <span className="font-semibold text-slate-800 text-sm">{o.label}</span>
                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${o.live ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {o.live ? 'Available' : 'Coming soon'}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-snug">{o.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── E-Waste: not live yet → waitlist capture ──────────────────
function EWasteWaitlistCard() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');   // idle | loading | done | error
  const [msg, setMsg]     = useState('');
  const [code, setCode]   = useState('');
  async function join(e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setState('error'); setMsg('Enter a valid email'); return; }
    setState('loading'); setMsg('');
    try {
      const res = await fetch('/api/ewaste-waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const d = await res.json();
      if (!res.ok) { setState('error'); setMsg(d.error || 'Something went wrong'); return; }
      setState('done'); setMsg(d.message || "You're on the list!"); setCode(d.discount_code || '');
    } catch { setState('error'); setMsg('Network error — please try again.'); }
  }
  return (
    <GlassCard variant="frosted" className="p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
        <Battery size={26} className="text-amber-600" />
      </div>
      <h2 className="font-display text-xl font-bold text-slate-800">E-Waste registration is launching soon</h2>
      <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
        We're building EPR registration under the E-Waste (Management) Rules with the same one-login,
        agent-filed experience. Join the waitlist for <strong className="text-amber-700">20% off</strong> at launch.
      </p>
      {state === 'done' ? (
        <div className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 max-w-md mx-auto">
          <p className="text-sm font-semibold text-emerald-800 flex items-center justify-center gap-2"><CheckCircle size={16} /> {msg}</p>
          {code && <p className="text-xs text-emerald-700 mt-1">Your launch discount code: <span className="font-mono font-bold">{code}</span></p>}
        </div>
      ) : (
        <form onSubmit={join} className="mt-5 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.in" className="form-input flex-1" />
          <button type="submit" disabled={state === 'loading'} className="btn-ruby px-5 py-2.5 text-sm gap-2 disabled:opacity-50">
            {state === 'loading' ? <><Loader2 size={15} className="animate-spin" />Joining…</> : 'Join waitlist'}
          </button>
        </form>
      )}
      {state === 'error' && <p className="text-xs text-red-600 mt-2">{msg}</p>}
      <p className="text-xs text-slate-400 mt-4">Want Solid Waste instead? Switch the service above.</p>
    </GlassCard>
  );
}

// ────────────────────────────────────────────────────────────
//  MAIN REGISTER PAGE
// ────────────────────────────────────────────────────────────
function RegisterContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const planFromUrl  = searchParams.get('plan') || 'standard';

  const [step,     setStep]     = useState(1);
  const [service,  setService]  = useState('solid_waste');   // solid_waste (live) | ewaste (waitlist)
  const [loading,  setLoading]  = useState(false);
  const [apiError, setApiError] = useState('');
  const [errors,   setErrors]   = useState({});

  // Client account state
  const [loggedIn, setLoggedIn]         = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  useEffect(() => {
    fetch('/api/account/me', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) { setLoggedIn(true); setAccountEmail(d.user.email); } })
      .catch(() => {});
  }, []);

  // Step 1: Account
  const [account, setAccount] = useState({
    org_name: '', auth_person: '', email: '', phone: '', password: '',
  });
  // Step 2: Category
  const [category, setCategory] = useState({ category: '', sub_category: '', floor_area_sqm: '', waste_kg_per_day: '', water_liters_per_day: '' });
  // Step 3: Address (all V2 fields)
  const [address, setAddress] = useState({
    state_code: '', state_name: '', district_name: '', sub_district: '',
    city_name: '', full_address: '', zone_board: '', block_ward: '', local_body_type: '',
    pincode: '', latitude: '', longitude: '',
  });
  // Consent (declarations before submit)
  const [consent, setConsent] = useState({ terms: false, declare: false, scope: false });
  const allConsent = consent.terms && consent.declare && consent.scope;
  const updateConsent = (k, v) => setConsent(p => ({ ...p, [k]: v }));

  const updateAccount  = (k, v) => { setAccount(p => ({ ...p, [k]: v }));  setErrors(p => ({ ...p, [k]: '' })); };
  const updateCategory = (k, v) => { setCategory(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })); };
  const updateAddress  = (k, v) => { setAddress(p => ({ ...p, [k]: v }));  setErrors(p => ({ ...p, [k]: '' })); };

  function validateCurrentStep() {
    let errs = {};
    if (step === 1) {
      errs = validate.step1(account);
      if (!loggedIn && (!account.password || account.password.length < 8))
        errs.password = 'Choose a password (at least 8 characters)';
    }
    if (step === 2) errs = validate.step2(category);
    if (step === 3) errs = validate.step3(address);
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() {
    if (validateCurrentStep()) {
      setStep(s => s + 1);
      setErrors({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  function back() {
    if (step > 1) {
      setStep(s => s - 1);
      setErrors({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setApiError('');
    try {
      // 1. Register org
      const regRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...account, ...category, plan: planFromUrl }),
      });
      const reg = await regRes.json();
      if (!regRes.ok) throw new Error(reg.error || 'Registration failed');

      const { orgId, token } = reg;

      // 2. Save metrics — required on CPCB Step 2 (collected in the Category step)
      await fetch('/api/metrics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          floor_area_sqm:       Number(category.floor_area_sqm)       || 0,
          waste_kg_per_day:     Number(category.waste_kg_per_day)     || 0,
          water_liters_per_day: Number(category.water_liters_per_day) || 0,
          is_bulk_waste_generator: 1,
          qualifying_criteria: '[]',
        }),
      });

      // 3. Save address (all V2 fields)
      await fetch('/api/address', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          org_id: orgId, 
          ...address,
          zone_ward: (address.zone_board || '') + (address.block_ward ? ' / ' + address.block_ward : '')
        }),
      });

      // Registration also created/attached the account + logged them in → dashboard.
      router.push('/dashboard');

    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const ICONS    = [User, Building2, MapPin];
  const TITLES   = ['Account Details', 'Category & Sub-category', 'LGD Address'];
  const SUBTITLES = [
    'CPCB Step 1 — organisation & authorised person details',
    'CPCB Step 2A — category & sub-category',
    'CPCB Step 2B — LGD-linked administrative address',
  ];
  const StepIcon = ICONS[step - 1];

  return (
    <div className="min-h-screen bg-mesh dot-grid">
      <header className="glass border-b border-white/50 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors">
            <ArrowLeft size={16} />
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-ruby-800" />
              <span className="font-display font-bold text-sm">Indian Waste<span className="text-ruby-800">Portal</span></span>
            </div>
          </Link>
          <span className="text-xs text-slate-400">CPCB SWM Registration — {planFromUrl} plan</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 page-transition">
        {step === 1 && <ServiceSelector service={service} onSelect={setService} />}

        {service === 'ewaste' && <EWasteWaitlistCard />}

        {service !== 'ewaste' && (<>
        <div className="glass-frosted rounded-2xl p-6 mb-5">
          <StepProgress currentStep={step} />
        </div>

        <GlassCard variant="frosted" className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(22, 101, 74,0.08)' }}>
              <StepIcon size={20} className="text-ruby-800" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-slate-800">{TITLES[step - 1]}</h1>
              <p className="text-xs text-slate-400">{SUBTITLES[step - 1]}</p>
            </div>
          </div>

          {step === 1 && <Step1Account  data={account}  onChange={updateAccount}  errors={errors} loggedIn={loggedIn} accountEmail={accountEmail} />}
          {step === 2 && <Step2Category data={category} onChange={updateCategory} errors={errors} />}
          {step === 3 && (
            <>
              <Step3Address data={address} onChange={updateAddress} errors={errors} />
              <ConsentGate consent={consent} onChange={updateConsent} />
            </>
          )}

          {apiError && (
            <div className="mt-4 p-3 rounded-xl text-sm text-red-700"
                 style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {apiError}
            </div>
          )}

          <div className="flex items-center justify-between mt-8 gap-4">
            <button type="button" onClick={back} disabled={step === 1 || loading}
                    className="btn-ghost flex items-center gap-2 py-2.5 px-5 text-sm disabled:opacity-40">
              <ArrowLeft size={15} /> Back
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{step} / 3</span>
              {step < 3 ? (
                <button type="button" id={`register-next-${step}`} onClick={next}
                        className="btn-ruby py-2.5 px-6 text-sm gap-2">
                  Continue <ArrowRight size={15} />
                </button>
              ) : (
                <button type="button" id="register-submit" onClick={handleSubmit} disabled={loading || !allConsent}
                        className="btn-ruby py-2.5 px-6 text-sm gap-2">
                  {loading
                    ? <><Loader2 size={15} className="animate-spin" />Submitting…</>
                    : <><CheckCircle size={15} />Submit &amp; Continue to Filing</>
                  }
                </button>
              )}
            </div>
          </div>

          {step === 3 && !allConsent && (
            <p className="text-right text-xs text-slate-400 mt-2">
              Please accept all three declarations above to submit.
            </p>
          )}
        </GlassCard>
        </>)}

        <p className="text-center text-xs text-slate-400 mt-4">
          🔒 Indian Waste Portal handles only your CPCB SWM 2026 registration filing. Not affiliated with any government body.
        </p>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-ruby-800" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
