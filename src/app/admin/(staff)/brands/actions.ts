'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStaff, type Role } from '@/lib/staff';
import { supabaseServer } from '@/lib/supabase/server';
import { slugify } from '@/lib/vehicle-form';
import type { Result } from '../inventory/actions';

/* The brands: added from the car editor or the Brands page, edited and ordered there. Inventory roles add and edit;
   deleting a brand is for a manager or the owner, and only once it has no cars. */

const INVENTORY: Role[] = ['OWNER', 'MANAGER', 'INVENTORY_EDITOR'];
type Brand = { id: string; name: string; slug: string };

const refresh = () => { revalidatePath('/[locale]', 'layout'); revalidatePath('/admin', 'layout'); };
const message = (e: { code?: string; message: string }) => {
  if (e.code === '23505') return 'A brand with that name already exists.';
  if (e.code === '23503') return 'This brand still has cars. Give them another brand, or delete them, first.';
  if (e.code === '42501' || /row-level security/.test(e.message)) return 'Your role can’t make this change.';
  console.error('brand action failed:', e.code, e.message);
  return 'That couldn’t be saved just now. Try again in a moment.';
};

export async function createBrand(name: string): Promise<Result<{ brand: Brand }>> {
  const me = await requireStaff();
  if (!INVENTORY.includes(me.profile.role)) return { ok: false, error: 'Your role can’t add brands.' };
  const clean = z.string().trim().min(1).max(80).safeParse(name);
  if (!clean.success) return { ok: false, error: 'Write the brand’s name (up to 80 characters).' };
  const slug = slugify(clean.data);
  if (!slug) return { ok: false, error: 'Write the brand’s name with letters or digits.' };
  const supabase = await supabaseServer();
  const { data: last } = await supabase.from('brands').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  const { data, error } = await supabase.from('brands').insert({ name: clean.data, slug, sort_order: (last?.[0]?.sort_order ?? 0) + 10 }).select('id, name, slug').single();
  if (error) return { ok: false, error: message(error) };
  refresh();
  return { ok: true, brand: data };
}

const brandSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, 'Write the brand’s name.').max(80),
  description: z.object({ en: z.string().max(2000), fr: z.string().max(2000), ar: z.string().max(2000) }),
  is_published: z.boolean(),
});

export async function saveBrand(input: z.input<typeof brandSchema>): Promise<Result> {
  const me = await requireStaff();
  if (!INVENTORY.includes(me.profile.role)) return { ok: false, error: 'Your role can’t change brands.' };
  const p = brandSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const description = Object.fromEntries(Object.entries(p.data.description).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
  const supabase = await supabaseServer();
  const { error } = await supabase.from('brands').update({ name: p.data.name, description, is_published: p.data.is_published }).eq('id', p.data.id);
  if (error) return { ok: false, error: message(error) };
  refresh();
  return { ok: true };
}

export async function moveBrand(id: string, direction: 'up' | 'down'): Promise<Result> {
  const me = await requireStaff();
  if (!INVENTORY.includes(me.profile.role)) return { ok: false, error: 'Your role can’t change the order.' };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('brands').select('id, sort_order').order('sort_order').order('name');
  if (error) return { ok: false, error: message(error) };
  const order = data.map(b => b.id);
  const i = order.indexOf(id), j = direction === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= order.length) return { ok: true };
  [order[i], order[j]] = [order[j], order[i]];
  for (const [n, bid] of order.entries()) {
    if (data.find(b => b.id === bid)!.sort_order === (n + 1) * 10) continue;
    const { error: e } = await supabase.from('brands').update({ sort_order: (n + 1) * 10 }).eq('id', bid);
    if (e) return { ok: false, error: message(e) };
  }
  refresh();
  return { ok: true };
}

export async function deleteBrand(id: string): Promise<Result> {
  const me = await requireStaff();
  if (me.profile.role !== 'OWNER' && me.profile.role !== 'MANAGER') return { ok: false, error: 'Only a manager or the owner can delete a brand.' };
  const supabase = await supabaseServer();
  const { error, count } = await supabase.from('brands').delete({ count: 'exact' }).eq('id', id);
  if (error) return { ok: false, error: message(error) };
  if (!count) return { ok: false, error: 'That brand wasn’t found. Refresh the page.' };
  refresh();
  return { ok: true };
}
