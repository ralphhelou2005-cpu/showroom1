import { Link } from '@/i18n/link';
import { getWords } from '@/i18n/server-words';
import type { Words } from '@/i18n/words';
import type { Locale } from '@/i18n/routing';
import type { Vehicle } from '@/lib/catalog';
import { FEATURED } from '@/data/featured';
import { formatPrice } from '@/lib/labels';
import { asset } from '@/lib/media';
import Front, { type Window } from './FeaturedFront';

/* The front of the dealership, one picture with a link over each of its six glass windows. The words in each
   window come from the car list on the server (the defaults in src/data/featured.ts if a car is not listed). */
function windows(vehicles: Vehicle[] | null, t: Words, locale: Locale): Window[] {
  return FEATURED.map(w => {
    const v = vehicles?.find(c => c.slug === w.id);
    const name = v ? v.name : w.name, year = v?.year ?? w.year, price = v ? formatPrice(v.price, v.currency, locale, t.common.priceOnRequest) : t.common.priceOnRequest;
    return { slug: w.id, name, detail: year + ' · ' + price, label: t.featured.window(name, year, price, w.window), x: w.x, w: w.w };
  });
}

const plate = () => {
  const src = asset('assets/dealership.webp');
  return { src, set: `${asset('assets/dealership-1200.webp')} 1200w, ${asset('assets/dealership-1800.webp')} 1800w, ${src} 2600w` };
};

const Hint = ({ t }: { t: Words['featured'] }) => <p className="featured-hint"><span className="only-hover">{t.hover}</span><span className="only-touch">{t.touch}</span></p>;

/* "In our windows." as a section of the home page: the building waits until the walk-in has loaded */
export default async function FeaturedShowroom({ vehicles }: { vehicles: Vehicle[] | null }) {
  const { w, locale } = await getWords();
  return (
    <section className="featured" id="featured" aria-labelledby="featuredTitle">
      <div className="featured-head">
        <div>
          <p className="label">{w.featured.label}</p>
          <h2 id="featuredTitle">{w.featured.title}</h2>
        </div>
        <Hint t={w.featured} />
      </div>
      <Front afterHero plate={plate()} windows={windows(vehicles, w, locale)} alt={w.featured.plateAlt} view={w.featured.view} />
    </section>
  );
}

/* the same, as its own page (/featured) */
export async function FeaturedPageSection({ vehicles }: { vehicles: Vehicle[] | null }) {
  const { w, locale } = await getWords();
  return (
    <section className="featured featured-page" aria-labelledby="featuredTitle">
      <div className="featured-head">
        <div>
          <p className="label">{w.featured.label}</p>
          <h1 id="featuredTitle">{w.featured.title}</h1>
        </div>
        <Hint t={w.featured} />
      </div>
      <Front plate={plate()} windows={windows(vehicles, w, locale)} alt={w.featured.plateAlt} view={w.featured.view} />
      <noscript><p className="featured-hint" style={{ padding: '16px var(--gutter)' }}><a href="inventory">{w.featured.noscript}</a></p></noscript>
      <div className="featured-actions">
        <Link className="btn" href="/inventory">{w.featured.inventory}</Link>
        <Link className="btn ghost" href="/#book">{w.featured.book}</Link>
      </div>
    </section>
  );
}
