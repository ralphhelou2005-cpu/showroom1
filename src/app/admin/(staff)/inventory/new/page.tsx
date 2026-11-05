import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listBrandOptions, listFeatured } from '@/lib/inventory';
import { requireStaff } from '@/lib/staff';
import { LOCALES, TEXT_FIELDS } from '@/lib/vehicle-form';
import VehicleEditor, { type EditorInitial } from '../VehicleEditor';

export const metadata: Metadata = { title: 'Add a car' };

export default async function NewVehiclePage() {
  const me = await requireStaff();
  if (me.profile.role === 'SALESPERSON') redirect('/admin/inventory');
  const [brands, featured] = await Promise.all([listBrandOptions(), listFeatured()]);
  const initial: EditorInitial = {
    vehicle: {
      slug: '', brand_id: '', model: '', variant: '', body_type: '', model_year: '', mileage_km: '', exterior_color: '', interior_color: '',
      previous_owners: '', vin: '', price: '', currency: 'USD', status: 'available', publication: 'draft', is_featured: false, featured_rank: '',
      is_sample: false, photo_credit: '',
    },
    translations: Object.fromEntries(LOCALES.map(l => [l, Object.fromEntries(TEXT_FIELDS.map(f => [f, '']))])) as EditorInitial['translations'],
    specs: [],
    legacy: false,
    publishedAddress: null,
  };
  const manager = me.profile.role === 'OWNER' || me.profile.role === 'MANAGER';
  return (
    <>
      <Link href="/admin/inventory" className="text-[14px] text-champagne no-underline hover:underline">← Inventory</Link>
      <h1 className="mt-4 text-[clamp(38px,6vw,64px)]">Add a car</h1>
      <p className="mt-3 text-muted">It starts as a draft: only the team sees it until you choose to show it. Photos and videos come right after you create it.</p>
      <VehicleEditor initial={initial} brands={brands} featured={featured} canEdit canSell={manager} canDelete={false} />
    </>
  );
}
