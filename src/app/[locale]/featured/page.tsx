import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { FeaturedPageSection } from '@/components/FeaturedShowroom';
import Footer from '@/components/Footer';
import type { Locale } from '@/i18n/routing';
import { listVehicles, type Vehicle } from '@/lib/catalog';
import { pageMeta } from '@/lib/seo';

export const revalidate = 300;

const d = 'The cars in the Milcar showroom windows tonight. Pick a window to see the car.';
export const metadata: Metadata = pageMeta({ title: 'Featured | Milcar', description: d, image: 'assets/dealership-1200.webp', path: '/featured' });

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
