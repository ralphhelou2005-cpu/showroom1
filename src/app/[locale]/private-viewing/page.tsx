import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Booking from '@/components/Booking';
import Footer from '@/components/Footer';
import type { Locale } from '@/i18n/routing';
import { pageMeta } from '@/lib/seo';

const d = 'Book a private viewing at Milcar: see the car and its papers side by side, before anyone talks about price.';
export const metadata: Metadata = pageMeta({ title: 'Private viewing | Milcar', description: d, path: '/private-viewing' });

/* /private-viewing: the booking form on its own page (available times and confirmation arrive in Phase 7) */
export default async function PrivateViewingPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <main id="main" tabIndex={-1}>
        <header className="inv-hero">
          <p className="label">Private viewing</p>
          <h1>See the car and its papers.</h1>
          <p>Together, side by side, before anyone talks about price.</p>
        </header>
        <Booking />
      </main>
      <Footer />
    </>
  );
}
