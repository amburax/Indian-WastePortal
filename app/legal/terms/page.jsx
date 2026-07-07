import LegalShell, { H2 } from '../../../components/LegalShell';

export const metadata = {
  title: 'Terms of Service — Indian Waste Portal',
  description: 'The terms governing use of Indian Waste Portal compliance services.',
};

export default function Terms() {
  return (
    <LegalShell title="Terms of Service" updated="1 July 2026">
      <p>
        These Terms govern your use of Indian Waste Portal’s website and services. By registering or
        making a payment, you agree to these Terms.
      </p>

      <H2>1. Nature of service</H2>
      <p>
        Indian Waste Portal is an independent <strong>compliance middleware and consultancy</strong>
        that assists Bulk Waste Generators with registration and filing on the CPCB Solid Waste
        Management (SWM) portal. <strong>We are not a government body and are not affiliated with,
        endorsed by, or acting for CPCB, GPCB, or any Urban/Rural Local Body.</strong> This portal is
        responsible only for facilitating your registration.
      </p>

      <H2>2. Your responsibilities</H2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Provide accurate, complete, and current information about your entity and facility.</li>
        <li>Respond to consultation requests and enter any government OTP yourself when prompted.</li>
        <li>Ensure you are authorised to register the entity you submit.</li>
      </ul>

      <H2>3. Fees</H2>
      <p>
        Our services are provided for a consultation/booking retainer and, where applicable, a
        balance fee confirmed after consultation. Government levies (if any) are separate. Fees are
        exclusive of taxes unless stated.
      </p>

      <H2>4. No guarantee of outcome</H2>
      <p>
        We use reasonable professional efforts to complete your filing. However, final approval,
        acknowledgement, and any verification rest with the relevant government authority, whose
        systems and requirements may change without notice. We do not guarantee approval or any
        specific timeline.
      </p>

      <H2>5. Limitation of liability</H2>
      <p>
        To the maximum extent permitted by law, our aggregate liability arising from the services is
        limited to the fees you paid us for the specific engagement. We are not liable for indirect
        or consequential losses, or for penalties arising from information you provided that was
        inaccurate or incomplete.
      </p>

      <H2>6. Intellectual property</H2>
      <p>The website, content, and software are our property or licensed to us and may not be copied without permission.</p>

      <H2>7. Governing law</H2>
      <p>
        These Terms are governed by the laws of India, with exclusive jurisdiction of the courts at
        [your city], [state]. <span className="text-amber-700">[Confirm jurisdiction with counsel.]</span>
      </p>

      <H2>8. Contact</H2>
      <p>Email <a className="text-ruby-800 underline" href="mailto:indianwasteportal@gmail.com">indianwasteportal@gmail.com</a>.</p>
    </LegalShell>
  );
}
