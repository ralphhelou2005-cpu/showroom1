import type { Metadata } from 'next';
import { preload } from 'react-dom';
import { setRequestLocale } from 'next-intl/server';
import Booking from '@/components/Booking';
import Build from '@/components/Build';
import FAQ from '@/components/FAQ';
import FeaturedShowroom from '@/components/FeaturedShowroom';
import Footer from '@/components/Footer';
import Hero, { poster, posterPhone } from '@/components/Hero';
import HomeEngine from '@/components/HomeEngine';
import InventoryTeaser from '@/components/InventoryTeaser';
import PromiseSection from '@/components/Promise';
import Process from '@/components/Process';
import type { Locale } from '@/i18n/routing';
import { getBusiness, listVehicles, type Vehicle } from '@/lib/catalog';
import { pageMeta } from '@/lib/seo';
import { WORDS } from '@/i18n/words';
import { businessJsonLd } from '@/lib/structured-data';

/* rebuilt in the background at most every five minutes, so window prices follow the inventory */
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const m = WORDS[locale].meta.home;
  return pageMeta({ title: m.title, description: m.description, shareText: m.share, path: '/', locale });
}

/* the home page: the walk-in, then the website rising over it as one panel */
export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  /* the walk-in's first picture and its light film start downloading with the page; phones (narrower than 7:10)
     get the phone cut, like src/lib/home.ts */
  preload(poster(), { as: 'image', fetchPriority: 'high', media: '(min-aspect-ratio: 7/10)' });
  preload(posterPhone(), { as: 'image', fetchPriority: 'high', media: '(max-aspect-ratio: 7/10)' });
  preload('/assets/walk/fast.mp4', { as: 'fetch', crossOrigin: 'anonymous', media: '(min-aspect-ratio: 7/10)' });
  preload('/assets/walk/fast-phone.mp4', { as: 'fetch', crossOrigin: 'anonymous', media: '(max-aspect-ratio: 7/10)' });
  let vehicles: Vehicle[] | null = null;
  try { vehicles = await listVehicles(locale); } catch { /* the windows fall back to their own names */ }
  const business = await getBusiness().catch(() => null);
  return (
    <>
      <main id="main" tabIndex={-1}>
        <Hero />
        <div className="below" id="below">
          <svg className="streak" id="streak" aria-hidden="true"><path id="streakPath" /></svg>
          <FeaturedShowroom vehicles={vehicles} />
          <PromiseSection />
          <Build />
          <InventoryTeaser vehicles={vehicles} />
          <Process />
          <FAQ />
          <Booking />
          <Footer home />
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: businessJsonLd(business, locale) }} />
        <HomeEngine />
        {/* starts the walk-in as soon as this HTML is in, without waiting for the rest of the site's code */}
        <script src="/engine/home.js" defer />
      </main>
    </>
  );
}
