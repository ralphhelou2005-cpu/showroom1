import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/* photos and videos uploaded in the dashboard are served from the project's public storage */
const storage = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : undefined;

/* What the browser may load, in production (the development server needs more). Scripts and styles are the site's
   own (Next.js writes small inline ones); pictures and videos also come from the project's storage; the spam check
   (Cloudflare Turnstile) is allowed only when it is set up. */
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : '';
const turnstile = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? ' https://challenges.cloudflare.com' : '';
const csp = [
  "default-src 'self'", `script-src 'self' 'unsafe-inline'${turnstile}`, "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`, `media-src 'self' blob: ${supabase}`, "font-src 'self'",
  `connect-src 'self' ${supabase} ${supabase.replace(/^http/, 'ws')}${turnstile}`, `frame-src 'self'${turnstile}`,
  "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'",
].join('; ');

/* on every response */
const securityHeaders = [
  ...(process.env.NODE_ENV === 'production' ? [{ key: 'Content-Security-Policy', value: csp }] : []),
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
];

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: storage ? [{ protocol: 'https', hostname: storage, pathname: '/storage/v1/object/public/**' }] : [],
  },
  /* TypeScript is checked by `tsc --noEmit` before every build (package.json), with the project's TypeScript 7 */
  typescript: { ignoreBuildErrors: true },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      /* the host's own addresses (previews, and the project's *.vercel.app name) stay out of search results, so they
         never compete with the real domain */
      { source: '/:path*', has: [{ type: 'host', value: '.*\\.vercel\\.app' }], headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};

export default withNextIntl(config);
