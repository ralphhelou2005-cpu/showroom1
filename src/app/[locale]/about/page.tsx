import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Footer from '@/components/Footer';
import Process from '@/components/Process';
import PromiseSection from '@/components/Promise';
import Reveals from '@/components/Reveals';
import { Link } from '@/i18n/link';
import type { Locale } from '@/i18n/routing';
import { pageMeta } from '@/lib/seo';

const d = 'Milcar Automotive Consultancy: supercars and luxury cars, with the full history on the table.';
export const metadata: Metadata = pageMeta({ title: 'About | Milcar', description: d, path: '/about' });

/* /about: who Milcar is, in the site's own words (the promise and the three steps from the home page).
   Facts the owner adds later (the story, the year it began) belong in the settings, not invented here. */
export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <main id="main" tabIndex={-1}>
        <header className="inv-hero">
          <p className="label">About Milcar</p>
          <h1>Every car has a story.</h1>
          <p>Milcar Automotive Consultancy. Supercars and luxury cars, with the full history on the table. We show you all of it.</p>
          <p className="signature about-signature">Minas Missirian</p>
        </header>
        <PromiseSection />
        <Process />
        <div className="featured-actions about-actions">
          <Link className="btn" href="/inventory">View the inventory</Link>
          <Link className="btn ghost" href="/private-viewing">Book a private viewing</Link>
        </div>
        <Reveals />
      </main>
      <Footer />
    </>
  );
}
