import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import Footer from '@/components/Footer';
import Gallery from '@/components/Gallery';
import { Named } from '@/components/ui';
import { Link } from '@/i18n/link';
import type { Locale } from '@/i18n/routing';
import { getVehicle, listVehicles, type Vehicle } from '@/lib/catalog';
import { formatPrice } from '@/lib/labels';
import { pageMeta } from '@/lib/seo';

/* every listed car is built ahead of time; one added since opens on its first visit and is kept */
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  try { return (await listVehicles('en')).map(v => ({ slug: v.slug })); }
  catch (e) { console.warn('car pages: drawn on their first visit (' + (e as Error).message + ')'); return []; }   /* Supabase unreachable while building */
}

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const found = await getVehicle(decodeURIComponent(slug), locale);
  if (!found) return { title: { absolute: 'Car details | Milcar' }, robots: { index: false } };
  const v = found.vehicle;
  const d = v.seoDescription || v.name + (v.tagline ? '. ' + v.tagline : '') + ' Full specs at Milcar, with its history available on request.';
  return pageMeta({ title: (v.seoTitle || v.name) + ' | Milcar', description: d, image: v.photos[0]?.src, path: '/car/' + v.slug });
}

const ASK = 'On request';
const THIS_CAR: [string, (v: Vehicle) => string | number | null][] = [
  ['Year', v => v.year],
  ['Mileage', v => (v.mileageKm == null ? null : v.mileageKm.toLocaleString('en-US') + ' km')],
  ['Color', v => v.color],
  ['Previous owners', v => v.previousOwners],
  ['Service records', v => v.serviceRecords],
  ['Import papers', v => v.importPapers],
];

function List({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <section className="spec-block">
      <h2>{title}</h2>
      <dl>{rows.map(([k, v], i) => <div key={i}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    </section>
  );
}

/* /car/<slug>: one car with its photos and specs */
export default async function CarPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const found = await getVehicle(decodeURIComponent(slug), locale);
  if (!found) notFound();
  const { vehicle: car, next } = found;
  return (
    <>
      <main id="main" tabIndex={-1}>
        <div id="car" className="car-page">
          <div className="car-top">
            <Gallery photos={car.photos} name={car.name} sample={car.isSample} reserved={car.status === 'reserved'} />
            <div className="car-head">
              <Link className="crumb" href="/inventory">All cars</Link>
              <p className="label">{car.make}</p>
              <h1><Named text={car.model} /></h1>
              {car.tagline && <p className="car-line">{car.tagline}</p>}
              <p className="price"><Named text={formatPrice(car.price, car.currency)} /></p>
              {car.status === 'reserved' && <p className="car-line">This car is reserved. Ask us to hear if it becomes available.</p>}
              <Link className="btn" href={'/?car=' + encodeURIComponent(car.name) + '#book'}>Book a private viewing</Link>
            </div>
          </div>
          {car.description && <p className="car-story">{car.description}</p>}
          <div className="spec-grid">
            {car.specs.length > 0 && <List title="Factory specs" rows={car.specs.map(s => [s.label, s.value])} />}
            <List title="This car" rows={THIS_CAR.map(([k, get]) => { const v = get(car); return [k, v == null || v === '' ? ASK : String(v)]; })} />
          </div>
          {car.specs.length > 0 && <p className="spec-note">Factory figures are for the model and can vary by year and market. Ask us to confirm them against this car’s papers.</p>}
          {next && (
            <Link className="next-car" href={'/car/' + encodeURIComponent(next.slug)}>
              {next.photos[0] && <img src={next.photos[0].small} alt="" loading="lazy" decoding="async" />}
              <span><span className="label">Next car</span><strong><Named text={next.name} /></strong></span>
            </Link>
          )}
          {car.credit && <p className="credit">Photos: {car.credit}{car.sitePhotosOnly ? ' on Unsplash' : ''}</p>}
        </div>
      </main>
      <Footer />
    </>
  );
}
