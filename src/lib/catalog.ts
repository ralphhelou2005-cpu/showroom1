import 'server-only';
import { cache } from 'react';
import type { Locale } from '@/i18n/routing';
import type { Enums } from '@/types/database';
import { mediaPhoto, sitePhoto, storageUrl, type Photo } from './media';
import { supabasePublic } from './supabase/public';

/* The showroom's cars as the public pages show them: published, not sold, in the showroom's order, with the
   text in the visitor's language (English where a translation is missing). Read with the publishable key, so
   the database rules decide what is visible exactly as for any visitor. */
export interface Spec { label: string; value: string }
export type GalleryItem = ({ kind: 'image' } & Photo) | { kind: 'video'; src: string; poster: string | null };
export interface Vehicle {
  id: string;
  slug: string;                  /* the address: /car/f8-tributo */
  make: string;                  /* the brand's name */
  brandSlug: string;
  model: string;
  name: string;                  /* "Ferrari F8 Tributo" */
  bodyType: Enums<'body_type'>;
  tagline: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  year: number | null;
  mileageKm: number | null;
  color: string | null;
  previousOwners: number | null;
  serviceRecords: string | null;
  importPapers: string | null;
  price: number | null;
  currency: string;
  status: Enums<'vehicle_status'>;
  isSample: boolean;
  isFeatured: boolean;
  featuredRank: number | null;  /* its place among the featured cars on the home page */
  credit: string | null;
  photos: Photo[];               /* the photos in order, the first being the main picture (alt: its description, if written) */
  gallery: GalleryItem[];        /* photos and videos in their order, for the car page */
  sitePhotosOnly: boolean;       /* every photo ships with the site (the stock photos of the sample cars) */
  specs: Spec[];
}

const SELECT = `id, slug, model, variant, body_type, model_year, mileage_km, exterior_color, previous_owners, price, currency,
  status, is_featured, featured_rank, is_sample, photo_credit, sort_order, created_at,
  brands!inner ( name, slug ),
  vehicle_translations ( locale, title, tagline, description, service_records, import_papers, seo_title, seo_description ),
  vehicle_media ( kind, storage_bucket, storage_path, poster_path, alt, sort_order ),
  vehicle_features ( group_key, sort_order, vehicle_feature_translations ( locale, label, value ) )`;

/* the text in this language, else in English */
function pick<T extends { locale: string }>(rows: T[], locale: Locale): T | undefined {
  return rows.find(r => r.locale === locale) ?? rows.find(r => r.locale === 'en');
}

export const listVehicles = cache(async (locale: Locale = 'en'): Promise<Vehicle[]> => {
  const { data, error } = await supabasePublic()
    .from('vehicles')
    .select(SELECT)
    .eq('publication', 'published')
    .neq('status', 'sold')
    .order('sort_order')
    .order('created_at');
  if (error) throw new Error('catalog: could not read the vehicles (' + error.message + ')');
  return data.map(v => {
    const t = pick(v.vehicle_translations, locale);
    const all = [...v.vehicle_media].sort((a, b) => a.sort_order - b.sort_order);
    const media = all.filter(m => m.kind === 'image');
    const photo = (m: (typeof all)[number]): Photo => {
      const alt = m.alt as Record<string, string> | null;
      const text = alt?.[locale] || alt?.en;
      return text ? { ...mediaPhoto(m.storage_bucket, m.storage_path), alt: text } : mediaPhoto(m.storage_bucket, m.storage_path);
    };
    const specs = [...v.vehicle_features]
      .filter(f => f.group_key === 'specs')
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(f => pick(f.vehicle_feature_translations, locale))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map(s => ({ label: s.label, value: s.value }));
    const model = v.variant ? `${v.model} ${v.variant}` : v.model;
    return {
      id: v.id,
      slug: v.slug,
      make: v.brands.name,
      brandSlug: v.brands.slug,
      model,
      name: t?.title || `${v.brands.name} ${model}`,
      bodyType: v.body_type,
      tagline: t?.tagline ?? null,
      description: t?.description ?? null,
      seoTitle: t?.seo_title ?? null,
      seoDescription: t?.seo_description ?? null,
      year: v.model_year,
      mileageKm: v.mileage_km,
      color: v.exterior_color,
      previousOwners: v.previous_owners,
      serviceRecords: t?.service_records ?? null,
      importPapers: t?.import_papers ?? null,
      price: v.price,
      currency: v.currency,
      status: v.status,
      isSample: v.is_sample,
      isFeatured: v.is_featured,
      featuredRank: v.featured_rank,
      credit: v.photo_credit,
      photos: media.map(photo),
      gallery: all.map((m): GalleryItem => m.kind === 'image' ? { kind: 'image', ...photo(m) } : {
        kind: 'video', src: m.storage_bucket ? storageUrl(m.storage_bucket, m.storage_path) : m.storage_path,
        poster: m.poster_path ? (m.storage_bucket ? storageUrl(m.storage_bucket, m.poster_path) : sitePhoto(m.poster_path).src) : null,
      }),
      sitePhotosOnly: media.every(m => m.storage_bucket === null),
      specs,
    };
  });
});

export const getVehicle = cache(async (slug: string, locale: Locale = 'en') => {
  const all = await listVehicles(locale);
  const i = all.findIndex(v => v.slug === slug);
  return i < 0 ? null : { vehicle: all[i], next: all.length > 1 ? all[(i + 1) % all.length] : null };
});

export interface Brand { slug: string; name: string; description: string | null; vehicles: Vehicle[] }

/* the brands that have cars on show, in the showroom's order */
export const listBrands = cache(async (locale: Locale = 'en'): Promise<Brand[]> => {
  const [vehicles, { data, error }] = await Promise.all([
    listVehicles(locale),
    supabasePublic().from('brands').select('slug, name, description, sort_order').eq('is_published', true).order('sort_order').order('name'),
  ]);
  if (error) throw new Error('catalog: could not read the brands (' + error.message + ')');
  return data
    .map(b => {
      const d = (b.description ?? {}) as Record<string, string>;
      return { slug: b.slug, name: b.name, description: d[locale] ?? d.en ?? null, vehicles: vehicles.filter(v => v.brandSlug === b.slug) };
    })
    .filter(b => b.vehicles.length > 0);
});

export interface Business {
  name: string;
  address: string | null;
  mapUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  hours: { weekday: number; opens: string; closes: string }[];
}

/* the showroom's own details, exactly as the owner entered them (empty ones are simply not shown) */
export const getBusiness = cache(async (): Promise<Business> => {
  const db = supabasePublic();
  const [profile, hours] = await Promise.all([
    db.from('site_settings').select('value').eq('key', 'business.profile').maybeSingle(),
    db.from('business_hours').select('weekday, opens_at, closes_at').order('weekday').order('opens_at'),
  ]);
  if (profile.error) throw new Error('catalog: could not read the business details (' + profile.error.message + ')');
  if (hours.error) throw new Error('catalog: could not read the opening hours (' + hours.error.message + ')');
  const p = (profile.data?.value ?? {}) as Record<string, string | null>;
  const text = (k: string) => (typeof p[k] === 'string' && p[k]!.trim() ? p[k]!.trim() : null);
  return {
    name: text('name') ?? 'Milcar',
    address: text('address'),
    mapUrl: text('map_url'),
    phone: text('phone'),
    whatsapp: text('whatsapp'),
    email: text('email'),
    instagram: text('instagram'),
    hours: hours.data.map(h => ({ weekday: h.weekday, opens: h.opens_at.slice(0, 5), closes: h.closes_at.slice(0, 5) })),
  };
});
