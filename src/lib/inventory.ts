import 'server-only';
import type { Enums, Json } from '@/types/database';
import { mediaPhoto, sitePhoto, storageUrl } from './media';
import { supabaseServer } from './supabase/server';
import { LOCALES, TEXT_FIELDS, type EditorLocale, type Spec, type TextField } from './vehicle-form';

/* What the dashboard's inventory pages read, as the signed-in person (staff see drafts, sold and archived cars). */

export interface InventoryRow {
  id: string; slug: string; name: string; brand: string; year: number | null; price: number | null; currency: string;
  status: Enums<'vehicle_status'>; publication: Enums<'publication_status'>; isFeatured: boolean; featuredRank: number | null;
  isSample: boolean; sortOrder: number; thumb: string | null; photos: number; videos: number; legacy: boolean; updatedAt: string;
}

export interface MediaItem {
  id: string; kind: Enums<'media_kind'>; bucket: string | null; path: string; posterPath: string | null;
  url: string; thumb: string; poster: string | null; alt: Partial<Record<EditorLocale, string>>; sortOrder: number;
  width: number | null; height: number | null; duration: number | null;
}

const name = (brand: string, model: string, variant: string | null, title?: string | null) => title || `${brand} ${variant ? `${model} ${variant}` : model}`;

export function mediaItem(m: { id: string; kind: Enums<'media_kind'>; storage_bucket: string | null; storage_path: string; poster_path: string | null;
  alt: Json; sort_order: number; width: number | null; height: number | null; duration_seconds: number | null }): MediaItem {
  const photo = m.kind === 'image' ? mediaPhoto(m.storage_bucket, m.storage_path) : null;
  const poster = m.poster_path ? (m.storage_bucket ? storageUrl(m.storage_bucket, m.poster_path) : sitePhoto(m.poster_path).src) : null;
  return {
    id: m.id, kind: m.kind, bucket: m.storage_bucket, path: m.storage_path, posterPath: m.poster_path,
    url: photo ? photo.src : m.storage_bucket ? storageUrl(m.storage_bucket, m.storage_path) : m.storage_path,
    thumb: photo ? photo.small : poster ?? '', poster, alt: (m.alt ?? {}) as MediaItem['alt'], sortOrder: m.sort_order,
    width: m.width, height: m.height, duration: m.duration_seconds,
  };
}

export async function listInventory(): Promise<InventoryRow[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('vehicles')
    .select(`id, slug, model, variant, model_year, price, currency, status, publication, is_featured, featured_rank, is_sample, sort_order, legacy_id, updated_at, created_at,
      brands ( name ), vehicle_translations ( locale, title ), vehicle_media ( kind, storage_bucket, storage_path, poster_path, sort_order )`)
    .order('sort_order').order('created_at');
  if (error) throw new Error('inventory: ' + error.message);
  return data.map(v => {
    const media = [...v.vehicle_media].sort((a, b) => a.sort_order - b.sort_order);
    const first = media.find(m => m.kind === 'image');
    const title = v.vehicle_translations.find(t => t.locale === 'en')?.title;
    return {
      id: v.id, slug: v.slug, name: name(v.brands?.name ?? '', v.model, v.variant, title), brand: v.brands?.name ?? '', year: v.model_year,
      price: v.price, currency: v.currency, status: v.status, publication: v.publication, isFeatured: v.is_featured, featuredRank: v.featured_rank,
      isSample: v.is_sample, sortOrder: v.sort_order, thumb: first ? mediaPhoto(first.storage_bucket, first.storage_path).small : null,
      photos: media.filter(m => m.kind === 'image').length, videos: media.filter(m => m.kind === 'video').length, legacy: !!v.legacy_id, updatedAt: v.updated_at,
    };
  });
}

/* the cars featured on the home page now, by position */
export async function listFeatured() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('vehicles').select('id, model, variant, featured_rank, publication, status, brands ( name )')
    .eq('is_featured', true).order('featured_rank').order('sort_order');
  if (error) throw new Error('featured: ' + error.message);
  return data.map(v => ({ id: v.id, name: name(v.brands?.name ?? '', v.model, v.variant), rank: v.featured_rank, shown: v.publication === 'published' && v.status !== 'sold' }));
}

export async function listBrandOptions() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('brands').select('id, name, slug').order('name');
  if (error) throw new Error('brands: ' + error.message);
  return data;
}

export type EditorVehicle = NonNullable<Awaited<ReturnType<typeof getVehicleForEditor>>>;

export async function getVehicleForEditor(id: string) {
  const supabase = await supabaseServer();
  const { data: v, error } = await supabase.from('vehicles')
    .select(`id, slug, brand_id, model, variant, body_type, model_year, mileage_km, exterior_color, interior_color, previous_owners, vin, price, currency,
      status, publication, published_at, is_featured, featured_rank, is_sample, photo_credit, legacy_id, updated_at,
      brands ( name ),
      vehicle_translations ( locale, title, tagline, description, service_records, import_papers, seo_title, seo_description ),
      vehicle_media ( id, kind, storage_bucket, storage_path, poster_path, alt, sort_order, width, height, duration_seconds ),
      vehicle_features ( id, group_key, sort_order, vehicle_feature_translations ( locale, label, value ) )`)
    .eq('id', id).maybeSingle();
  if (error) throw new Error('vehicle: ' + error.message);
  if (!v) return null;
  const translations = Object.fromEntries(LOCALES.map(l => {
    const t = v.vehicle_translations.find(x => x.locale === l);
    return [l, Object.fromEntries(TEXT_FIELDS.map(f => [f, (t?.[f] as string | null) ?? '']))];
  })) as Record<EditorLocale, Record<TextField, string>>;
  const specs: Spec[] = [...v.vehicle_features].filter(f => f.group_key === 'specs').sort((a, b) => a.sort_order - b.sort_order)
    .map(f => Object.fromEntries(f.vehicle_feature_translations.map(t => [t.locale, { label: t.label, value: t.value }])) as Spec);
  const media = [...v.vehicle_media].sort((a, b) => a.sort_order - b.sort_order).map(mediaItem);
  const vehicle = {
    id: v.id, slug: v.slug, brand_id: v.brand_id, model: v.model, variant: v.variant, body_type: v.body_type, model_year: v.model_year,
    mileage_km: v.mileage_km, exterior_color: v.exterior_color, interior_color: v.interior_color, previous_owners: v.previous_owners,
    vin: v.vin, price: v.price, currency: v.currency, status: v.status, publication: v.publication, published_at: v.published_at,
    is_featured: v.is_featured, featured_rank: v.featured_rank, is_sample: v.is_sample, photo_credit: v.photo_credit,
    legacy_id: v.legacy_id, updated_at: v.updated_at,
  };
  return { vehicle, brandName: v.brands?.name ?? '', translations, specs, media };
}
