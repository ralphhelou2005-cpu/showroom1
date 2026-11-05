'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { fromShowroomInput } from '@/lib/admin-format';
import { typed, type FormState } from '@/lib/form-state';
import { requireStaff } from '@/lib/staff';
import { supabaseServer } from '@/lib/supabase/server';

/* The showroom's settings. The owner changes the details, the booking rules and who gets emails; managers and the
   owner set the opening hours and closures. The database's rules check the same again. */

const refresh = () => { revalidatePath('/[locale]', 'layout'); revalidatePath('/admin', 'layout'); };
async function role(...roles: ('OWNER' | 'MANAGER')[]) {
  const me = await requireStaff();
  return (roles as string[]).includes(me.profile.role) ? me : null;
}
const fail = (e: { message: string; code?: string }) => {
  if (e.code === '42501' || /row-level security/.test(e.message)) return 'Your role can’t change this.';
  console.error('settings action failed:', e.code, e.message);
  return 'That couldn’t be saved just now. Try again in a moment.';
};
const text = (max: number) => z.string().trim().max(max).transform(s => s || null);
const phone = z.string().trim().transform(s => s.replace(/[\s().-]/g, '')).pipe(z.union([z.literal(''), z.string().regex(/^\+[1-9]\d{6,14}$/, 'Write phone numbers in international form, like +961 3 123 456.')])).transform(s => s || null);

export async function saveBusiness(_: FormState, form: FormData): Promise<FormState> {
  const values = typed(form, 'name', 'address', 'map_url', 'phone', 'whatsapp', 'email', 'instagram');
  if (!(await role('OWNER'))) return { error: 'Only the owner changes the showroom’s details.', values };
  const p = z.object({
    name: z.string().trim().min(1, 'Write the showroom’s name.').max(120), address: text(300),
    map_url: z.union([z.literal(''), z.url('The map link must be a full address starting with https://').refine(u => u.startsWith('https://'), 'The map link must start with https://')]).transform(s => s || null),
    phone, whatsapp: phone, email: z.union([z.literal(''), z.email('Write a valid email.')]).transform(s => s || null),
    instagram: z.union([z.literal(''), z.url('The Instagram link must be a full address, like https://instagram.com/milcar').refine(u => u.startsWith('https://'))]).transform(s => s || null),
  }).safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message, values };
  const supabase = await supabaseServer();
  const { error } = await supabase.from('site_settings').update({ value: p.data }).eq('key', 'business.profile');
  if (error) return { error: fail(error), values };
  refresh();
  return { done: 'Saved. The footer and the contact page show them now.' };
}

export async function saveRules(_: FormState, form: FormData): Promise<FormState> {
  const values = typed(form, 'slot_minutes', 'min_notice_hours', 'max_days_ahead', 'max_parallel', 'requires_approval');
  if (!(await role('OWNER'))) return { error: 'Only the owner changes the booking rules.', values };
  const n = (min: number, max: number, what: string) => z.coerce.number().int(`${what}: a whole number.`).min(min, `${what}: at least ${min}.`).max(max, `${what}: at most ${max}.`);
  const p = z.object({
    slot_minutes: n(15, 240, 'A viewing’s length'), min_notice_hours: n(0, 336, 'Notice'), max_days_ahead: n(1, 365, 'How far ahead'),
    max_parallel: n(1, 20, 'Viewings at once'), requires_approval: z.string().optional(),
  }).safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message, values };
  const supabase = await supabaseServer();
  const { data: current } = await supabase.from('site_settings').select('value').eq('key', 'booking.rules').maybeSingle();
  const value = { ...(current?.value as object ?? {}), ...p.data, requires_approval: p.data.requires_approval === 'on' };
  const { error } = await supabase.from('site_settings').update({ value }).eq('key', 'booking.rules');
  if (error) return { error: fail(error), values };
  refresh();
  return { done: 'Saved.' };
}

export async function saveRecipients(_: FormState, form: FormData): Promise<FormState> {
  const values = typed(form, 'recipients');
  if (!(await role('OWNER'))) return { error: 'Only the owner chooses who gets emails.', values };
  const list = String(form.get('recipients') ?? '').split(/[\s,;]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
  if (list.some(e => !z.email().safeParse(e).success)) return { error: 'One of the addresses isn’t a valid email.', values };
  const supabase = await supabaseServer();
  const { data: current } = await supabase.from('site_settings').select('value').eq('key', 'notifications.email').maybeSingle();
  const { error } = await supabase.from('site_settings').update({ value: { ...(current?.value as object ?? {}), staff_recipients: list } }).eq('key', 'notifications.email');
  if (error) return { error: fail(error), values };
  refresh();
  return { done: list.length ? 'Saved.' : 'Saved: new inquiries go to the owner and the managers.' };
}

/* the week's opening hours, all at once: for each day, up to two periods (e.g. 10:00–14:00 and 16:00–20:00) */
export async function saveHours(_: FormState, form: FormData): Promise<FormState> {
  if (!(await role('OWNER', 'MANAGER'))) return { error: 'Only a manager or the owner sets the opening hours.' };
  const rows: { weekday: number; opens_at: string; closes_at: string }[] = [];
  for (let d = 0; d < 7; d++) {
    for (const k of [1, 2]) {
      const o = String(form.get(`d${d}o${k}`) ?? ''), c = String(form.get(`d${d}c${k}`) ?? '');
      if (!o && !c) continue;
      if (!/^\d{2}:\d{2}$/.test(o) || !/^\d{2}:\d{2}$/.test(c)) return { error: 'Give each period both an opening and a closing time.' };
      if (c <= o) return { error: 'A period must close after it opens.' };
      rows.push({ weekday: d, opens_at: o, closes_at: c });
    }
  }
  const supabase = await supabaseServer();
  const { error: e1 } = await supabase.from('business_hours').delete().gte('weekday', 0);
  if (e1) return { error: fail(e1) };
  if (rows.length) {
    const { error } = await supabase.from('business_hours').insert(rows);
    if (error) return { error: /overlap|exclu/.test(error.message) ? 'Two periods on the same day overlap.' : fail(error) };
  }
  refresh();
  return { done: rows.length ? 'Saved. Visitors can now ask for a time within these hours.' : 'Saved: no opening hours, so visitors can’t choose a time.' };
}

export async function addClosure(_: FormState, form: FormData): Promise<FormState> {
  const values = typed(form, 'starts_at', 'ends_at', 'reason');
  if (!(await role('OWNER', 'MANAGER'))) return { error: 'Only a manager or the owner sets closures.', values };
  const s = fromShowroomInput(String(form.get('starts_at') ?? '')), e = fromShowroomInput(String(form.get('ends_at') ?? ''));
  if (!s || !e) return { error: 'Choose when the closure starts and ends.', values };
  if (e <= s) return { error: 'It must end after it starts.', values };
  const supabase = await supabaseServer();
  const { error } = await supabase.from('closures').insert({ starts_at: s, ends_at: e, reason: String(form.get('reason') ?? '').trim().slice(0, 200) || null });
  if (error) return { error: fail(error), values };
  refresh();
  return { done: 'Closure added.' };
}

export async function removeClosure(id: string): Promise<FormState> {
  if (!(await role('OWNER', 'MANAGER'))) return { error: 'Only a manager or the owner sets closures.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.from('closures').delete().eq('id', id);
  if (error) return { error: fail(error) };
  refresh();
  return { done: 'Removed.' };
}
