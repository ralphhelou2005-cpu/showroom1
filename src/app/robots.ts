import type { MetadataRoute } from 'next';
import { publicEnv } from '@/lib/env';

/* search engines may read the website, never the dashboard or the server's endpoints (/robots.txt) */
export default function robots(): MetadataRoute.Robots {
  const site = publicEnv().NEXT_PUBLIC_SITE_URL;
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }], sitemap: site + '/sitemap.xml', host: site };
}
