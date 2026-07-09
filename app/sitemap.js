export default function sitemap() {
  const base = process.env.APP_BASE_URL || 'https://indianwasteportal.com';
  const now = new Date();
  const paths = ['', '/solid-waste', '/register', '/find', '/legal/privacy', '/legal/terms', '/legal/refund', '/legal/contact'];
  return paths.map(p => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: (p === '' || p === '/solid-waste') ? 1 : 0.6,
  }));
}
