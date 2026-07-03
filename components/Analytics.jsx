import Script from 'next/script';

/**
 * Analytics — env-gated, renders nothing unless configured.
 *   NEXT_PUBLIC_PLAUSIBLE_DOMAIN=yourdomain.in   → Plausible (privacy-friendly)
 *   NEXT_PUBLIC_GA_ID=G-XXXXXXX                   → Google Analytics 4
 * Plausible wins if both are set.
 */
export default function Analytics() {
  const plausible = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const ga = process.env.NEXT_PUBLIC_GA_ID;

  if (plausible) {
    return <Script defer data-domain={plausible} src="https://plausible.io/js/script.js" strategy="afterInteractive" />;
  }
  if (ga) {
    return (
      <>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`}
        </Script>
      </>
    );
  }
  return null;
}
