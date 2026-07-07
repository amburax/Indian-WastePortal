export default function robots() {
  const base = process.env.APP_BASE_URL || 'https://indianwasteportal.com';
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/portal', '/status/', '/find'],
    }],
    sitemap: `${base}/sitemap.xml`,
  };
}
