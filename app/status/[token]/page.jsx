'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Loader2, CheckCircle, Clock, Zap, AlertCircle, ExternalLink, Copy, CheckCheck } from 'lucide-react';
import GlassCard    from '../../../components/GlassCard';
import QueueStatus  from '../../../components/QueueStatus';
import LanguageSwitcher from '../../../components/LanguageSwitcher';
import { useI18n } from '../../../lib/i18n';

const buildTimeline = (t) => [
  { status: 'New',         label: t('st.tl.new.l'),    desc: t('st.tl.new.d') },
  { status: 'Paid',        label: t('st.tl.paid.l'),   desc: t('st.tl.paid.d') },
  { status: 'Queued',      label: t('st.tl.queued.l'), desc: t('st.tl.queued.d') },
  { status: 'In Progress', label: t('st.tl.prog.l'),   desc: t('st.tl.prog.d') },
  { status: 'Completed',   label: t('st.tl.done.l'),   desc: t('st.tl.done.d') },
];

// Where each real status sits on the 5-step timeline. Fractional values place a
// status *between* two steps (e.g. AwaitingPayment = registered but not yet paid).
const STEP_ORDER = ['New', 'Paid', 'Queued', 'In Progress', 'Completed'];
const STATUS_INDEX = {
  New: 0, UnderReview: 0, Scheduled: 0,
  AwaitingPayment: 0.5,
  Paid: 1, Queued: 2,
  'In Progress': 3, AwaitingOTP: 3, Verifying: 3, NeedsAttention: 3,
  Completed: 4,
};

