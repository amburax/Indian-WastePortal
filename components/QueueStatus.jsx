'use client';
import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, Clock, Users, Zap, AlertCircle, ExternalLink } from 'lucide-react';
import { useI18n } from '../lib/i18n';

/**
 * QueueStatus — Real-time queue position display
 *
 * Shows after payment is verified. Polls /api/queue/position every 15s.
 * Displays:
 *   - Queue position (#X in line)
 *   - Jobs ahead count
 *   - Estimated wait time
 *   - Animated step progress
 *   - ACK number when completed
 *
 * Props:
 *   token:        string   — payment_token for the org
 *   initialPos:   number   — queue position (from payment response)
 *   onCompleted:  function — called when status becomes Completed
 */
export default function QueueStatus({ token, initialPos, onCompleted }) {
  const { t } = useI18n();
  const [data,     setData]     = useState(null);
  const [error,    setError]    = useState('');
  const [pulse,    setPulse]    = useState(false);
  const intervalRef = useRef(null);

  // Intercept state
  const [otp, setOtp] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [submittingIntercept, setSubmittingIntercept] = useState(false);
  const [interceptError, setInterceptError] = useState('');

  const MAX_OTP_ATTEMPTS = 3;
  const isFuture = (ts) => {
    if (!ts) return false;
    const ms = Date.parse(ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z');
    return !Number.isNaN(ms) && ms > Date.now();
  };

  async function fetchStatus() {
    try {
      const res = await fetch(`/api/queue/position?token=${token}`);
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error || t('qs.err_fetch'));

      setData(prev => {
        // Trigger pulse animation when data changes
        if (prev && (prev.jobs_ahead !== d.jobs_ahead || prev.status !== d.status)) {
          setPulse(true);
          setTimeout(() => setPulse(false), 600);
        }
        return d;
      });

      // Stop polling when done
      if (d.status === 'Completed' || d.status === 'Failed') {
        clearInterval(intervalRef.current);
        if (d.status === 'Completed') onCompleted?.(d);
      }
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    fetchStatus();
    // Poll every 15 seconds
    intervalRef.current = setInterval(fetchStatus, 15_000);
    return () => clearInterval(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const status    = data?.status || 'Queued';
  const position  = data?.position || initialPos || '…';
  const jobsAhead = data?.jobs_ahead ?? 0;
  const eta       = data?.eta_minutes || 0;
  const ackNumber = data?.ack_number;
  const portalStatus = data?.portal_status;

  async function submitIntercept(e) {
    e.preventDefault();
    setSubmittingIntercept(true);
    setInterceptError('');
    try {
      const res = await fetch('/api/intercept/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, otp, captchaText: captcha })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setInterceptError(d.error || 'Submission failed'); return; }
      setOtp(''); setCaptcha('');
      // Force an immediate refresh
      fetchStatus();
    } catch {
      setInterceptError('Network error — please try again.');
    } finally {
      setSubmittingIntercept(false);
    }
  }

  const otpAttempts = data?.job?.otp_attempts || 0;
  const attemptsLeft = Math.max(0, MAX_OTP_ATTEMPTS - otpAttempts);
  const locked = status === 'NeedsAttention' || isFuture(data?.job?.otp_locked_until);

  // ── OTP Lockout ─────────────────────────────────────────
  if (locked) {
    return (
      <div className="glass-frosted rounded-2xl p-6 animate-scale-in">
        <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
          <AlertCircle size={20} className="text-amber-600" /> {t('qs.lock_title')}
        </h3>
        <p className="text-sm text-slate-500">
          {t('qs.lock_p1').replace('{max}', MAX_OTP_ATTEMPTS)}<strong className="text-slate-700">{t('qs.lock_p2')}</strong>{t('qs.lock_p3')}
        </p>
        <p className="text-xs text-slate-400 mt-3">
          {t('qs.lock_sub')}
        </p>
      </div>
    );
  }

  // ── Intercept Modal (Waiting for User) ──────────────────
  if (data?.job?.status === 'waiting_for_user') {
    return (
      <div className="glass-frosted rounded-2xl p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <AlertCircle size={20} className="text-ruby-700" /> {t('qs.otp_title')}
          </h3>
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            {t('qs.tries_left').replace('{left}', attemptsLeft).replace('{noun}', attemptsLeft === 1 ? t('qs.try') : t('qs.tries'))}
          </span>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          {t('qs.otp_desc')}
        </p>

        {interceptError && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {interceptError}
          </p>
        )}

        <form onSubmit={submitIntercept} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('qs.enter_otp')}</label>
            <input type="text" required value={otp} onChange={e => setOtp(e.target.value)}
                   className="w-full px-4 py-2 border rounded-xl" placeholder="XXXXXX" />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('qs.captcha')}</label>
            <div className="mb-2 p-2 bg-white rounded border inline-block">
              {data.job.captcha_image_base64 ? (
                <img src={data.job.captcha_image_base64} alt="CAPTCHA" className="rounded max-h-16" />
              ) : (
                <div className="h-10 w-32 bg-slate-100 animate-pulse rounded"></div>
              )}
            </div>
            <input type="text" required value={captcha} onChange={e => setCaptcha(e.target.value)}
                   className="w-full px-4 py-2 border rounded-xl" placeholder={t('qs.enter_captcha')} />
          </div>
          
          <button type="submit" disabled={submittingIntercept}
                  className="w-full bg-ruby-800 text-white rounded-xl py-3 font-semibold disabled:opacity-50 transition-colors hover:bg-ruby-900">
            {submittingIntercept ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> {t('qs.verifying')}
              </span>
            ) : t('qs.submit_cpcb')}
          </button>
        </form>
      </div>
    );
  }

  // ── ACK Received ──────────────────────────────────────────
  if (status === 'Completed' && ackNumber) {
    return (
      <div className="glass-frosted rounded-2xl p-6 animate-scale-in">
        {/* Success header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
               style={{ background: 'rgba(16,185,129,0.12)' }}>
            <CheckCircle2 size={24} className="text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{t('qs.done_title')}</p>
            <p className="text-xs text-emerald-700">{portalStatus || t('qs.pending_ulb')}</p>
          </div>
        </div>

        {/* ACK Number */}
        <div className="p-4 rounded-xl mb-4"
             style={{ background: 'rgba(16,185,129,0.07)', border: '1.5px solid rgba(16,185,129,0.25)' }}>
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">
            {t('qs.ack')}
          </p>
          <p className="font-mono text-xl font-bold text-slate-800 break-all">{ackNumber}</p>
          <p className="text-xs text-slate-500 mt-2">
            {t('qs.portal_status')} <span className="font-medium text-emerald-700">{portalStatus}</span>
          </p>
        </div>

        <p className="text-xs text-slate-400">
          {t('qs.save_note')}{' '}
          <a href="https://swm.cpcb.gov.in" target="_blank" rel="noopener noreferrer"
             className="text-ruby-800 underline flex items-center gap-0.5 inline-flex">
            {t('qs.verify_cpcb')} <ExternalLink size={10} />
          </a>
        </p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────
  if (error) return (
    <div className="flex items-center gap-2 p-4 rounded-xl text-sm text-red-700"
         style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
      <AlertCircle size={15} />
      <span>{error}</span>
    </div>
  );

  // ── Queued / In Progress ──────────────────────────────────
  return (
    <div className={`glass-frosted rounded-2xl p-6 transition-all duration-300 ${pulse ? 'scale-[1.01]' : ''}`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: 'rgba(22, 101, 74,0.08)' }}>
            {status === 'In Progress'
              ? <Zap size={18} className="text-ruby-800 animate-pulse" />
              : <Users size={18} className="text-ruby-800" />
            }
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">
              {status === 'In Progress' ? t('qs.agent_now') : t('qs.pay_ver')}
            </p>
            <p className="text-xs text-slate-400">{t('qs.auto_ref')}</p>
          </div>
        </div>
        <Loader2 size={16} className="animate-spin text-ruby-800/50" />
      </div>

      {/* Queue position ticker */}
      <div className="flex items-stretch gap-4 mb-5">

        {/* Position number */}
        <div className="flex-1 rounded-xl p-4 text-center"
             style={{ background: 'rgba(22, 101, 74,0.06)', border: '1.5px solid rgba(22, 101, 74,0.18)' }}>
          <p className="text-xs font-bold text-ruby-800/70 uppercase tracking-wider mb-1">{t('qs.pos')}</p>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-xs text-ruby-800/60 font-medium">#</span>
            <span className="font-display text-4xl font-bold text-ruby-800">{position}</span>
          </div>
          <p className="text-xs text-ruby-800/60 mt-1">{t('qs.in_queue')}</p>
        </div>

        {/* Stats column */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex-1 rounded-xl p-3"
               style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <p className="text-xs text-indigo-600/70 font-semibold mb-0.5">{t('qs.app_ahead')}</p>
            <p className="font-display text-2xl font-bold text-indigo-700">{jobsAhead}</p>
          </div>
          <div className="flex-1 rounded-xl p-3"
               style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
            <p className="text-xs text-amber-700/70 font-semibold mb-0.5">{t('qs.est_wait')}</p>
            <p className="font-display text-xl font-bold text-amber-700">
              {eta < 1 ? t('qs.lt_1m') : t('qs.m_eta').replace('{eta}', eta)}
            </p>
          </div>
        </div>
      </div>

      {/* Step progress bar */}
      <QueueStepBar status={status} t={t} />

      {/* Agent activity message */}
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <span>
          {status === 'In Progress'
            ? t('qs.msg_nav')
            : t('qs.msg_wait').replace('{eta}', eta < 1 ? t('qs.few_min') : t('qs.n_min').replace('{eta}', eta))
          }
        </span>
      </div>
    </div>
  );
}

// ── Queue step visualizer ─────────────────────────────────────
const getQueueSteps = (t) => [
  { id: 'paid',       label: t('qs.st_pay') },
  { id: 'queued',     label: t('qs.st_que') },
  { id: 'filing',     label: t('qs.st_fil') },
  { id: 'completed',  label: t('qs.st_ack') },
];

const STATUS_TO_STEP = {
  'Paid':        1,
  'Queued':      2,
  'In Progress': 3,
  'Completed':   4,
};

function QueueStepBar({ status, t }) {
  const currentStep = STATUS_TO_STEP[status] || 2;
  const steps = getQueueSteps(t);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const stepNum  = i + 1;
        const isDone   = stepNum < currentStep;
        const isActive = stepNum === currentStep;

        return (
          <div key={step.id} className="flex items-center flex-1 min-w-0">
            {/* Step dot */}
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 text-xs font-bold
              ${isDone   ? 'bg-emerald-500 text-white' :
                isActive ? 'bg-ruby-800 text-white animate-pulse' :
                           'bg-slate-200 text-slate-400'}`}>
              {isDone ? '✓' : stepNum}
            </div>
            {/* Label (hidden on mobile) */}
            <div className="hidden sm:block ml-1 flex-1 min-w-0">
              <p className={`text-xs truncate font-medium ${isDone ? 'text-emerald-700' : isActive ? 'text-ruby-800' : 'text-slate-400'}`}>
                {step.label}
              </p>
            </div>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 rounded-full transition-all duration-700
                ${stepNum < currentStep ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
