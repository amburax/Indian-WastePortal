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
import Combobox           from '../../components/Combobox';
import { INDIAN_STATES } from '../../lib/lgdData';
import { useI18n } from '../../lib/i18n';
import SiteNavbar from '../../components/SiteNavbar';

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

// ── Validation ────────────────────────────────────────────────
const validate = {
  // Step 1 — Account
  step1: (d, t) => {
    const e = {};
    const org = d.org_name?.trim() || '';
    const person = d.auth_person?.trim() || '';
    if (org.length < 3)
      e.org_name    = t('reg.v.orgName');
    else if (!/[a-zA-Zऀ-ॿ઀-૿]/.test(org))   // must contain a letter, not just digits/symbols
      e.org_name    = t('reg.v.orgNameInvalid');
    if (person.length < 2)
      e.auth_person = t('reg.v.authPerson');
    else if (!/^[a-zA-Zऀ-ॿ઀-૿][a-zA-Zऀ-ॿ઀-૿\s.'-]*$/.test(person)) // letters/spaces only, no digits
      e.auth_person = t('reg.v.authPersonInvalid');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email?.trim()))
      e.email       = t('reg.v.email');
    if (!/^\d{10}$/.test(d.phone?.replace(/\s/g, '')))
      e.phone       = t('reg.v.phone');
    return e;
  },
  // Step 2 — Category
  step2: (d, t) => {
    const e = {};
    if (!d.category)    e.category    = t('reg.v.category');
    if (!d.sub_category) e.sub_category = t('reg.v.subcat');
    const floor = Number(d.floor_area_sqm);
    const waste = Number(d.waste_kg_per_day);
    const water = Number(d.water_liters_per_day);
    if (!(floor > 0))  e.floor_area_sqm       = t('reg.v.floor');
    if (!(waste > 0))  e.waste_kg_per_day     = t('reg.v.waste');
    if (!(water > 0))  e.water_liters_per_day = t('reg.v.water');
    // BWG condition (SWM 2026): must cross at least ONE threshold to be a Bulk Waste Generator.
    if (floor > 0 && waste > 0 && water > 0 &&
        floor < 20000 && water < 40000 && waste < 100)
      e.not_bwg = t('reg.v.notBwg');
    return e;
  },
  // Step 3 — Address
  step3: (d, t) => {
    const e = {};
    if (!d.state_code)           e.state_code    = t('reg.v.state');
    if (!d.district_name?.trim()) e.district_name = t('reg.v.district');
    if (!d.sub_district?.trim())  e.sub_district  = t('reg.v.subdistrict');
    if (!d.city_name?.trim())     e.city_name     = t('reg.v.city');
    if (!d.full_address?.trim())  e.full_address  = t('reg.v.fulladdr');
    if (!d.local_body_type)       e.local_body_type = t('reg.v.localbody');
    if (!/^\d{6}$/.test(d.pincode || '')) e.pincode = t('reg.v.pincode');
    // CPCB Step 2 requires coordinates (there is no "skip" on the portal).
    if (!d.latitude  || Number.isNaN(Number(d.latitude)))  e.latitude  = t('reg.v.lat');
    if (!d.longitude || Number.isNaN(Number(d.longitude))) e.longitude = t('reg.v.long');
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
function Step1Account({ data, onChange, onBlur, errors, loggedIn, accountEmail }) {
  const { t } = useI18n();
  const f = (key) => ({
    value:    data[key],
    onChange: (e) => onChange(key, e.target.value),
    onBlur:   () => onBlur(key),
  });

  return (
    <div className="space-y-4 animate-slide-up">
      {loggedIn ? (
        <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <strong className="text-emerald-700">{t('reg.a.addFacility')}</strong>
          <span className="text-slate-500 ml-2">{t('reg.a.addFacilitySub', { email: accountEmail })}</span>
        </div>
      ) : (
        <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <strong className="text-indigo-700">{t('reg.a.create')}</strong>
          <span className="text-slate-500 ml-2">{t('reg.a.createSub')} <Link href="/login" className="text-ruby-800 underline">{t('reg.a.haveAccount')}</Link></span>
        </div>
      )}

      {/* Org + Auth person */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">{t('reg.a.orgName')}</label>
          <input {...f('org_name')} className={`form-input ${errors.org_name ? 'error' : ''}`}
                 placeholder="Sunrise Residency RWA" id="f-orgname" />
          <FieldError msg={errors.org_name} />
        </div>
        <div>
          <label className="form-label">{t('reg.a.authPerson')}</label>
          <input {...f('auth_person')} className={`form-input ${errors.auth_person ? 'error' : ''}`}
                 placeholder="Rajesh Mehta" id="f-authname" />
          <FieldError msg={errors.auth_person} />
        </div>
      </div>

      {/* Email + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">{t('reg.a.email')}</label>
          <input {...f('email')} type="email" className={`form-input ${errors.email ? 'error' : ''}`}
                 placeholder="info@sunriserwa.org" id="f-email" autoComplete="email" />
          <p className="text-xs text-slate-400 mt-1">{t('reg.a.emailHint')}</p>
          <FieldError msg={errors.email} />
        </div>
        <div>
          <label className="form-label">{t('reg.a.mobile')}</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">+91</span>
            <input value={data.phone} onChange={e => onChange('phone', e.target.value.replace(/\D/g, ''))}
                   onBlur={() => onBlur('phone')}
                   type="tel" inputMode="numeric" maxLength={10}
                   className={`form-input pl-12 ${errors.phone ? 'error' : ''}`}
                   placeholder="9876543210" id="f-mobile" />
          </div>
          <p className="text-xs text-slate-400 mt-1">{t('reg.a.mobileHint')}</p>
          <FieldError msg={errors.phone} />
        </div>
      </div>

      {/* Password (account creation) */}
      {!loggedIn && (
        <div>
          <label className="form-label">{t('reg.a.password')}</label>
          <input value={data.password || ''} onChange={e => onChange('password', e.target.value)} onBlur={() => onBlur('password')} type="password"
                 className={`form-input ${errors.password ? 'error' : ''}`} placeholder={t('reg.a.passwordPh')} autoComplete="new-password" id="f-password" />
          <p className="text-xs text-slate-400 mt-1">{t('reg.a.passwordHint')}</p>
          <FieldError msg={errors.password} />
        </div>
      )}

      {/* OTP notice */}
      <div className="p-3 rounded-xl text-xs flex gap-2"
           style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <span className="text-emerald-600 shrink-0">📱</span>
        <span className="text-slate-600">
          <strong className="text-emerald-700">{t('reg.a.otpNotice1')}</strong>{' '}
          {t('reg.a.otpNotice2')}
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  STEP 2: Category + Sub-category (CPCB Step 2A)
// ────────────────────────────────────────────────────────────
function Step2Category({ data, onChange, onBlur, errors }) {
  const { t } = useI18n();
  const subcats = SUBCATS[data.category] || [];

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="p-3 rounded-xl text-xs"
           style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <strong className="text-indigo-700">{t('reg.c.banner1')}</strong>
        <span className="text-slate-500 ml-2">{t('reg.c.banner2')}</span>
      </div>

      {errors.not_bwg && (
        <div className="p-3 rounded-xl text-xs text-amber-800 flex gap-2"
             style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <span className="shrink-0">⚠️</span>
          <span>{errors.not_bwg}</span>
        </div>
      )}

      {/* Category + Sub-category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">{t('reg.c.category')}</label>
          <select id="f-cat"
                  value={data.category}
                  onChange={e => { onChange('category', e.target.value); onChange('sub_category', ''); }}
                  onBlur={() => onBlur('category')}
                  className={`form-input ${errors.category ? 'error' : ''}`}>
            <option value="">{t('reg.c.categorySelect')}</option>
            <option>Institutional</option>
            <option>Commercial</option>
            <option>Residential</option>
          </select>
          <FieldError msg={errors.category} />
        </div>
        <div>
          <label className="form-label">{t('reg.c.subcat')}</label>
          <select id="f-subcat"
                  value={data.sub_category}
                  onChange={e => onChange('sub_category', e.target.value)}
                  onBlur={() => onBlur('sub_category')}
                  disabled={!data.category}
                  className={`form-input ${errors.sub_category ? 'error' : ''}`}>
            <option value="">{data.category ? t('reg.c.subcatSelect') : t('reg.c.subcatFirst')}</option>
            {subcats.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <FieldError msg={errors.sub_category} />
        </div>
      </div>

      {/* Waste metrics — required on CPCB Step 2 (they appear under sub-category) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="form-label">{t('reg.c.floor')}</label>
          <input id="f-floor" type="number" min="0" inputMode="decimal"
                 value={data.floor_area_sqm}
                 onChange={e => onChange('floor_area_sqm', e.target.value)}
                 onBlur={() => onBlur('floor_area_sqm')}
                 className={`form-input ${errors.floor_area_sqm ? 'error' : ''}`} placeholder="5000" />
          <FieldError msg={errors.floor_area_sqm} />
        </div>
        <div>
          <label className="form-label">{t('reg.c.waste')}</label>
          <input id="f-waste" type="number" min="0" inputMode="decimal"
                 value={data.waste_kg_per_day}
                 onChange={e => onChange('waste_kg_per_day', e.target.value)}
                 onBlur={() => onBlur('waste_kg_per_day')}
                 className={`form-input ${errors.waste_kg_per_day ? 'error' : ''}`} placeholder="150" />
          <FieldError msg={errors.waste_kg_per_day} />
        </div>
        <div>
          <label className="form-label">{t('reg.c.water')}</label>
          <input id="f-water" type="number" min="0" inputMode="decimal"
                 value={data.water_liters_per_day}
                 onChange={e => onChange('water_liters_per_day', e.target.value)}
                 onBlur={() => onBlur('water_liters_per_day')}
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
function Step3Address({ data, onChange, onBlur, errors }) {
  const { t } = useI18n();
  const [districts, setDistricts] = useState([]);
  const [subDistricts, setSubDistricts] = useState([]);
  const [villages, setVillages] = useState([]);

  // Fetch Districts when State changes
  useEffect(() => {
    if (!data.state_name) { setDistricts([]); return; }
    fetch(`/api/lgd?type=districts&state=${encodeURIComponent(data.state_name.toUpperCase())}`)
      .then(r => r.json()).then(setDistricts).catch(() => setDistricts([]));
  }, [data.state_name]);

  // Fetch SubDistricts when District changes
  useEffect(() => {
    if (!data.state_name || !data.district_name) { setSubDistricts([]); return; }
    fetch(`/api/lgd?type=subdistricts&state=${encodeURIComponent(data.state_name.toUpperCase())}&district=${encodeURIComponent(data.district_name)}`)
      .then(r => r.json()).then(setSubDistricts).catch(() => setSubDistricts([]));
  }, [data.state_name, data.district_name]);

  // Fetch Villages when SubDistrict changes
  useEffect(() => {
    if (!data.state_name || !data.district_name || !data.sub_district) { setVillages([]); return; }
    fetch(`/api/lgd?type=villages&state=${encodeURIComponent(data.state_name.toUpperCase())}&district=${encodeURIComponent(data.district_name)}&subdistrict=${encodeURIComponent(data.sub_district)}`)
      .then(r => r.json()).then(setVillages).catch(() => setVillages([]));
  }, [data.state_name, data.district_name, data.sub_district]);

  // Handle village selection (auto-fill pincode)
  const handleVillageChange = (val) => {
    onChange('city_name', val);
    const selected = villages.find(v => v.name === val);
    if (selected && selected.pincode) {
      onChange('pincode', selected.pincode);
    }
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="p-3 rounded-xl text-xs"
           style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <strong className="text-indigo-700">{t('reg.ad.banner1')}</strong>
        <span className="text-slate-500 ml-2">{t('reg.ad.banner2')}</span>
      </div>

      {/* State + District */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">{t('reg.ad.state')}</label>
          <select id="f-state" value={data.state_code}
                  onChange={e => {
                    onChange('state_code', e.target.value);
                    onChange('state_name', INDIAN_STATES.find(s => s.code === e.target.value)?.name || '');
                    onChange('district_name', '');
                    onChange('sub_district', '');
                    onChange('city_name', '');
                  }}
                  onBlur={() => onBlur('state_code')}
                  className={`form-input ${errors.state_code ? 'error' : ''}`}>
            <option value="">{t('reg.ad.stateSelect')}</option>
            {INDIAN_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
          <FieldError msg={errors.state_code} />
        </div>
        <div>
          <label className="form-label">{t('reg.ad.district')}</label>
          <Combobox id="f-dist" value={data.district_name} options={districts || []}
                    onChange={val => {
                      onChange('district_name', val);
                      onChange('sub_district', '');
                      onChange('city_name', '');
                    }}
                    onBlur={() => onBlur('district_name')}
                    error={!!errors.district_name}
                    placeholder={t('reg.ph.district')} />
          <FieldError msg={errors.district_name} />
        </div>
      </div>

      {/* Sub-district + City */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">{t('reg.ad.subdistrict')}</label>
          <Combobox id="f-taluka" value={data.sub_district} options={subDistricts || []}
                    onChange={val => {
                      onChange('sub_district', val);
                      onChange('city_name', '');
                    }}
                    onBlur={() => onBlur('sub_district')}
                    error={!!errors.sub_district}
                    placeholder={t('reg.ph.subdistrict')} />
          <FieldError msg={errors.sub_district} />
        </div>
        <div>
          <label className="form-label">{t('reg.ad.city')}</label>
          <Combobox id="f-city" value={data.city_name} options={villages.map(v => v.name)}
                    onChange={handleVillageChange}
                    onBlur={() => onBlur('city_name')}
                    error={!!errors.city_name}
                    placeholder={t('reg.ph.city')} />
          <FieldError msg={errors.city_name} />
        </div>
      </div>

      {/* Full address */}
      <div>
        <label className="form-label">{t('reg.ad.fulladdr')}</label>
        <textarea id="f-addr" rows={2} value={data.full_address}
                  onChange={e => onChange('full_address', e.target.value)}
                  onBlur={() => onBlur('full_address')}
                  className={`form-input resize-none ${errors.full_address ? 'error' : ''}`}
                  placeholder="Plot 12, Sector 4, Near Bus Stand, Bopal" />
        <p className="text-xs text-slate-400 mt-1">{t('reg.ad.fulladdrHint')}</p>
        <FieldError msg={errors.full_address} />
      </div>

      {/* Local body + Pincode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">{t('reg.ad.localbody')}</label>
          <select id="f-localbody" value={data.local_body_type}
                  onChange={e => onChange('local_body_type', e.target.value)}
                  onBlur={() => onBlur('local_body_type')}
                  className={`form-input ${errors.local_body_type ? 'error' : ''}`}>
            <option value="">{t('reg.ad.localbodySelect')}</option>
            <option value="Urban Local Body (ULB)">{t('reg.ad.ulb')}</option>
            <option value="Rural Local Body (RLB)">{t('reg.ad.rlb')}</option>
          </select>
          <FieldError msg={errors.local_body_type} />
        </div>
        <div>
          <label className="form-label">{t('reg.ad.pincode')}</label>
          <input id="f-pin" type="text" inputMode="numeric" maxLength={6} value={data.pincode}
                 onChange={e => onChange('pincode', e.target.value.replace(/\D/g, ''))}
                 onBlur={() => onBlur('pincode')}
                 className={`form-input ${errors.pincode ? 'error' : ''}`}
                 placeholder="382010" />
          <FieldError msg={errors.pincode} />
        </div>
      </div>

      {/* Zone + Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">{t('reg.ad.zone')} <span className="text-slate-400 font-normal normal-case">{t('reg.ad.optional')}</span></label>
          <input id="f-zone" value={data.zone_board}
                 onChange={e => onChange('zone_board', e.target.value)}
                 className="form-input" placeholder={t('reg.ph.zone')} />
        </div>
        <div>
          <label className="form-label">{t('reg.ad.block')} <span className="text-slate-400 font-normal normal-case">{t('reg.ad.optional')}</span></label>
          <input id="f-block" value={data.block_ward}
                 onChange={e => onChange('block_ward', e.target.value)}
                 className="form-input" placeholder={t('reg.ph.block')} />
        </div>
      </div>

      {/* Lat/Lng — required by CPCB Step 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="form-label">{t('reg.ad.lat')}</label>
          <input id="f-lat" type="number" step="0.0001" value={data.latitude}
                 onChange={e => onChange('latitude', e.target.value)}
                 onBlur={() => onBlur('latitude')}
                 className={`form-input ${errors.latitude ? 'error' : ''}`} placeholder="19.0760" />
          <FieldError msg={errors.latitude} />
        </div>
        <div>
          <label className="form-label">{t('reg.ad.long')}</label>
          <input id="f-lng" type="number" step="0.0001" value={data.longitude}
                 onChange={e => onChange('longitude', e.target.value)}
                 onBlur={() => onBlur('longitude')}
                 className={`form-input ${errors.longitude ? 'error' : ''}`} placeholder="72.8777" />
          <FieldError msg={errors.longitude} />
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-2">💡 {t('reg.ad.latHint')}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  CONSENT — declarations gate (before submit)
// ────────────────────────────────────────────────────────────
const CONSENT_ITEMS = [
  { key: 'terms',   tkey: 'reg.consent1' },
  { key: 'declare', tkey: 'reg.consent2' },
  { key: 'scope',   tkey: 'reg.consent3' },
];

function ConsentGate({ consent, onChange }) {
  const { t } = useI18n();
  return (
    <div className="mt-7 pt-6 border-t border-slate-100 space-y-3 animate-fade-in">
      <p className="section-label mb-1">{t('reg.consentTitle')}</p>
      {CONSENT_ITEMS.map(({ key, tkey }) => (
        <label key={key}
               className="flex gap-3 items-start p-3 rounded-xl cursor-pointer transition-colors"
               style={{
                 background: consent[key] ? 'rgba(16,185,129,0.06)' : 'rgba(148,163,184,0.05)',
                 border: `1px solid ${consent[key] ? 'rgba(16,185,129,0.25)' : 'rgba(148,163,184,0.18)'}`,
               }}>
          <input type="checkbox" checked={consent[key]} required
                 onChange={(e) => onChange(key, e.target.checked)}
                 className="mt-0.5 w-4 h-4 accent-emerald-600 shrink-0" />
          <span className="text-xs text-slate-600 leading-relaxed">
            {t(tkey)}
            {key === 'terms' && (
              <>
                {' '}
                <Link href="/legal/terms" target="_blank" onClick={(e) => e.stopPropagation()}
                      className="text-ruby-800 underline font-medium whitespace-nowrap">
                  {t('reg.consentTermsLink')}
                </Link>
              </>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  SERVICE SELECTOR — one account, multiple services
// ────────────────────────────────────────────────────────────
function ServiceSelector({ service, onSelect }) {
  const { t } = useI18n();
  const opts = [
    { id: 'solid_waste', label: t('reg.svc.solid'), desc: t('reg.svc.solidDesc'), icon: Recycle, live: true },
    { id: 'ewaste',      label: t('reg.svc.ewaste'), desc: t('reg.svc.ewasteDesc'), icon: Battery, live: false },
  ];
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('reg.svc.choose')}</p>
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
                  {o.live ? t('reg.svc.available') : t('reg.svc.soon')}
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
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');   // idle | loading | done | error
  const [msg, setMsg]     = useState('');
  async function join(e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setState('error'); setMsg(t('reg.ew.invalidEmail')); return; }
    setState('loading'); setMsg('');
    try {
      const res = await fetch('/api/ewaste-waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const d = await res.json();
      if (!res.ok) { setState('error'); setMsg(d.error || t('reg.ew.err')); return; }
      setState('done'); setMsg(d.already ? t('reg.ew.already') : t('reg.ew.done'));
    } catch { setState('error'); setMsg(t('reg.ew.err')); }
  }
  return (
    <GlassCard variant="frosted" className="p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
        <Battery size={26} className="text-amber-600" />
      </div>
      <h2 className="font-display text-xl font-bold text-slate-800">{t('reg.ew.h')}</h2>
      <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">{t('reg.ew.p')}</p>
      {state === 'done' ? (
        <div className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 max-w-md mx-auto">
          <p className="text-sm font-semibold text-emerald-800 flex items-center justify-center gap-2"><CheckCircle size={16} /> {msg}</p>
        </div>
      ) : (
        <form onSubmit={join} className="mt-5 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.in" className="form-input flex-1" />
          <button type="submit" disabled={state === 'loading'} className="btn-ruby px-5 py-2.5 text-sm gap-2 disabled:opacity-50">
            {state === 'loading' ? <><Loader2 size={15} className="animate-spin" />{t('reg.ew.joining')}</> : t('reg.ew.join')}
          </button>
        </form>
      )}
      {state === 'error' && <p className="text-xs text-red-600 mt-2">{msg}</p>}
      <p className="text-xs text-slate-400 mt-4">{t('reg.ew.switch')}</p>
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
  const { t } = useI18n();
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

  // Which fields the user has already left once — only these validate live, so
  // we never flash an error while someone is still typing their first value.
  const [touched, setTouched] = useState({});

  const stepErrors = (whichStep, data) => {
    if (whichStep === 1) {
      const e = validate.step1(data, t);
      if (!loggedIn && (!data.password || data.password.length < 8)) e.password = t('reg.v.password');
      return e;
    }
    if (whichStep === 2) return validate.step2(data, t);
    return validate.step3(data, t);
  };

  // Live-update one field's error as the user types — but only after it's been
  // touched (blurred once). Untouched fields just clear, so typing isn't nagged.
  const liveField = (whichStep, key, data) => {
    setErrors(prev => {
      if (!touched[key]) return { ...prev, [key]: '' };
      const errs = stepErrors(whichStep, data);
      const next = { ...prev, [key]: errs[key] || '' };
      if (whichStep === 2) next.not_bwg = errs.not_bwg || '';
      return next;
    });
  };

  // On blur: mark touched and show that field's error immediately.
  const blurField = (whichStep, key, data) => {
    setTouched(prev => ({ ...prev, [key]: true }));
    const errs = stepErrors(whichStep, data);
    setErrors(prev => {
      const next = { ...prev, [key]: errs[key] || '' };
      if (whichStep === 2) next.not_bwg = errs.not_bwg || '';
      return next;
    });
  };

  const updateAccount  = (k, v) => { const nd = { ...account,  [k]: v }; setAccount(nd);  liveField(1, k, nd); };
  const updateCategory = (k, v) => { const nd = { ...category, [k]: v }; setCategory(nd); liveField(2, k, nd); };
  const updateAddress  = (k, v) => { const nd = { ...address,  [k]: v }; setAddress(nd);  liveField(3, k, nd); };

  const blurAccount  = (k) => blurField(1, k, account);
  const blurCategory = (k) => blurField(2, k, category);
  const blurAddress  = (k) => blurField(3, k, address);

  function validateCurrentStep() {
    let errs = {};
    if (step === 1) {
      errs = validate.step1(account, t);
      if (!loggedIn && (!account.password || account.password.length < 8))
        errs.password = t('reg.v.password');
    }
    if (step === 2) errs = validate.step2(category, t);
    if (step === 3) errs = validate.step3(address, t);
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
      // Single atomic call: the org, metrics and address are written together in
      // one DB transaction server-side — no risk of a half-saved registration.
      const regRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...account, ...category, plan: planFromUrl,
          metrics: {
            floor_area_sqm:       Number(category.floor_area_sqm)       || 0,
            waste_kg_per_day:     Number(category.waste_kg_per_day)     || 0,
            water_liters_per_day: Number(category.water_liters_per_day) || 0,
            qualifying_criteria: '[]',
          },
          address: {
            ...address,
            zone_ward: (address.zone_board || '') + (address.block_ward ? ' / ' + address.block_ward : ''),
          },
        }),
      });
      const reg = await regRes.json();
      if (!regRes.ok) throw new Error(reg.error || 'Registration failed');

      // Registration also created/attached the account + logged them in → dashboard.
      router.push('/dashboard');

    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const ICONS    = [User, Building2, MapPin];
  const TITLES   = [t('reg.t1'), t('reg.t2'), t('reg.t3')];
  const SUBTITLES = [t('reg.s1'), t('reg.s2'), t('reg.s3')];
  const StepIcon = ICONS[step - 1];

  return (
    <div className="min-h-screen bg-mesh dot-grid">
      <SiteNavbar right={<span className="text-xs text-white/70 hidden lg:inline">{t('reg.chrome')} — {planFromUrl}</span>} />

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

          {step === 1 && <Step1Account  data={account}  onChange={updateAccount}  onBlur={blurAccount}  errors={errors} loggedIn={loggedIn} accountEmail={accountEmail} />}
          {step === 2 && <Step2Category data={category} onChange={updateCategory} onBlur={blurCategory} errors={errors} />}
          {step === 3 && (
            <>
              <Step3Address data={address} onChange={updateAddress} onBlur={blurAddress} errors={errors} />
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
              <ArrowLeft size={15} /> {t('reg.back')}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{step} / 3</span>
              {step < 3 ? (
                <button type="button" id={`register-next-${step}`} onClick={next}
                        className="btn-ruby py-2.5 px-6 text-sm gap-2">
                  {t('reg.continue')} <ArrowRight size={15} />
                </button>
              ) : (
                <button type="button" id="register-submit" onClick={handleSubmit} disabled={loading || !allConsent}
                        className="btn-ruby py-2.5 px-6 text-sm gap-2">
                  {loading
                    ? <><Loader2 size={15} className="animate-spin" />{t('reg.submitting')}</>
                    : <><CheckCircle size={15} />{t('reg.submit')}</>
                  }
                </button>
              )}
            </div>
          </div>

          {step === 3 && !allConsent && (
            <p className="text-right text-xs text-slate-400 mt-2">
              {t('reg.consentReq')}
            </p>
          )}
        </GlassCard>
        </>)}

        <p className="text-center text-xs text-slate-400 mt-4">
          🔒 {t('reg.disclaimer')}
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
