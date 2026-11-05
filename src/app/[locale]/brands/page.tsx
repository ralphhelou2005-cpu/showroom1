import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Footer from '@/components/Footer';
import { vars } from '@/components/ui';
import { Link } from '@/i18n/link';
import type { Locale } from '@/i18n/routing';
import { listBrands } from '@/lib/catalog';
import { pageMeta } from '@/lib/seo';
import { WORDS } from '@/i18n/words';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const m = WORDS[locale].meta.brands;
  return pageMeta({ title: m.title, description: m.description, path: '/brands', locale });
}

/* /brands: the brands with cars on show, each with one of its cars as its picture */
export default async function BrandsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const brands = await listBrands(locale);
  const t = WORDS[locale].brands, empty = WORDS[locale].inventory.empty;
  return (
    <>
      <main id="main" tabIndex={-1}>
        <header className="inv-hero">
          <p className="label">{t.label}</p>
          <h1>{t.title}</h1>
          <p>{t.text}</p>
        </header>
        <div className="grid">
          {brands.length === 0 && <p className="inv-empty">{empty}</p>}
          {brands.map((b, i) => {
            const photo = b.vehicles.find(v => v.photos[0])?.photos[0];
            const n = b.vehicles.length;
            return (
              <Link key={b.slug} className="vehicle" href={'/brands/' + b.slug} style={vars({ animationDelay: i * 70 + 'ms' })}>
                <figure>
                  {photo && <img src={photo.src} srcSet={photo.set} sizes="(max-width:560px) 100vw, (max-width:900px) 50vw, 33vw" width={1500} height={1000} decoding="async" alt={b.name} loading={i > 2 ? 'lazy' : undefined} />}
                </figure>
                <p className="label">{t.count(n)}</p>
                <h2>{b.name}</h2>
                <div className="row"><span className="price">{b.vehicles.map(v => v.model).slice(0, 2).join(', ')}{n > 2 ? '…' : ''}</span><span className="see">{t.see}</span></div>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
