import LegalShell, { H2 } from '../../../components/LegalShell';

export const metadata = {
  title: 'Contact Us — Indian Waste Portal',
  description: 'Get in touch with Indian Waste Portal.',
};

export default function Contact() {
  return (
    <LegalShell title="Contact Us" updated="1 July 2026">
      <p>We’re here to help with your CPCB SWM Bulk Waste Generator compliance.</p>

      <H2>Reach us</H2>
      <ul className="list-none space-y-2">
        <li><strong>Email:</strong> <a className="text-ruby-800 underline" href="mailto:indianwasteportal@gmail.com">indianwasteportal@gmail.com</a></li>
        <li><strong>Phone:</strong> <a className="text-ruby-800 underline" href="tel:+919054047272">+91 90540 47272</a></li>
        <li><strong>Hours:</strong> Mon–Sat, 10:00–19:00 IST</li>
      </ul>

      <H2>Registered address</H2>
      <p className="text-amber-700">
        [Add your registered business name and full address here — required by Razorpay for account
        verification. e.g. “Indian Waste Portal, &lt;Street&gt;, &lt;City&gt;, &lt;State&gt; &lt;PIN&gt;”.]
      </p>

      <H2>Business details</H2>
      <p className="text-amber-700">
        [Add legal entity name, GSTIN, and any registration/CIN numbers here for transparency and
        payment-gateway compliance.]
      </p>

      <H2>Grievance / support</H2>
      <p>
        For service or billing issues, email us with your organisation name and reference token and
        we’ll respond within 2 business days.
      </p>
    </LegalShell>
  );
}
