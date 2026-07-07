import './globals.css';
import WhatsAppFab from '../components/WhatsAppFab';
import Analytics from '../components/Analytics';
import { LanguageProvider } from '../lib/i18n';

const BASE = process.env.APP_BASE_URL || 'https://indianwasteportal.com';

export const metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: 'Indian Waste Portal — CPCB SWM 2026 Bulk Waste Generator Compliance',
    template: '%s · Indian Waste Portal',
  },
  description:
    'End-to-end CPCB Solid Waste Management (SWM 2026) registration for Bulk Waste Generators in India. We file your BWG registration and annual returns — consultation-led, fully tracked.',
  keywords: 'CPCB, GPCB, SWM 2026, Bulk Waste Generator, BWG registration, annual return, solid waste management, EBWGR, compliance India',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: BASE,
    siteName: 'Indian Waste Portal',
    title: 'Indian Waste Portal — CPCB SWM 2026 Compliance for Bulk Waste Generators',
    description: 'File your CPCB SWM Bulk Waste Generator registration and annual returns — consultation-led and fully tracked.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Indian Waste Portal — CPCB SWM 2026 Compliance',
    description: 'CPCB SWM Bulk Waste Generator registration & annual returns, done for you.',
  },
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Indian Waste Portal',
  url: BASE,
  email: 'indianwasteportal@gmail.com',
  description: 'CPCB SWM 2026 Bulk Waste Generator compliance middleware and consultancy.',
  areaServed: 'IN',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'indianwasteportal@gmail.com',
    availableLanguage: ['en', 'hi', 'gu'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Razorpay SDK */}
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      </head>
      <body className="font-sans antialiased">
        <LanguageProvider>
          {children}
          <WhatsAppFab />
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
