'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { mediaItem, type MediaItem } from '@/lib/inventory';
import { requireStaff, type Role } from '@/lib/staff';
import { supabaseServer } from '@/lib/supabase/server';
import { editorSchema, LOCALES, type EditorPayload } from '@/lib/vehicle-form';

/* The inventory editor's actions. Each checks the person's role on the server first; the database checks it
   again (its rules and guards, part 13), so a refused change is refused twice. After every change the public
   pages are rebuilt on their next visit, so the website shows it at once. */

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const INVENTORY: Role[] = ['OWNER', 'MANAGER', 'INVENTORY_EDITOR'];
const MANAGERS: Role[] = ['OWNER', 'MANAGER'];

async function allowed(roles: Role[]) {
  const me = await requireStaff();
  return roles.includes(me.profile.role) ? me : null;
}

function refresh() {
  revalidatePath('/[locale]', 'layout');
  revalidatePath('/admin', 'layout');
}

const DB_ERRORS: Record<string, string> = {
  'vehicle.status_requires_manager': 'Only a manager or the owner can reserve or sell a car.',
  'vehicle.not_found': 'This car no longer exists, or your role can’t change it.',
  'media.order_mismatch': 'The photos changed meanwhile. Refresh the page, then try again.',
};
function dbMessage(e: { message: string; code?: string; details?: string | null }, fallback = 'That couldn’t be saved just now. Try again in a moment.') {
  if (DB_ERRORS[e.message]) return DB_ERRORS[e.message];
  if (e.code === '23505' && /slug/.test(e.message + (e.details ?? ''))) return 'Another car already uses this address. Change it under “Address on the website”.';
  if (e.code === '42501' || /row-level security/.test(e.message)) return 'Your role can’t make this change.';
  if (e.code === '23514') return 'One of the values isn’t accepted. Check the numbers and the VIN.';
  console.error('inventory action failed:', e.code, e.message);
  return fallback;
}

export async function saveVehicle(payload: EditorPayload): Promise<Result<{ id: string }>> {
  const me = await allowed(INVENTORY);
  if (!me) return { ok: false, error: 'Your role can see the cars but not change them.' };
  const input = editorSchema.safeParse(payload);
  if (!input.success) return { ok: false, error: input.error.issues[0].message };
  const p = input.data;
  if (!p.id && p.vehicle.status !== 'available' && !MANAGERS.includes(me.profile.role)) return { ok: false, error: DB_ERRORS['vehicle.status_requires_manager'] };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('save_vehicle', { p: { id: p.id, vehicle: p.vehicle, translations: p.translations, specs: p.specs } });
  if (error || !data) return { ok: false, error: dbMessage(error ?? { message: 'no id' }) };
  refresh();
  return { ok: true, id: data };
}

export async function duplicateVehicle(id: string): Promise<Result<{ id: string }>> {
  if (!(await allowed(INVENTORY))) return { ok: false, error: 'Your role can’t add cars.' };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'That car wasn’t found.' };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('duplicate_vehicle', { p_id: id });
  if (error || !data) return { ok: false, error: dbMessage(error ?? { message: 'no id' }, 'The copy couldn’t be made just now. Try again in a moment.') };
  refresh();
  return { ok: true, id: data };
}

/* a car's files in the bucket: each photo, its 800 px copy, and a video's still */
const filesOf = (m: { storage_bucket: string | null; storage_path: string; poster_path: string | null; kind: string }) =>
  m.storage_bucket !== 'media' ? [] : [m.storage_path, ...(m.kind === 'image' ? [m.storage_path.replace(/\.(\w+)$/, '-800.$1')] : []), ...(m.poster_path ? [m.poster_path] : [])];

export async function deleteVehicle(id: string): Promise<Result> {
  if (!(await allowed(MANAGERS))) return { ok: false, error: 'Only a manager or the owner can delete a car. You can archive it instead.' };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'That car wasn’t found.' };
  const supabase = await supabaseServer();
  const { data: media } = await supabase.from('vehicle_media').select('kind, storage_bucket, storage_path, poster_path').eq('vehicle_id', id);
  const { error, count } = await supabase.from('vehicles').delete({ count: 'exact' }).eq('id', id);
  if (error) return { ok: false, error: dbMessage(error, 'The car couldn’t be deleted just now. Try again in a moment.') };
  if (!count) return { ok: false, error: 'That car wasn’t found, or your role can’t delete it.' };
  const paths = (media ?? []).flatMap(filesOf);
  if (paths.length) {
    const { error: e } = await supabase.storage.from('media').remove(paths);
    if (e) console.error('removing a deleted car’s files failed:', e.message);
  }
  refresh();
  return { ok: true };
}