function TimelineStep({ step, currentStatus }) {
  const currentIdx = STATUS_INDEX[currentStatus] ?? 0;
  const stepIdx    = STEP_ORDER.indexOf(step.status);
  const isDone     = stepIdx < currentIdx;
  const isActive   = stepIdx === currentIdx;

  return (
    <div className="flex gap-4">
      {/* Dot */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500
          ${isDone   ? 'bg-emerald-100 border-2 border-emerald-500' :
            isActive ? 'border-2 border-ruby-800 bg-ruby-50 animate-pulse-ruby' :
                       'bg-slate-100 border-2 border-slate-200'}`}>
          {isDone
            ? <CheckCircle size={14} className="text-emerald-600" />
            : isActive
              ? <Zap size={13} className="text-ruby-800" />
              : <Clock size={13} className="text-slate-400" />
          }
        </div>
        {/* Connector line */}
        <div className={`w-0.5 flex-1 mt-1 ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`}
             style={{ minHeight: '20px' }} />
      </div>

      {/* Content */}
      <div className="pb-6">
        <p className={`text-sm font-semibold ${isDone ? 'text-emerald-700' : isActive ? 'text-ruby-800' : 'text-slate-400'}`}>
          {step.label}
        </p>
        <p className={`text-xs mt-0.5 ${isDone || isActive ? 'text-slate-500' : 'text-slate-300'}`}>
          {step.desc}
        </p>
      </div>
    </div>
  );
}

// ── Manual-filing OTP relay: client shares the CPCB OTP on their own screen ──
function ManualOtpCard({ token }) {
  const { t } = useI18n();
  const [otp, setOtp]     = useState('');
  const [state, setState] = useState('idle');   // idle | loading | done | error
  const [msg, setMsg]     = useState('');
  async function submit(e) {
    e.preventDefault();
    const code = otp.replace(/\s/g, '');
    if (!/^\d{4,8}$/.test(code)) { setState('error'); setMsg(t('st.otp.numeric')); return; }
    setState('loading'); setMsg('');
    try {
      const res = await fetch('/api/status/otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, otp: code }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setState('error'); setMsg(d.error || t('st.otp.failed')); return; }
      setState('done'); setMsg(t('st.otp.done')); setOtp('');
    } catch { setState('error'); setMsg(t('st.otp.network')); }
  }
  if (state === 'done') {
    return (
      <div className="mb-5 p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.3)' }}>
        <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2"><CheckCircle size={16} /> {msg}</p>
      </div>
    );
  }
  return (
    <div className="mb-5 p-4 rounded-xl" style={{ background: 'rgba(234,179,8,0.09)', border: '1.5px solid rgba(234,179,8,0.32)' }}>
      <p className="text-sm font-bold text-amber-800 flex items-center gap-2"><AlertCircle size={16} className="shrink-0" /> {t('st.otp.title')}</p>
      <p className="text-xs text-slate-500 mt-1">{t('st.otp.body')}</p>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input value={otp} onChange={e => setOtp(e.target.value)} inputMode="numeric" placeholder={t('st.otp.ph')}
               className="flex-1 px-3 py-2 border rounded-xl text-sm" />
        <button type="submit" disabled={state === 'loading'} className="btn-ruby px-4 py-2 text-sm gap-2 disabled:opacity-50">
          {state === 'loading' ? <><Loader2 size={14} className="animate-spin" />…</> : t('st.otp.share')}
        </button>
      </form>
      {state === 'error' && <p className="text-xs text-red-600 mt-2">{msg}</p>}
    </div>
  );
}

export default function StatusPage({ params }) {
  const { t } = useI18n();
  const { token } = params;
  const TIMELINE = buildTimeline(t);
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [copied,   setCopied]   = useState(false);
  const [polling,  setPolling]  = useState(true);

  async function fetchStatus() {
    try {
      const res = await fetch(`/api/status/${token}`);
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error);
      setData(d);
      if (d.org?.status === 'Completed') setPolling(false);
    } catch (e) {
      setError(e.message);
      setPolling(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    // Poll every 15 seconds while processing
    let interval;
    if (polling) {
      interval = setInterval(fetchStatus, 15_000);
    }
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling, token]);

  function copyAck() {
    if (data?.org?.ack_number) {
      navigator.clipboard.writeText(data.org.ack_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-mesh">
      <header className="glass border-b border-white/50 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors">
            <ArrowLeft size={16} />
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-ruby-800" />
              <span className="font-display font-bold text-sm">Indian Waste<span className="text-ruby-800">Portal</span></span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <span className="text-xs text-slate-400 font-medium hidden md:inline">{t('st.chrome')}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 page-transition">
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Loader2 size={28} className="animate-spin text-ruby-800" />
            <p className="text-sm text-slate-500">{t('st.loading')}</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <AlertCircle size={36} className="text-red-400 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">{error}</p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <Link href="/find" className="btn-ruby inline-flex">{t('find.h')}</Link>
              <Link href="/" className="btn-ghost inline-flex">{t('st.home')}</Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Timeline */}
            <GlassCard variant="frosted" className="p-7">
              <p className="section-label mb-5">{t('st.progress')}</p>

              {data?.org?.status === 'NeedsAttention' && (
                <div className="mb-5 flex items-start gap-2 p-3 rounded-xl text-sm text-amber-800"
                     style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span><strong>{t('st.attn.title')}</strong> {t('st.attn.body')}</span>
                </div>
              )}

              {/* Manual filing: consultant asked the client to share the CPCB OTP */}
              {data?.org?.otp_requested_at && data?.org?.status !== 'Completed' &&
                (!data.org.manual_otp_at || data.org.manual_otp_at < data.org.otp_requested_at) && (
                <ManualOtpCard token={token} />
              )}

              {/* Payment required — invoice sent, awaiting payment */}
              {data?.org?.status === 'AwaitingPayment' && (() => {
                const rupees = data.org.balance_amount_paise
                  ? `₹${(data.org.balance_amount_paise / 100).toLocaleString('en-IN')}`
                  : null;
                const payUrl = data.org.balance_invoice_url || `/portal?token=${token}&pay=balance`;
                return (
                  <div className="mb-5 p-4 rounded-xl"
                       style={{ background: 'rgba(234,179,8,0.09)', border: '1.5px solid rgba(234,179,8,0.32)' }}>
                    <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
                      <AlertCircle size={16} className="shrink-0" /> {t('st.pay.title')}
                    </p>
                    {rupees && <p className="font-display text-2xl font-bold text-slate-800 mt-2">{rupees}</p>}
                    <p className="text-xs text-slate-500 mt-1">{t('st.pay.body')}</p>
                    <a href={payUrl} className="btn-ruby inline-flex mt-3 w-full justify-center">
                      {t('st.pay.cta', { amount: rupees || 'now' })}
                    </a>
                  </div>
                );
              })()}

              <div>
                {TIMELINE.map((step) => (
                  <TimelineStep key={step.status} step={step} currentStatus={data?.org?.status || 'New'} />
                ))}
              </div>
              {data?.org?.status !== 'Completed' && (
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-2">
                  <Loader2 size={11} className="animate-spin" />
                  {t('st.refresh')}
                </p>
              )}

              {/* Live queue widget — shows OTP intercept / lockout when agent needs it */}
              {['Paid', 'Queued', 'In Progress', 'NeedsAttention'].includes(data?.org?.status) && (
                <div className="mt-6">
                  <QueueStatus
                    token={token}
                    initialPos={data?.org?.queue_position}
                    onCompleted={() => fetchStatus()}
                  />
                </div>
              )}
            </GlassCard>

            {/* Details panel */}
            <div className="space-y-4">
              {/* Org */}
              <GlassCard className="p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('st.org')}</p>
                <p className="font-semibold text-slate-800">{data?.org?.org_name}</p>
                <p className="text-sm text-slate-500">{data?.org?.org_type}</p>
                <p className="text-sm text-slate-500 mt-1">{data?.org?.email}</p>
                {data?.org?.payment_verified && (
                  <a href={`/api/receipt/${token}/pdf`} target="_blank" rel="noopener noreferrer"
                     className="text-xs text-ruby-800 underline flex items-center gap-1 mt-3 hover:text-ruby-700">
                    {t('st.receipt')} <ExternalLink size={10} />
                  </a>
                )}
              </GlassCard>

              {/* Acknowledgement number */}
              {data?.org?.ack_number ? (
                <GlassCard className="p-5 animate-scale-in" glow>
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">
                    {t('st.ackTitle')}
                  </p>
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-xl font-bold text-slate-800 flex-1 break-all">
                      {data.org.ack_number}
                    </p>
                    <button onClick={copyAck}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-slate-100"
                            title={t('st.copyAck')}>
                      {copied ? <CheckCheck size={15} className="text-emerald-600" /> : <Copy size={15} className="text-slate-500" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{t('st.ackNote')}</p>
                  <a href="https://swm.cpcb.gov.in" target="_blank" rel="noopener noreferrer"
                     className="text-xs text-ruby-800 underline flex items-center gap-1 mt-2 hover:text-ruby-700">
                    {t('st.verifyCpcb')} <ExternalLink size={10} />
                  </a>
                </GlassCard>
              ) : (
                <GlassCard className="p-5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('st.ackPending')}</p>
                  <div className="skeleton h-8 w-48 rounded-lg" />
                  <p className="text-xs text-slate-400 mt-2">{t('st.ackPendingNote')}</p>
                </GlassCard>
              )}

              {/* Token */}
              <GlassCard className="p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{t('st.token')}</p>
                <p className="font-mono text-xs text-slate-600 break-all">{token}</p>
                <p className="text-xs text-slate-400 mt-1">{t('st.tokenNote')}</p>
              </GlassCard>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
