'use client';
import { useState } from 'react';
import { CreditCard, Lock, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';

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
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      // 2. Open Razorpay checkout
      const options = {
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount:      orderData.amount,
        currency:    'INR',
        name:        'Indian Waste Portal',
        description: `CPCB SWM Compliance Filing — ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
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
          if (!verifyRes.ok) throw new Error(verifyData.error || 'Payment verification failed');

          setPaid(true);
          setLoading(false);
          onSuccess?.(response);
        },
      };

      if (typeof window === 'undefined' || !window.Razorpay) {
        throw new Error('Razorpay SDK not loaded. Please refresh and try again.');
      }

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (res) => {
        setError(`Payment failed: ${res.error.description}`);
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
        <p className="font-semibold text-emerald-800">{kind === 'retainer' ? 'Booking Confirmed!' : 'Payment Successful!'}</p>
        <p className="text-sm text-emerald-700/80 mt-1">
          {kind === 'retainer'
            ? 'Our consultant will call you within 24 hours to schedule your filing.'
            : 'Our team will initiate your filing shortly. We’ll notify you at each step.'}
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
          <><Loader2 size={18} className="animate-spin" />Opening Payment…</>
        ) : (
          <>
            <CreditCard size={18} />
            {ctaLabel || `Pay ${amountLabel || PLAN_LABELS[plan]} — Initiate CPCB Filing`}
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}

      <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1"><ShieldCheck size={12} />256-bit SSL</span>
        <span>·</span>
        <span className="flex items-center gap-1"><Lock size={12} />Razorpay Secured</span>
        <span>·</span>
        <span>PCI DSS Compliant</span>
      </div>
    </div>
  );
}