/* the showroom order: the car moves one place up or down */
export async function moveVehicle(id: string, direction: 'up' | 'down'): Promise<Result> {
  if (!(await allowed(INVENTORY))) return { ok: false, error: 'Your role can’t change the showroom order.' };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('vehicles').select('id, sort_order').order('sort_order').order('created_at');
  if (error) return { ok: false, error: dbMessage(error) };
  const order = data.map(v => v.id);
  const i = order.indexOf(id), j = direction === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= order.length) return { ok: true };
  [order[i], order[j]] = [order[j], order[i]];
  for (const [n, vid] of order.entries()) {
    const want = (n + 1) * 10;
    if (data.find(v => v.id === vid)!.sort_order === want) continue;
    const { error: e } = await supabase.from('vehicles').update({ sort_order: want }).eq('id', vid);
    if (e) return { ok: false, error: dbMessage(e) };
  }
  refresh();
  return { ok: true };
}

/* ------------------------------------------------------------ photos and videos */

const newMedia = z.array(z.object({
  kind: z.enum(['image', 'video']),
  path: z.string().max(400),
  posterPath: z.string().max(400).nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  duration: z.number().positive().max(99999).nullable(),
})).min(1).max(40);

/* the files are already in the bucket (the browser uploads them, as the person, under the bucket's rules): this
   records them on the car, after the ones it has */
export async function addMedia(vehicleId: string, items: z.input<typeof newMedia>): Promise<Result<{ media: MediaItem[] }>> {
  if (!(await allowed(INVENTORY))) return { ok: false, error: 'Your role can’t add photos.' };
  const input = newMedia.safeParse(items);
  if (!z.uuid().safeParse(vehicleId).success || !input.success) return { ok: false, error: 'Those files couldn’t be added. Try again.' };
  const folder = `vehicles/${vehicleId}/`;
  if (input.data.some(m => !m.path.startsWith(folder) || (m.posterPath && !m.posterPath.startsWith(folder)))) return { ok: false, error: 'Those files belong to another car.' };
  const supabase = await supabaseServer();
  const { data: last } = await supabase.from('vehicle_media').select('sort_order').eq('vehicle_id', vehicleId).order('sort_order', { ascending: false }).limit(1);
  const start = (last?.[0]?.sort_order ?? 0) + 10;
  const { data, error } = await supabase.from('vehicle_media').insert(input.data.map((m, n) => ({
    vehicle_id: vehicleId, kind: m.kind, storage_bucket: 'media', storage_path: m.path, poster_path: m.posterPath,
    width: m.width, height: m.height, duration_seconds: m.duration, sort_order: start + n * 10,
  }))).select('id, kind, storage_bucket, storage_path, poster_path, alt, sort_order, width, height, duration_seconds');
  if (error) return { ok: false, error: dbMessage(error, 'Those files couldn’t be added just now. Try again in a moment.') };
  refresh();
  return { ok: true, media: data.map(mediaItem) };
}

export async function saveMediaAlt(mediaId: string, alt: Record<string, string>): Promise<Result> {
  if (!(await allowed(INVENTORY))) return { ok: false, error: 'Your role can’t change photos.' };
  const clean = Object.fromEntries(LOCALES.map(l => [l, (alt[l] ?? '').trim().slice(0, 300)]).filter(([, v]) => v));
  const supabase = await supabaseServer();
  const { error } = await supabase.from('vehicle_media').update({ alt: clean }).eq('id', mediaId);
  if (error) return { ok: false, error: dbMessage(error) };
  refresh();
  return { ok: true };
}

export async function reorderMedia(vehicleId: string, ids: string[]): Promise<Result> {
  if (!(await allowed(INVENTORY))) return { ok: false, error: 'Your role can’t change photos.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('reorder_vehicle_media', { p_vehicle: vehicleId, p_ids: ids });
  if (error) return { ok: false, error: dbMessage(error) };
  refresh();
  return { ok: true };
}

export async function deleteMedia(mediaId: string): Promise<Result> {
  if (!(await allowed(INVENTORY))) return { ok: false, error: 'Your role can’t delete photos.' };
  const supabase = await supabaseServer();
  const { data: m } = await supabase.from('vehicle_media').select('kind, storage_bucket, storage_path, poster_path').eq('id', mediaId).maybeSingle();
  if (!m) return { ok: false, error: 'That photo is already gone. Refresh the page.' };
  const { error } = await supabase.from('vehicle_media').delete().eq('id', mediaId);
  if (error) return { ok: false, error: dbMessage(error) };
  const paths = filesOf(m);
  if (paths.length) {
    const { error: e } = await supabase.storage.from('media').remove(paths);
    if (e) console.error('removing a photo’s files failed:', e.message);
  }
  refresh();
  return { ok: true };
}

/* files uploaded for something that then failed to save */
export async function discardUploads(vehicleId: string, paths: string[]): Promise<Result> {
  if (!(await allowed(INVENTORY))) return { ok: false, error: 'Your role can’t delete files.' };
  const mine = paths.filter(p => p.startsWith(`vehicles/${vehicleId}/`));
  if (mine.length) await (await supabaseServer()).storage.from('media').remove(mine);
  return { ok: true };
}
