import { Link } from '@/i18n/link';
import { getWords } from '@/i18n/server-words';
import type { Vehicle } from '@/lib/catalog';
import { sitePhoto, type Photo } from '@/lib/media';
import { vars } from './ui';

/* three cars from the showroom as a way into the inventory: the featured ones, by their position (chosen in the
   dashboard), then the next cars on show if fewer than three are featured. If the cars can't be read, the three
   the page has always shown. */
const FALLBACK = [
  { slug: 'f8-tributo', photo: sitePhoto('assets/cars/f8.webp'), name: 'Ferrari F8 Tributo', alt: 'Red Ferrari F8 Tributo' },
  { slug: 'huracan-evo', photo: sitePhoto('assets/cars/huracan.webp'), name: 'Lamborghini Huracán EVO', alt: 'Orange Lamborghini Huracán EVO' },
  { slug: 'g63', photo: sitePhoto('assets/cars/g63.webp'), name: 'Mercedes-AMG G 63', alt: 'Black Mercedes-AMG G 63' },
];

function pick(vehicles: Vehicle[]): { slug: string; photo: Photo; name: string; alt: string }[] {
  const withPhoto = vehicles.filter(v => v.photos.length > 0);
  const featured = withPhoto.filter(v => v.isFeatured).sort((a, b) => (a.featuredRank ?? 99) - (b.featuredRank ?? 99));
  const rest = withPhoto.filter(v => !v.isFeatured);
  return [...featured, ...rest].slice(0, 3).map(v => ({ slug: v.slug, photo: v.photos[0], name: v.name, alt: v.photos[0].alt ?? v.name }));
}

export default async function InventoryTeaser({ vehicles }: { vehicles: Vehicle[] | null }) {
  const { w: { teaser: t } } = await getWords();
  const cars = vehicles ? pick(vehicles) : FALLBACK;
  return (
    <section className="teaser reveal" id="inventory">
      <div>
        <p className="label rv">{t.label}</p>
        <h2 className="rv" style={vars({ '--i': 1 })}>{t.title}</h2>
        <p className="rv" style={vars({ '--i': 2 })}>{t.text}</p>
        <Link className="btn rv" style={vars({ '--i': 3 })} href="/inventory">{t.btn}</Link>
      </div>
      <div className="teaser-cars rv" style={vars({ '--i': 2 })}>
        {cars.map(c => (
          <Link key={c.slug} href={'/car/' + c.slug} aria-label={t.specs(c.name)}><img src={c.photo.src} srcSet={c.photo.set} sizes="(max-width:900px) 60vw, 30vw" width={1500} height={1000} alt={c.alt} loading="lazy" decoding="async" /></Link>
        ))}
      </div>
    </section>
  );
}
