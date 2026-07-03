/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

// In development, Next.js / React Refresh (HMR) require 'unsafe-eval' for the
// webpack runtime. Without it the CSP blocks React from hydrating, which kills
// all client interactivity (buttons, state updates). Production stays strict.
const scriptSrc = [
  "script-src 'self' 'unsafe-inline'",
  isDev ? "'unsafe-eval'" : '',
  'https://checkout.razorpay.com https://cdn.razorpay.com https://fonts.googleapis.com',
  'https://www.googletagmanager.com https://plausible.io',   // analytics (env-gated)
].filter(Boolean).join(' ');

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', '@libsql/client'],
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',            value: 'DENY' },
          { key: 'X-XSS-Protection',           value: '1; mode=block' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://www.google-analytics.com https://region1.google-analytics.com https://plausible.io",
              "frame-src https://api.razorpay.com https://checkout.razorpay.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      {
        // API-only: no-cache to prevent stale sensitive data
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
