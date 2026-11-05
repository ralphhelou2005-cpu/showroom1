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
import { WORDS, type Words } from '@/i18n/words';
import { carJsonLd } from '@/lib/structured-data';

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
  const m = WORDS[locale].meta;
  if (!found) return { title: { absolute: m.carMissing }, robots: { index: false } };
  const v = found.vehicle;
  const d = v.seoDescription || m.car(v.name, v.tagline);
  return pageMeta({ title: (v.seoTitle || v.name) + (locale === 'ar' ? ' | ميلكار' : ' | Milcar'), description: d, image: v.photos[0]?.src, path: '/car/' + v.slug, locale });
}

const thisCar = (t: Words['car'], locale: string): [string, (v: Vehicle) => string | number | null][] => [
  [t.rows[0], v => v.year],
  [t.rows[1], v => (v.mileageKm == null ? null : v.mileageKm.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US') + ' ' + t.km)],
  [t.rows[2], v => v.color],
  [t.rows[3], v => v.previousOwners],
  [t.rows[4], v => v.serviceRecords],
  [t.rows[5], v => v.importPapers],
];

function List({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <section className="spec-block">
      <h2>{title}</h2>
      <dl>{rows.map(([k, v], i) => <div key={i}><dt>{k}</dt><dd><bdi>{v}</bdi></dd></div>)}</dl>
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
  const w = WORDS[locale], t = w.car;
  return (
    <>
      <main id="main" tabIndex={-1}>
        <div id="car" className="car-page">
          <div className="car-top">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: carJsonLd(car, locale) }} />
            <Gallery items={car.gallery} name={car.name} sample={car.isSample} reserved={car.status === 'reserved'} t={t.gallery} />
            <div className="car-head">
              <Link className="crumb" href="/inventory">{t.all}</Link>
              <p className="label">{car.make}</p>
              <h1><Named text={car.model} /></h1>
              {car.tagline && <p className="car-line"><bdi>{car.tagline}</bdi></p>}
              <p className="price"><Named text={formatPrice(car.price, car.currency, locale, w.common.priceOnRequest)} /></p>
              {car.status === 'reserved' && <p className="car-line">{t.reservedLine}</p>}
              <Link className="btn" href={'/?car=' + encodeURIComponent(car.name) + '&slug=' + car.slug + '#book'}>{t.book}</Link>
            </div>
          </div>
          {car.description && <p className="car-story"><bdi>{car.description}</bdi></p>}
          <div className="spec-grid">
            {car.specs.length > 0 && <List title={t.factory} rows={car.specs.map(s => [s.label, s.value])} />}
            <List title={t.thisCar} rows={thisCar(t, locale).map(([k, get]) => { const v = get(car); return [k, v == null || v === '' ? t.ask : String(v)]; })} />
          </div>
          {car.specs.length > 0 && <p className="spec-note">{t.note}</p>}
          {next && (
            <Link className="next-car" href={'/car/' + encodeURIComponent(next.slug)}>
              {next.photos[0] && <img src={next.photos[0].small} alt="" loading="lazy" decoding="async" />}
              <span><span className="label">{t.next}</span><strong><Named text={next.name} /></strong></span>
            </Link>
          )}
          {car.credit && <p className="credit">{t.photos} {car.credit}{car.sitePhotosOnly ? t.unsplash : ''}</p>}
        </div>
      </main>
      <Footer />
    </>
  );
}
