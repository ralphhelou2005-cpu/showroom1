import { Link } from '@/i18n/link';
import type { Vehicle } from '@/lib/catalog';
import { formatPrice } from '@/lib/labels';
import { Named, vars } from './ui';

const spec = (v: Vehicle, label: string) => v.specs.find(s => s.label.toLowerCase() === label)?.value;

/* one car on the inventory or a brand page; the first one ("lead") is shown large */
export default function CarCard({ car, i, lead }: { car: Vehicle; i: number; lead: boolean }) {
  const power = (spec(car, 'power') || '').split(' at ')[0];
  const line = [spec(car, 'engine'), power].filter(Boolean).join(', ') || car.tagline || '';
  const main = car.photos[0];
  return (
    <Link className={'vehicle' + (lead ? ' lead' : '')} href={'/car/' + encodeURIComponent(car.slug)} style={vars({ animationDelay: i * 70 + 'ms' })}>
      <figure>
        {main && (
          <img src={main.src} srcSet={main.set} sizes={lead ? '(max-width:900px) 100vw, 66vw' : '(max-width:560px) 100vw, (max-width:900px) 50vw, 33vw'}
            width={1500} height={1000} decoding="async" alt={car.name} loading={i > 1 ? 'lazy' : undefined} />
        )}
        {car.isSample && <span className="tag">Sample</span>}
        {car.status === 'reserved' && <span className="tag reserved">Reserved</span>}
      </figure>
      <p className="label">{car.make}</p>
      <h2><Named text={car.model} /></h2>
      <p className="spec">{line}</p>
      <div className="row"><span className="price"><Named text={formatPrice(car.price, car.currency)} /></span><span className="see">View specs</span></div>
    </Link>
  );
}
