import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Booking from '@/components/Booking';
import Footer from '@/components/Footer';
import type { Locale } from '@/i18n/routing';
import { pageMeta } from '@/lib/seo';
import { WORDS } from '@/i18n/words';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const m = WORDS[locale].meta.viewing;
  return pageMeta({ title: m.title, description: m.description, path: '/private-viewing', locale });
}

/* /private-viewing: the booking form on its own page (available times and confirmation arrive in Phase 7) */
export default async function PrivateViewingPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = WORDS[locale].viewing;
  return (
    <>
      <main id="main" tabIndex={-1}>
        <header className="inv-hero">
          <p className="label">{t.label}</p>
          <h1>{t.title}</h1>
          <p>{t.text}</p>
        </header>
        <Booking />
      </main>
      <Footer />
    </>
  );
}
