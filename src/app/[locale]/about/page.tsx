import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Footer from '@/components/Footer';
import Process from '@/components/Process';
import PromiseSection from '@/components/Promise';
import Reveals from '@/components/Reveals';
import { Link } from '@/i18n/link';
import type { Locale } from '@/i18n/routing';
import { pageMeta } from '@/lib/seo';
import { WORDS } from '@/i18n/words';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const m = WORDS[locale].meta.about;
  return pageMeta({ title: m.title, description: m.description, path: '/about', locale });
}

/* /about: who Milcar is, in the site's own words (the promise and the three steps from the home page).
   Facts the owner adds later (the story, the year it began) belong in the settings, not invented here. */
export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = WORDS[locale].about;
  return (
    <>
      <main id="main" tabIndex={-1}>
        <header className="inv-hero">
          <p className="label">{t.label}</p>
          <h1>{t.title}</h1>
          <p>{t.text}</p>
          <p className="signature about-signature">Minas Missirian</p>
        </header>
        <PromiseSection />
        <Process />
        <div className="featured-actions about-actions">
          <Link className="btn" href="/inventory">{t.inventory}</Link>
          <Link className="btn ghost" href="/private-viewing">{t.book}</Link>
        </div>
        <Reveals />
      </main>
      <Footer />
    </>
  );
}
