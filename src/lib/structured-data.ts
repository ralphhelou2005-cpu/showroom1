import 'server-only';
import type { Locale } from '@/i18n/routing';
import type { Business, Vehicle } from './catalog';
import { publicEnv } from './env';
import { localPath } from './seo';

/* What search engines read about the showroom and each car (schema.org), from the same data the pages show. */
const site = () => publicEnv().NEXT_PUBLIC_SITE_URL;
const json = (o: object) => JSON.stringify(o).replace(/</g, '\u003c');

export function businessJsonLd(b: Business | null, locale: Locale) {
  return json({
    '@context': 'https://schema.org', '@type': 'AutoDealer', name: b?.name ?? 'Milcar', url: site() + localPath('/', locale),
    ...(b?.phone ? { telephone: b.phone } : {}), ...(b?.email ? { email: b.email } : {}), ...(b?.address ? { address: b.address } : {}),
    ...(b?.mapUrl ? { hasMap: b.mapUrl } : {}),
    ...(b?.hours.length ? { openingHoursSpecification: b.hours.map(h => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/' + ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][h.weekday], opens: h.opens, closes: h.closes })) } : {}),
  });
}

export function carJsonLd(v: Vehicle, locale: Locale) {
  const url = site() + localPath('/car/' + v.slug, locale);
  return json({
    '@context': 'https://schema.org', '@type': 'Car', name: v.name, url, brand: { '@type': 'Brand', name: v.make }, model: v.model,
    ...(v.year ? { vehicleModelDate: String(v.year) } : {}), ...(v.color ? { color: v.color } : {}),
    ...(v.mileageKm != null ? { mileageFromOdometer: { '@type': 'QuantitativeValue', value: v.mileageKm, unitCode: 'KMT' } } : {}),
    ...(v.description || v.tagline ? { description: v.description || v.tagline } : {}),
    ...(v.photos.length ? { image: v.photos.slice(0, 4).map(p => (p.src.startsWith('http') ? p.src : site() + p.src)) } : {}),
    offers: { '@type': 'Offer', url, availability: v.status === 'reserved' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock',
      ...(v.price != null ? { price: v.price, priceCurrency: v.currency } : {}), seller: { '@type': 'AutoDealer', name: 'Milcar' } },
  });
}
