import { Link } from 'react-router';
import { NAME, PRICE, spec, type Car } from '../data/cars';
import { photo, photoSet } from '../data/images';
import { Named, vars } from './ui';

/* one car on the inventory page; the first one ("lead") is shown large */
export default function CarCard({ car, i, lead }: { car: Car; i: number; lead: boolean }) {
  const power = (spec(car, 'power') || '').split(' at ')[0];
  const line = [spec(car, 'engine'), power].filter(Boolean).join(', ') || car.tagline || '';
  return (
    <Link className={'vehicle' + (lead ? ' lead' : '')} to={'/car/' + encodeURIComponent(car.id)} style={vars({ animationDelay: i * 70 + 'ms' })}>
      <figure>
        {car.images[0] && (
          <img src={photo(car.images[0])} srcSet={photoSet(car.images[0])} sizes={lead ? '(max-width:900px) 100vw, 66vw' : '(max-width:560px) 100vw, (max-width:900px) 50vw, 33vw'}
            width={1500} height={1000} decoding="async" alt={NAME(car)} loading={i > 1 ? 'lazy' : undefined} />
        )}
        {car.sample && <span className="tag">Sample</span>}
        {car.status === 'reserved' && <span className="tag reserved">Reserved</span>}
      </figure>
      <p className="label">{car.make}</p>
      <h2><Named text={car.model} /></h2>
      <p className="spec">{line}</p>
      <div className="row"><span className="price"><Named text={PRICE(car)} /></span><span className="see">View specs</span></div>
    </Link>
  );
}
