import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { NAME, PRICE, useCars, type Car } from '../data/cars';
import { photo, photoSet, photoSmall } from '../data/images';
import { metaFor, usePageMeta } from '../meta';
import Footer from '../components/Footer';
import { Named, Offline, Waiting } from '../components/ui';

const ASK = 'On request';
const THIS_CAR: [string, (c: Car) => string | number | null][] = [
  ['Year', c => c.year],
  ['Mileage', c => (c.mileage_km == null ? null : c.mileage_km.toLocaleString('en-US') + ' km')],
  ['Color', c => c.color],
  ['Previous owners', c => c.previous_owners],
  ['Service records', c => c.service_records],
  ['Import papers', c => c.import_papers]
];

function List({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <section className="spec-block">
      <h2>{title}</h2>
      <dl>{rows.map(([k, v], i) => <div key={i}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    </section>
  );
}

function Details({ car, next }: { car: Car; next: Car | null }) {
  const [at, setAt] = useState(0);
  const main = car.images[at] ?? car.images[0];
  return (
    <>
      <div className="car-top">
        <div className="gallery">
          <figure className="gallery-main">
            {main && <img src={photo(main)} srcSet={photoSet(main)} sizes="(max-width:900px) 100vw, 62vw" width={1500} height={1000} decoding="async" fetchPriority="high" alt={NAME(car)} />}
            {car.sample && <span className="tag">Sample listing</span>}
            {car.status === 'reserved' && <span className="tag reserved">Reserved</span>}
          </figure>
          {car.images.length > 1 && (
            <div className="thumbs">
              {car.images.map((src, n) => (
                <button key={src + n} type="button" aria-label={'Show photo ' + (n + 1)} aria-pressed={n === at ? 'true' : 'false'} onClick={() => setAt(n)}>
                  <img src={photoSmall(src)} alt="" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="car-head">
          <Link className="crumb" to="/inventory">All cars</Link>
          <p className="label">{car.make}</p>
          <h1><Named text={car.model} /></h1>
          {car.tagline && <p className="car-line">{car.tagline}</p>}
          <p className="price"><Named text={PRICE(car)} /></p>
          {car.status === 'reserved' && <p className="car-line">This car is reserved. Ask us to hear if it becomes available.</p>}
          <Link className="btn" to={'/?car=' + encodeURIComponent(NAME(car)) + '&slug=' + encodeURIComponent(car.id) + '#book'}>Book a private viewing</Link>
        </div>
      </div>
      <div className="spec-grid">
        {car.specs.length > 0 && <List title="Factory specs" rows={car.specs.map(s => [s.label, s.value])} />}
        <List title="This car" rows={THIS_CAR.map(([k, get]) => { const v = get(car); return [k, v == null || v === '' ? ASK : String(v)]; })} />
      </div>
      {car.specs.length > 0 && <p className="spec-note">Factory figures are for the model and can vary by year and market. Ask us to confirm them against this car’s papers.</p>}
      {next && (
        <Link className="next-car" to={'/car/' + encodeURIComponent(next.id)}>
          {next.images[0] && <img src={photoSmall(next.images[0])} alt="" loading="lazy" decoding="async" />}
          <span><span className="label">Next car</span><strong><Named text={NAME(next)} /></strong></span>
        </Link>
      )}
      {car.credit && <p className="credit">Photos: {car.credit}{car.images.every(s => s.startsWith('assets/')) ? ' on Unsplash' : ''}</p>}
    </>
  );
}

/* /car/:id: one car with its photos and specs */
export default function CarPage() {
  const id = useParams().id ?? '';
  const { cars, failed } = useCars();
  const i = cars ? cars.findIndex(c => c.id === id) : -1;
  const car = cars && i >= 0 ? cars[i] : null;
  usePageMeta(metaFor('/car/' + encodeURIComponent(id), car ? [car] : []));
  return (
    <>
      <main id="main" tabIndex={-1}>
        <div id="car" className="car-page">
          {!cars ? (failed ? <Offline /> : <Waiting text="Opening the car…" />)
            : car ? <Details key={car.id} car={car} next={cars.length > 1 ? cars[(i + 1) % cars.length] : null} />
            : (
              <>
                <h1 className="car-missing">We couldn’t find that car.</h1>
                <p className="car-line">It may have been sold. See what’s in the showroom now.</p>
                <Link className="btn" to="/inventory">Back to the inventory</Link>
              </>
            )}
        </div>
      </main>
      <Footer />
    </>
  );
}
