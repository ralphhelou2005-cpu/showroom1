import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { getVehicleForEditor, listBrandOptions, listFeatured } from '@/lib/inventory';
import { requireStaff } from '@/lib/staff';
import MediaManager from '../MediaManager';
import VehicleEditor from '../VehicleEditor';

export const metadata: Metadata = { title: 'Car' };

export default async function VehiclePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; copied?: string }> }) {
  const me = await requireStaff();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [car, brands, featured] = await Promise.all([getVehicleForEditor(id), listBrandOptions(), listFeatured()]);
  if (!car) notFound();
  const { saved, copied } = await searchParams;
  const role = me.profile.role;
  const canEdit = role !== 'SALESPERSON';
  const manager = role === 'OWNER' || role === 'MANAGER';
  const v = car.vehicle;
  const onSite = v.publication === 'published' && v.status !== 'sold';
  const name = car.translations.en.title || `${car.brandName} ${v.variant ? `${v.model} ${v.variant}` : v.model}`;
  return (
    <>
      <Link href="/admin/inventory" className="text-[14px] text-champagne no-underline hover:underline">← Inventory</Link>
      <h1 className="mt-4 text-[clamp(34px,5vw,56px)]">{name}</h1>
      {(saved || copied) && (
        <p role="status" className="mt-3 text-champagne-hi">
          {copied ? 'This is the copy, as a draft: change what differs, add its photos, then show it.' : 'Created. Add its photos and videos below, then show it on the website when it’s ready.'}
        </p>
      )}
      {!canEdit && <p className="mt-3 text-muted">You can see this car’s details; the inventory team and managers change them.</p>}
      <VehicleEditor
        initial={{
          id: v.id,
          vehicle: {
            slug: v.slug, brand_id: v.brand_id, model: v.model, variant: v.variant, body_type: v.body_type, model_year: v.model_year,
            mileage_km: v.mileage_km, exterior_color: v.exterior_color, interior_color: v.interior_color, previous_owners: v.previous_owners,
            vin: v.vin, price: v.price, currency: v.currency, status: v.status, publication: v.publication, is_featured: v.is_featured,
            featured_rank: v.featured_rank, is_sample: v.is_sample, photo_credit: v.photo_credit,
          },
          translations: car.translations, specs: car.specs, legacy: !!v.legacy_id,
          publishedAddress: onSite ? `/car/${v.slug}` : null,
        }}
        brands={brands} featured={featured} canEdit={canEdit} canSell={manager} canDelete={manager}>
        <MediaManager vehicleId={v.id} initial={car.media} canEdit={canEdit} />
      </VehicleEditor>
    </>
  );
}
