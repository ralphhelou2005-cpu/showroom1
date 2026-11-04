import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import CarCard from '@/components/CarCard';
import Footer from '@/components/Footer';
import { Link } from '@/i18n/link';
import type { Locale } from '@/i18n/routing';
import { listBrands } from '@/lib/catalog';
import { pageMeta } from '@/lib/seo';

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  try { return (await listBrands('en')).map(b => ({ slug: b.slug })); }
  catch { return []; }
}

type Props = { params: Promise<{ locale: Locale; slug: string }> };

const brand = async (locale: Locale, slug: string) => (await listBrands(locale)).find(b => b.slug === slug) ?? null;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const b = await brand(locale, slug);
  if (!b) return { title: { absolute: 'Page not found | Milcar' }, robots: { index: false } };
  const d = b.description || `Every ${b.name} in the Milcar showroom, with full specs and its history on request.`;
  return pageMeta({ title: `${b.name} | Milcar`, description: d, image: b.vehicles[0]?.photos[0]?.src, path: '/brands/' + b.slug });
}

/* /brands/<slug>: one brand's cars on show */
export default async function BrandPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const b = await brand(locale, slug);
  if (!b) notFound();
  return (
    <>
      <main id="main" tabIndex={-1}>
        <header className="inv-hero">
          <Link className="crumb" href="/brands">All brands</Link>
          <p className="label">The showroom</p>
          <h1>{b.name}</h1>
          <p>{b.description || `Every ${b.name} on our floor. Pick a car to see its full specs, then ask for its history.`}</p>
        </header>
        <div className="grid">
          {b.vehicles.map((v, i) => <CarCard key={v.id} car={v} i={i} lead={i === 0 && b.vehicles.length > 2} />)}
        </div>
      </main>
      <Footer />
    </>
  );
}
