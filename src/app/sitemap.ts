import type { MetadataRoute } from 'next';
import { listBrands, listVehicles } from '@/lib/catalog';
import { publicEnv } from '@/lib/env';
import { localPath } from '@/lib/seo';

/* Every public page in its three languages, each pointing to the other two, for search engines (/sitemap.xml).
   Rebuilt with the pages, at most every five minutes. */
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = publicEnv().NEXT_PUBLIC_SITE_URL;
  const [cars, brands] = await Promise.all([listVehicles('en').catch(() => []), listBrands('en').catch(() => [])]);
  const paths = ['/', '/inventory', '/featured', '/brands', '/about', '/contact', '/private-viewing',
    ...cars.map(c => '/car/' + c.slug), ...brands.map(b => '/brands/' + b.slug)];
  return paths.flatMap(path => (['en', 'fr', 'ar'] as const).map(locale => ({
    url: site + localPath(path, locale),
    changeFrequency: path.startsWith('/car/') ? 'weekly' as const : 'monthly' as const,
    priority: path === '/' ? 1 : path === '/inventory' ? 0.9 : path.startsWith('/car/') ? 0.8 : 0.5,
    alternates: { languages: { en: site + localPath(path, 'en'), fr: site + localPath(path, 'fr'), ar: site + localPath(path, 'ar') } },
  })));
}
