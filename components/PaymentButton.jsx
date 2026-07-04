'use client';
import { useState } from 'react';
import { CreditCard, Lock, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useI18n } from '../lib/i18n';

const PLAN_AMOUNTS = {
  standard:     299900,   // ₹2,999 in paise
  professional: 749900,   // ₹7,499 in paise
  enterprise:   2499900,  // ₹24,999 in paise
};

const PLAN_LABELS = {
  standard:     '₹2,999',
  professional: '₹7,499',
  enterprise:   '₹24,999',
};

/**
 * PaymentButton — Razorpay Checkout wrapper
 * Props:
 *   orgId:      string — organization ID from DB
 *   plan:       'standard' | 'professional' | 'enterprise'
 *   orgName:    string
 *   email:      string
 *   phone:      string
 *   onSuccess:  (paymentData) => void
 */
export default function PaymentButton({ orgId, plan = 'standard', kind = 'full', amountLabel, ctaLabel, orgName, email, phone, onSuccess }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [paid,    setPaid]    = useState(false);
  const [error,   setError]   = useState('');

  async function handlePayment() {
    setLoading(true);
    setError('');

    try {
      // 1. Create Razorpay order via our API
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, plan, kind }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || t('pay.err_create'));

      // 2. Open Razorpay checkout
      const options = {
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount:      orderData.amount,
        currency:    'INR',
        name:        t('pay.brand'),
        description: t('pay.desc').replace('{plan}', plan.charAt(0).toUpperCase() + plan.slice(1)),
        order_id:    orderData.orderId,
        prefill: {
          name:    orgName,
          email:   email,
          contact: phone,
        },
        notes: { org_id: orgId },
        theme: { color: '#16654a' },
        modal: {
          ondismiss: () => setLoading(false),
        },
        handler: async function (response) {
          // 3. Verify payment on our server
          const verifyRes = await fetch('/api/payment-webhook', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-razorpay-client-verify': 'true',   // mark as client-side verify call
            },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              org_id:              orgId,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(verifyData.error || t('pay.err_verify'));

          setPaid(true);
          setLoading(false);
          onSuccess?.(response);
        },
      };

      if (typeof window === 'undefined' || !window.Razorpay) {
        throw new Error(t('pay.err_sdk'));
      }

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (res) => {
        setError(t('pay.err_fail').replace('{reason}', res.error.description));
        setLoading(false);
      });
      rzp.open();

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  if (paid) {
    return (
      <div className="w-full p-5 rounded-2xl text-center animate-scale-in"
           style={{ background: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.3)' }}>
        <CheckCircle2 size={36} className="text-emerald-600 mx-auto mb-2" />
        <p className="font-semibold text-emerald-800">{kind === 'retainer' ? t('pay.success_ret') : t('pay.success_full')}</p>
        <p className="text-sm text-emerald-700/80 mt-1">
          {kind === 'retainer'
            ? t('pay.msg_ret')
            : t('pay.msg_full')}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <button
        id="razorpay-pay-btn"
        onClick={handlePayment}
        disabled={loading}
        className="btn-ruby w-full text-base py-4 rounded-2xl gap-3"
      >
        {loading ? (
          <><Loader2 size={18} className="animate-spin" />{t('pay.loading')}</>
        ) : (
          <>
            <CreditCard size={18} />
            {ctaLabel || t('pay.cta').replace('{amount}', amountLabel || PLAN_LABELS[plan])}
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}

      <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1"><ShieldCheck size={12} />{t('pay.ssl')}</span>
        <span>·</span>
        <span className="flex items-center gap-1"><Lock size={12} />{t('pay.razor')}</span>
        <span>·</span>
        <span>{t('pay.pci')}</span>
      </div>
    </div>
  );
}
