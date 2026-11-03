import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { NAME, PRICE, useCars } from '../data/cars';
import { FEATURED } from '../data/featured';
import { asset } from '../data/images';
import { vars } from './ui';

const PLATE = asset('assets/dealership.webp');
const PLATE_SET = `${asset('assets/dealership-1200.webp')} 1200w, ${asset('assets/dealership-1800.webp')} 1800w, ${PLATE} 2600w`;

/* The front of the dealership, one picture with a link over each of its six glass windows.
   On the home page (afterHero) the building waits until the walk-in has loaded, then fetches ahead of the visitor. */
export function Front({ afterHero = false }: { afterHero?: boolean }) {
  const { cars } = useCars(afterHero);
  const [chosen, setChosen] = useState<string | null>(null);
  const plate = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!afterHero) return;
    const ahead = () => { const i = plate.current; if (!i) return; i.loading = 'eager'; i.decode?.().catch(() => {}); };
    let id = 0, timer = 0;
    const ric = window.requestIdleCallback as typeof requestIdleCallback | undefined;
    const idle = () => { if (ric) id = ric(ahead, { timeout: 3000 }); else timer = window.setTimeout(ahead, 1500); };
    if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
    return () => { removeEventListener('load', idle); if (ric && id) cancelIdleCallback(id); clearTimeout(timer); };
  }, [afterHero]);
  return (
    <div className="front-scroll" tabIndex={-1}>
      <div className="front">
        <img ref={plate} className="front-plate" src={PLATE} srcSet={PLATE_SET} sizes="100vw" width={2600} height={1103}
          alt="The Milcar showroom at night, with one car behind each of its six glass windows"
          {...(afterHero ? { decoding: 'async' as const, loading: 'lazy' as const } : { fetchPriority: 'high' as const })} />
        {FEATURED.map(w => {
          /* the window's words come from the car list once it arrives */
          const car = cars?.find(c => c.id === w.id);
          const name = car ? NAME(car) : w.name, year = car?.year ?? w.year, price = car ? PRICE(car) : 'Price on request';
          const detail = year + ' · ' + price;
          return (
            <Link key={w.id} to={'/car/' + encodeURIComponent(w.id)} className={'win' + (chosen === w.id ? ' chosen' : '')}
              style={vars({ '--x': w.x + '%', '--w': w.w + '%' })} data-name={name} data-detail={detail}
              aria-label={`${name}, ${year}, ${price}, in showroom window ${w.window}. View car`}
              onClick={() => setChosen(w.id)}>
              <span className="win-inside"><i className="win-lit" /></span>
              <span className="win-label" aria-hidden="true"><strong>{name}</strong><span>{detail}</span><em>View car →</em></span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const Hint = () => <p className="featured-hint"><span className="only-hover">Point at a window to see the car.</span><span className="only-touch">Tap a window to see the car.</span></p>;

/* "In our windows." as a section of the home page */
export default function FeaturedShowroom() {
  return (
    <section className="featured" id="featured" aria-labelledby="featuredTitle">
      <div className="featured-head">
        <div>
          <p className="label">Featured tonight</p>
          <h2 id="featuredTitle">In our windows.</h2>
        </div>
        <Hint />
      </div>
      <Front afterHero />
    </section>
  );
}

/* the same, as its own page (/featured) */
export function FeaturedPageSection() {
  return (
    <section className="featured featured-page" aria-labelledby="featuredTitle">
      <div className="featured-head">
        <div>
          <p className="label">Featured tonight</p>
          <h1 id="featuredTitle">In our windows.</h1>
        </div>
        <Hint />
      </div>
      <Front />
      <noscript><p className="featured-hint" style={{ padding: '16px var(--gutter)' }}><a href="inventory">See every car in the inventory.</a></p></noscript>
      <div className="featured-actions">
        <Link className="btn" to="/inventory">View the inventory</Link>
        <Link className="btn ghost" to="/#book">Book a private viewing</Link>
      </div>
    </section>
  );
}
