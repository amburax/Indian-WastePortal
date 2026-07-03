import LegalShell, { H2 } from '../../../components/LegalShell';

export const metadata = {
  title: 'Refund & Cancellation Policy — Indian Waste Portal',
  description: 'Refund and cancellation terms for Indian Waste Portal services.',
};

export default function Refund() {
  return (
    <LegalShell title="Refund & Cancellation Policy" updated="1 July 2026">
      <p>
        This policy explains when refunds and cancellations apply to payments made to Indian Waste
        Portal. Because we provide professional/consulting services (not physical goods), refunds are
        governed by the stage of work completed.
      </p>

      <H2>1. Booking retainer</H2>
      <p>
        The booking retainer secures your consultation slot and initial review. It is
        <strong> refundable within 24 hours</strong> of payment provided we have not yet conducted
        your consultation. Once the consultation has taken place, the retainer is non-refundable as
        it covers work already performed.
      </p>

      <H2>2. Balance / filing fee</H2>
      <p>
        The balance fee is charged after consultation to carry out your CPCB portal filing. It is
        <strong> refundable in full if you cancel before filing has commenced.</strong> Once the
        filing process has begun on the government portal, the fee is non-refundable.
      </p>

      <H2>3. How to request a cancellation or refund</H2>
      <p>
        Email <a className="text-ruby-800 underline" href="mailto:hello@indianwasteportal.in">hello@indianwasteportal.in</a>
        {' '}from your registered email with your organisation name and reference token. Eligible
        refunds are processed to the original payment method within <strong>5–7 business days</strong>
        via our payment gateway.
      </p>

      <H2>4. Failed or duplicate payments</H2>
      <p>
        If you were charged twice or a payment failed but was debited, contact us with the payment
        reference; verified duplicate/failed charges are refunded in full.
      </p>

      <H2>5. Government levies</H2>
      <p>Any statutory fees payable to a government authority are separate and governed by that authority’s rules; we do not control or refund such amounts.</p>

      <H2>6. Contact</H2>
      <p>For any billing question, email <a className="text-ruby-800 underline" href="mailto:hello@indianwasteportal.in">hello@indianwasteportal.in</a>.</p>
    </LegalShell>
  );
}
