import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Footer from '@/components/Footer';
import { vars } from '@/components/ui';
import { Link } from '@/i18n/link';
import type { Locale } from '@/i18n/routing';
import { listBrands } from '@/lib/catalog';
import { pageMeta } from '@/lib/seo';

export const revalidate = 300;

const d = 'The makers on the Milcar showroom floor. Pick one to see its cars, each with its full history on request.';
export const metadata: Metadata = pageMeta({ title: 'Brands | Milcar', description: d, path: '/brands' });

/* /brands: the brands with cars on show, each with one of its cars as its picture */
export default async function BrandsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const brands = await listBrands(locale);
  return (
    <>
      <main id="main" tabIndex={-1}>
        <header className="inv-hero">
          <p className="label">The showroom</p>
          <h1>Brands</h1>
          <p>The makers on our floor. Pick one to see its cars.</p>
        </header>
        <div className="grid">
          {brands.length === 0 && <p className="inv-empty">New cars are on their way. Book a viewing and we’ll tell you first.</p>}
          {brands.map((b, i) => {
            const photo = b.vehicles.find(v => v.photos[0])?.photos[0];
            const n = b.vehicles.length;
            return (
              <Link key={b.slug} className="vehicle" href={'/brands/' + b.slug} style={vars({ animationDelay: i * 70 + 'ms' })}>
                <figure>
                  {photo && <img src={photo.src} srcSet={photo.set} sizes="(max-width:560px) 100vw, (max-width:900px) 50vw, 33vw" width={1500} height={1000} decoding="async" alt={b.name} loading={i > 2 ? 'lazy' : undefined} />}
                </figure>
                <p className="label">{n} {n === 1 ? 'car' : 'cars'} on show</p>
                <h2>{b.name}</h2>
                <div className="row"><span className="price">{b.vehicles.map(v => v.model).slice(0, 2).join(', ')}{n > 2 ? '…' : ''}</span><span className="see">See the cars</span></div>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
