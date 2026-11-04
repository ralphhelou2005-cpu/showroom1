import { Link } from '@/i18n/link';
import { sitePhoto } from '@/lib/media';
import { vars } from './ui';

/* three cars from the showroom as a way into the inventory */
const TEASER = [
  { id: 'f8-tributo', img: 'assets/cars/f8.webp', label: 'Ferrari F8 Tributo specs', alt: 'Red Ferrari F8 Tributo' },
  { id: 'huracan-evo', img: 'assets/cars/huracan.webp', label: 'Lamborghini Huracán EVO specs', alt: 'Orange Lamborghini Huracán EVO' },
  { id: 'g63', img: 'assets/cars/g63.webp', label: 'Mercedes-AMG G 63 specs', alt: 'Black Mercedes-AMG G 63' }
];

export default function InventoryTeaser() {
  return (
    <section className="teaser reveal" id="inventory">
      <div>
        <p className="label rv">The inventory</p>
        <h2 className="rv" style={vars({ '--i': 1 })}>Every car, with its story.</h2>
        <p className="rv" style={vars({ '--i': 2 })}>See what's in the showroom, then ask for the history of the one you want.</p>
        <Link className="btn rv" style={vars({ '--i': 3 })} href="/inventory">View the inventory</Link>
      </div>
      <div className="teaser-cars rv" style={vars({ '--i': 2 })}>
        {TEASER.map(t => {
          const p = sitePhoto(t.img);
          return <Link key={t.id} href={'/car/' + t.id} aria-label={t.label}><img src={p.src} srcSet={p.set} sizes="(max-width:900px) 60vw, 30vw" width={1500} height={1000} alt={t.alt} loading="lazy" decoding="async" /></Link>;
        })}
      </div>
    </section>
  );
}
