'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck, ArrowLeft, Loader2, CheckCircle, AlertTriangle,
  Building2, MapPin, BarChart3, Clock, FileText, ExternalLink
} from 'lucide-react';
import GlassCard    from '../../components/GlassCard';
import PaymentButton from '../../components/PaymentButton';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useI18n } from '../../lib/i18n';

const STATUS_CONFIG = {
  New:          { label: 'Submitted',     color: '#475569', bg: 'rgba(71,85,105,0.08)',   icon: Clock,         desc: 'Your registration has been received.' },
  UnderReview:  { label: 'Under Review',  color: '#1d4ed8', bg: 'rgba(59,130,246,0.08)',  icon: Clock,         desc: 'Retainer received. Consultant will call within 24 hours.' },
  Scheduled:    { label: 'Scheduled',     color: '#4338ca', bg: 'rgba(99,102,241,0.08)',  icon: CheckCircle,   desc: 'Consultation booked. Balance invoice on the way.' },
  AwaitingPayment: { label: 'Awaiting Payment', color: '#a16207', bg: 'rgba(245,158,11,0.10)', icon: Clock,    desc: 'Balance invoice sent. Pay to release filing.' },
  NeedsAttention: { label: 'Action Needed', color: '#b91c1c', bg: 'rgba(239,68,68,0.08)', icon: AlertTriangle, desc: 'A consultant will contact you shortly.' },
  'Paid':       { label: 'Payment Done',  color: '#1d4ed8', bg: 'rgba(59,130,246,0.08)',  icon: CheckCircle,   desc: 'Payment verified. Awaiting agent processing.' },
  'Queued':     { label: 'In Queue',      color: '#7c3aed', bg: 'rgba(124,58,237,0.08)',  icon: Clock,         desc: 'Your filing is queued for processing.' },
  'In Progress':{ label: 'Filing Active', color: '#a16207', bg: 'rgba(234,179,8,0.10)',   icon: Loader2,       desc: 'Our agent is filing on CPCB portal.' },
  Completed:    { label: 'Completed',     color: '#065f46', bg: 'rgba(16,185,129,0.10)',  icon: CheckCircle,   desc: 'Acknowledgement number issued.' },
  Failed:       { label: 'Failed',        color: '#991b1b', bg: 'rgba(239,68,68,0.08)',   icon: AlertTriangle, desc: 'Filing failed. Our team will retry shortly.' },
};

function SummaryRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
           style={{ background: 'rgba(22, 101, 74,0.07)' }}>
        <Icon size={13} className="text-ruby-800" />
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm text-slate-700 font-medium">{value}</p>
      </div>
    </div>
  );
}

function PortalContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const bwg   = searchParams.get('bwg') === '1';

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [paid,    setPaid]    = useState(false);

  async function reload() {
    try {
      const r = await fetch(`/api/status/${token}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setData(d);
      if (['Paid', 'Queued', 'In Progress', 'Completed'].includes(d.org?.status)) setPaid(true);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!token) { setError(t('pt.noToken')); setLoading(false); return; }
    reload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);


  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 size={28} className="animate-spin text-ruby-800" />
      <p className="text-sm text-slate-500">{t('pt.loading')}</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-20">
      <AlertTriangle size={36} className="text-red-400 mx-auto mb-3" />
      <p className="text-slate-700 font-medium">{error}</p>
      <div className="flex items-center justify-center gap-3 mt-6">
        <Link href="/register" className="btn-ruby inline-flex">{t('wizard.startReg')}</Link>
        <Link href="/find" className="btn-ghost inline-flex">{t('find.h')}</Link>
      </div>
    </div>
  );

  const status   = data?.org?.status || 'New';
  const cfg      = STATUS_CONFIG[status] || STATUS_CONFIG.New;
  const sKey     = (STATUS_CONFIG[status] ? status : 'New').replace(/\s/g, '');
  const cfgLabel = t(`pt.s.${sKey}.l`);
  const cfgDesc  = t(`pt.s.${sKey}.d`);
  const StatusIcon = cfg.icon;
  const planLabel = (data?.org?.plan || 'standard');
  const PLAN_AMOUNTS = { standard: '2,999', professional: '7,499', enterprise: '24,999' };
  const retainerPaid  = !!data?.org?.retainer_paid;
  const balanceUrl    = data?.org?.balance_invoice_url;
  const balanceRupees = data?.org?.balance_amount_paise ? Math.round(data.org.balance_amount_paise / 100) : null;

  return (
    <div className="space-y-6 page-transition">

      {/* Status card */}
      <GlassCard variant="frosted" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: cfg.bg }}>
              <StatusIcon size={20} style={{ color: cfg.color }} className={status === 'In Progress' ? 'animate-spin' : ''} />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{t('pt.filingStatus')}</p>
              <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>
                ● {cfgLabel}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">{t('pt.regToken')}</p>
            <p className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{token?.slice(0, 16)}…</p>
          </div>
        </div>
        <p className="text-sm text-slate-500">{cfgDesc}</p>

        {/* Acknowledgement number */}
        {data?.org?.ack_number && (
          <div className="mt-4 p-4 rounded-xl"
               style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <p className="text-xs font-semibold text-emerald-700 mb-1">{t('pt.ackNum')}</p>
            <p className="font-mono text-lg font-bold text-emerald-800">{data.org.ack_number}</p>
            <p className="text-xs text-emerald-600 mt-1">{t('pt.ackNote')}</p>
          </div>
        )}
      </GlassCard>

      {/* Summary + Payment grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Registration Summary */}
        <GlassCard className="p-6 space-y-4">
          <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <FileText size={15} className="text-ruby-800" /> {t('pt.summary')}
          </p>
          <SummaryRow icon={Building2} label={t('pt.sum.org')}         value={data?.org?.org_name} />
          <SummaryRow icon={Building2} label={t('pt.sum.category')}    value={data?.org?.category} />
          <SummaryRow icon={Building2} label={t('pt.sum.subcategory')} value={data?.org?.sub_category} />
          <SummaryRow icon={Building2} label={t('pt.sum.authPerson')}  value={data?.org?.auth_person} />
          <SummaryRow icon={MapPin}    label={t('pt.sum.address')}     value={data?.address?.full_address || `${data?.address?.city_name}, ${data?.address?.district_name}`} />
          <SummaryRow icon={BarChart3} label={t('pt.sum.bwg')}         value={data?.metrics?.is_bulk_waste_generator ? t('pt.bwgYes') : t('pt.bwgNo')} />
          {data?.metrics?.floor_area_sqm   > 0 && <SummaryRow icon={BarChart3} label={t('pt.sum.floor')} value={`${data.metrics.floor_area_sqm.toLocaleString()} sqm`} />}
          {data?.metrics?.waste_kg_per_day > 0 && <SummaryRow icon={BarChart3} label={t('pt.sum.waste')} value={`${data.metrics.waste_kg_per_day} kg/day`} />}
          {data?.metrics?.water_liters_per_day > 0 && <SummaryRow icon={BarChart3} label={t('pt.sum.water')} value={`${data.metrics.water_liters_per_day.toLocaleString()} L/day`} />}
        </GlassCard>

        {/* Payment / Lock Gate */}
        <GlassCard className="p-6 flex flex-col">
          {bwg ? (
            <>
              {/* 1 ▸ New / Under review — awaiting consultant + invoice (no upfront payment) */}
              {['New', 'UnderReview'].includes(status) && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-5 rounded-xl"
                     style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <Clock size={30} className="text-blue-600 mb-2" />
                  <p className="font-semibold text-blue-800">{t('pt.newTitle')}</p>
                  <p className="text-sm text-blue-700/80 mt-2 leading-relaxed">{t('pt.newBody')}</p>
                  <a href={`/status/${token}`} className="text-xs text-blue-700 underline mt-3">{t('pt.trackStatus')}</a>
                </div>
              )}

              {/* 2 ▸ Scheduled — consultation booked, invoice on the way */}
              {status === 'Scheduled' && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-5 rounded-xl"
                     style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <CheckCircle size={30} className="text-indigo-600 mb-2" />
                  <p className="font-semibold text-indigo-800">{t('pt.schedTitle')}</p>
                  <p className="text-sm text-indigo-700/80 mt-2 leading-relaxed">{t('pt.schedBody')}</p>
                </div>
              )}

              {/* 3 ▸ Awaiting payment — the invoice */}
              {status === 'AwaitingPayment' && (
                <>
                  <div className="mb-4 p-4 rounded-xl"
                       style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)' }}>
                    <p className="text-sm font-semibold text-amber-800">{t('pt.invoiceTitle')}</p>
                    <p className="font-display text-2xl font-bold text-amber-800 mt-1">₹{balanceRupees?.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-amber-700/80 mt-1">{t('pt.invoiceSub')}</p>
                  </div>
                  <div className="flex-1 flex flex-col justify-end gap-2">
                    {balanceUrl && (
                      <a href={balanceUrl} target="_blank" rel="noopener noreferrer"
                         className="btn-ruby w-full text-center py-3 rounded-xl">
                        {t('pt.paySecure', { amount: balanceRupees?.toLocaleString('en-IN') })}
                      </a>
                    )}
                  </div>
                </>
              )}

              {/* 5 ▸ Paid / in progress / done — filing in progress */}
              {paid && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-5 rounded-xl"
                     style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <CheckCircle size={32} className="text-emerald-600 mb-2" />
                  <p className="font-semibold text-emerald-800">{t('pt.paidTitle')}</p>
                  <p className="text-sm text-emerald-700/80 mt-2 leading-relaxed">{t('pt.paidBody')}</p>
                  <div className="mt-3 text-xs text-emerald-700/70 bg-white/40 rounded-lg px-3 py-2 border border-emerald-200">
                    {t('pt.paidOtpNote')}
                  </div>
                  <a href={`/status/${token}`}
                     className="text-xs text-emerald-700 underline mt-3 flex items-center gap-1">
                    {t('pt.trackLive')} <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </>
          ) : (
            /* Not a BWG */
            <div className="flex flex-col items-center justify-center flex-1 text-center py-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                   style={{ background: 'rgba(16,185,129,0.10)' }}>
                <CheckCircle size={28} className="text-emerald-600" />
              </div>
              <p className="font-semibold text-slate-800 mb-2">{t('pt.bwgNoTitle')}</p>
              <p className="text-sm text-slate-500 max-w-xs">{t('pt.bwgNoBody')}</p>
              <div className="mt-4 p-3 rounded-xl text-xs text-slate-500"
                   style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.15)' }}>
                {t('pt.bwgNoNote')}
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Policy note */}
      <p className="text-center text-xs text-slate-400 leading-relaxed">{t('pt.policy')}</p>
    </div>
  );
}

export default function PortalPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-mesh">
      {/* Header */}
      <header className="glass border-b border-white/50 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors">
            <ArrowLeft size={16} />
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-ruby-800" />
              <span className="font-display font-bold text-sm">Indian Waste<span className="text-ruby-800">Portal</span></span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <span className="text-xs text-slate-400 font-medium hidden md:inline">{t('pt.chrome')}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-ruby-800" />
          </div>
        }>
          <PortalContent />
        </Suspense>
      </main>
    </div>
  );
}
