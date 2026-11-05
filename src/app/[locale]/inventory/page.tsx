import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Footer from '@/components/Footer';
import InventoryBrowser from '@/components/InventoryBrowser';
import type { Locale } from '@/i18n/routing';
import { listVehicles } from '@/lib/catalog';
import { pageMeta } from '@/lib/seo';
import { cardWords } from '@/i18n/server-words';
import { WORDS } from '@/i18n/words';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const m = WORDS[locale].meta.inventory;
  return pageMeta({ title: m.title, description: m.description, path: '/inventory', locale });
}

/* /inventory: every car that isn't sold, with filters by type, brand and order */
export default async function InventoryPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const vehicles = await listVehicles(locale);
  const w = WORDS[locale], t = w.inventory;
  return (
    <>
      <main id="main" tabIndex={-1}>
        <header className="inv-hero">
          <p className="label">{t.label}</p>
          <h1>{t.title}</h1>
          <p>{t.text}</p>
          {/* the note disappears by itself once no car is marked as a sample */}
          {vehicles.some(v => v.isSample) && <p className="sample-note">{t.sample}</p>}
        </header>
        <InventoryBrowser vehicles={vehicles} words={{ t, bodyTypes: w.bodyTypes, card: cardWords(w, locale) }} />
      </main>
      <Footer />
    </>
  );
}
