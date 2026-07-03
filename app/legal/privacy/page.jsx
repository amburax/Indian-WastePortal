import LegalShell, { H2 } from '../../../components/LegalShell';

export const metadata = {
  title: 'Privacy Policy — Indian Waste Portal',
  description: 'How Indian Waste Portal collects, uses, and protects your data.',
};

export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="1 July 2026">
      <p>
        This Privacy Policy explains how Indian Waste Portal (“we”, “us”, “our”) collects, uses, and
        safeguards information when you use our website and compliance services. By using our
        services you consent to the practices described here.
      </p>

      <H2>1. Information we collect</H2>
      <p>To provide our CPCB SWM registration services, we collect:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Entity details:</strong> organisation name, authorised person, category, and address.</li>
        <li><strong>Contact details:</strong> email address and mobile number (used for updates and OTP delivery to your own device).</li>
        <li><strong>Facility metrics:</strong> built-up area, water usage, and waste generation figures.</li>
        <li><strong>Payment information:</strong> processed securely by our payment gateway (Razorpay); we do not store your card or bank details.</li>
        <li><strong>Usage data:</strong> basic analytics such as pages visited (if analytics is enabled).</li>
      </ul>

      <H2>2. How we use your information</H2>
      <ul className="list-disc pl-5 space-y-1">
        <li>To prepare and submit your registration on the CPCB SWM portal on your behalf.</li>
        <li>To contact you for consultation, scheduling, invoicing, and status updates.</li>
        <li>To send statutory reminders (e.g. annual return deadlines).</li>
        <li>To comply with applicable law and respond to lawful requests.</li>
      </ul>

      <H2>3. OTP and portal credentials</H2>
      <p>
        We never ask for your government-portal OTP over a phone call. Any OTP required by the CPCB
        portal is sent to your own registered mobile and entered by you on your own screen.
      </p>

      <H2>4. Sharing of information</H2>
      <p>
        We share information only as needed to deliver the service — for example, submitting your
        entity details to the CPCB SWM portal, or sharing payment references with our payment
        gateway. We do not sell your personal data.
      </p>

      <H2>5. Data retention &amp; security</H2>
      <p>
        We retain your data for as long as needed to provide the service and to meet legal
        obligations, and apply reasonable technical and organisational measures to protect it. No
        method of transmission or storage is completely secure.
      </p>

      <H2>6. Your rights</H2>
      <p>
        You may request access to, correction of, or deletion of your personal data by contacting us
        at the address on our Contact page, subject to legal retention requirements.
      </p>

      <H2>7. Changes</H2>
      <p>We may update this policy from time to time; the “last updated” date reflects the latest revision.</p>

      <H2>8. Contact</H2>
      <p>Questions about this policy? Email <a className="text-ruby-800 underline" href="mailto:hello@indianwasteportal.in">hello@indianwasteportal.in</a>.</p>
    </LegalShell>
  );
}
