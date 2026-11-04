import { Link } from '@/i18n/link';
import type { Vehicle } from '@/lib/catalog';
import { FEATURED } from '@/data/featured';
import { formatPrice } from '@/lib/labels';
import { asset } from '@/lib/media';
import Front, { type Window } from './FeaturedFront';

/* The front of the dealership, one picture with a link over each of its six glass windows. The words in each
   window come from the car list on the server (the defaults in src/data/featured.ts if a car is not listed). */
function windows(vehicles: Vehicle[] | null): Window[] {
  return FEATURED.map(w => {
    const v = vehicles?.find(c => c.slug === w.id);
    const name = v ? v.name : w.name, year = v?.year ?? w.year, price = v ? formatPrice(v.price, v.currency) : 'Price on request';
    return { slug: w.id, name, detail: year + ' · ' + price, label: `${name}, ${year}, ${price}, in showroom window ${w.window}. View car`, x: w.x, w: w.w };
  });
}

const plate = () => {
  const src = asset('assets/dealership.webp');
  return { src, set: `${asset('assets/dealership-1200.webp')} 1200w, ${asset('assets/dealership-1800.webp')} 1800w, ${src} 2600w` };
};

const Hint = () => <p className="featured-hint"><span className="only-hover">Point at a window to see the car.</span><span className="only-touch">Tap a window to see the car.</span></p>;

/* "In our windows." as a section of the home page: the building waits until the walk-in has loaded */
export default function FeaturedShowroom({ vehicles }: { vehicles: Vehicle[] | null }) {
  return (
    <section className="featured" id="featured" aria-labelledby="featuredTitle">
      <div className="featured-head">
        <div>
          <p className="label">Featured tonight</p>
          <h2 id="featuredTitle">In our windows.</h2>
        </div>
        <Hint />
      </div>
      <Front afterHero plate={plate()} windows={windows(vehicles)} />
    </section>
  );
}

/* the same, as its own page (/featured) */
export function FeaturedPageSection({ vehicles }: { vehicles: Vehicle[] | null }) {
  return (
    <section className="featured featured-page" aria-labelledby="featuredTitle">
      <div className="featured-head">
        <div>
          <p className="label">Featured tonight</p>
          <h1 id="featuredTitle">In our windows.</h1>
        </div>
        <Hint />
      </div>
      <Front plate={plate()} windows={windows(vehicles)} />
      <noscript><p className="featured-hint" style={{ padding: '16px var(--gutter)' }}><a href="inventory">See every car in the inventory.</a></p></noscript>
      <div className="featured-actions">
        <Link className="btn" href="/inventory">View the inventory</Link>
        <Link className="btn ghost" href="/#book">Book a private viewing</Link>
      </div>
    </section>
  );
}
