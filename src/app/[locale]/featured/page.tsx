import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { FeaturedPageSection } from '@/components/FeaturedShowroom';
import Footer from '@/components/Footer';
import type { Locale } from '@/i18n/routing';
import { listVehicles, type Vehicle } from '@/lib/catalog';
import { pageMeta } from '@/lib/seo';
import { WORDS } from '@/i18n/words';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const m = WORDS[locale].meta.featured;
  return pageMeta({ title: m.title, description: m.description, image: 'assets/dealership-1200.webp', path: '/featured', locale });
}

/* /featured: the dealership windows as their own page */
export default async function FeaturedPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  let vehicles: Vehicle[] | null = null;
  try { vehicles = await listVehicles(locale); } catch { /* the windows fall back to their own names */ }
  return (
    <>
      <main id="main" tabIndex={-1}><FeaturedPageSection vehicles={vehicles} /></main>
      <Footer />
    </>
  );
}
