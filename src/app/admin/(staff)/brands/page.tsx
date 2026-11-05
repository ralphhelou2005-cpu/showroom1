import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/staff';
import { supabaseServer } from '@/lib/supabase/server';
import BrandList from './BrandList';

export const metadata: Metadata = { title: 'Brands' };

/* the makers: their names, the words on their page of the website, whether they show, and their order */
export default async function BrandsPage() {
  const me = await requireStaff();
  if (me.profile.role === 'SALESPERSON') redirect('/admin/inventory');
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('brands').select('id, name, slug, description, is_published, sort_order, vehicles ( id, publication, status )').order('sort_order').order('name');
  const brands = (data ?? []).map(b => ({
    id: b.id, name: b.name, slug: b.slug, isPublished: b.is_published,
    description: { en: '', fr: '', ar: '', ...(b.description as Record<string, string>) },
    cars: b.vehicles.length, onSite: b.vehicles.filter(v => v.publication === 'published' && v.status !== 'sold').length,
  }));
  return (
    <>
      <p className="label">The makers</p>
      <h1 className="mt-3 text-[clamp(38px,6vw,64px)]">Brands</h1>
      <p className="mt-4 max-w-[70ch] text-muted">The website’s Brands page lists the brands with cars on show, in this order. New brands are also added from a car’s page.</p>
      {error ? <p role="alert" className="mt-8 text-muted">The brands couldn’t be loaded just now. Refresh the page in a moment.</p>
        : <BrandList brands={brands} canDelete={me.profile.role === 'OWNER' || me.profile.role === 'MANAGER'} />}
    </>
  );
}
