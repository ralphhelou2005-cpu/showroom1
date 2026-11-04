import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Footer from '@/components/Footer';
import InventoryBrowser from '@/components/InventoryBrowser';
import type { Locale } from '@/i18n/routing';
import { listVehicles } from '@/lib/catalog';
import { pageMeta } from '@/lib/seo';

export const revalidate = 300;

const d = 'See the cars in the Milcar showroom and ask for the full history of the one you want.';
export const metadata: Metadata = pageMeta({ title: 'Inventory | Milcar', description: d, path: '/inventory' });

/* /inventory: every car that isn't sold, with filters by type, brand and order */
export default async function InventoryPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const vehicles = await listVehicles(locale);
  return (
    <>
      <main id="main" tabIndex={-1}>
        <header className="inv-hero">
          <p className="label">The showroom</p>
          <h1>Inventory</h1>
          <p>Pick a car to see its full specs, then ask for its history.</p>
          {/* the note disappears by itself once no car is marked as a sample */}
          {vehicles.some(v => v.isSample) && <p className="sample-note">Preview: these are sample listings with stock photos. Your real cars and prices go here.</p>}
        </header>
        <InventoryBrowser vehicles={vehicles} />
      </main>
      <Footer />
    </>
  );
}
