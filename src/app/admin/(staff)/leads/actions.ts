'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { fromShowroomInput } from '@/lib/admin-format';
import { emailCustomer } from '@/lib/email';
import { typed, type FormState } from '@/lib/form-state';
import { requireStaff, type Role } from '@/lib/staff';
import { supabaseServer } from '@/lib/supabase/server';
import type { TablesUpdate } from '@/types/database';

/* Customers, leads, notes, contact logs and viewings. Each action checks the person's role first; the database's
   rules decide again what they may see and change (a salesperson: their own and unassigned leads). */

const SALES: Role[] = ['OWNER', 'MANAGER', 'SALESPERSON'];
const MANAGERS: Role[] = ['OWNER', 'MANAGER'];
async function staff(roles = SALES) {
  const me = await requireStaff();
  return roles.includes(me.profile.role) ? me : null;
}
const refresh = () => revalidatePath('/admin', 'layout');
const ERRORS: Record<string, string> = {
  'booking.outside_opening_hours': 'That time is outside the opening hours (Settings).',
  'booking.showroom_closed': 'The showroom is closed then (Settings → closures).',
  'booking.slot_full': 'There are already as many viewings at that time as the showroom allows.',
  'appointment.confirm_requires_manager': 'Only a manager or the owner can confirm a viewing.',
};
function message(e: { message: string; code?: string }, fallback = 'That couldn’t be saved just now. Try again in a moment.') {
  if (ERRORS[e.message]) return ERRORS[e.message];
  if (/one_viewing_per_car/.test(e.message)) return 'This car already has a viewing at that time.';
  if (/one_viewing_per_salesperson/.test(e.message)) return 'That salesperson already has a viewing at that time.';
  if (/customers_phone_key/.test(e.message)) return 'Another customer already has this phone number.';
  if (/customers_email_key/.test(e.message)) return 'Another customer already has this email.';
  if (e.code === '42501' || /row-level security/.test(e.message)) return 'Your role can’t make this change.';
  if (e.code === '23514') return 'One of the values isn’t accepted. Check the phone (international form) and the email.';
  console.error('crm action failed:', e.code, e.message);
  return fallback;
}
const phone = z.string().trim().transform(s => s.replace(/[\s().-]/g, '')).pipe(z.string().regex(/^\+[1-9]\d{6,14}$/, 'Write the phone in international form, like +961 3 123 456.'));
const optPhone = z.union([z.literal(''), phone]);
const optEmail = z.union([z.literal(''), z.string().trim().toLowerCase().pipe(z.email('Write a valid email.'))]);
const optUuid = z.union([z.literal(''), z.uuid()]);
const SOURCES = ['website_form', 'private_viewing', 'whatsapp', 'phone', 'walk_in', 'instagram', 'facebook', 'referral', 'other'] as const;
const STATUSES = ['new', 'contacted', 'qualified', 'viewing_booked', 'negotiating', 'won', 'lost'] as const;

/* ------------------------------------------------------------ leads */

export async function createLead(_: FormState, form: FormData): Promise<FormState> {
  const me = await staff();
  const values = typed(form, 'customer_id', 'full_name', 'phone', 'email', 'source', 'vehicle_id', 'message', 'assigned_to');
  if (!me) return { error: 'Your role doesn’t work with leads.', values };
  const p = z.object({
    customer_id: optUuid, full_name: z.string().trim().max(120), phone: optPhone, email: optEmail,
    source: z.enum(SOURCES), vehicle_id: optUuid, message: z.string().trim().max(4000), assigned_to: optUuid,
  }).safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message, values };
  const d = p.data;
  const supabase = await supabaseServer();
  let customer = d.customer_id;
  if (!customer) {
    if (!d.full_name) return { error: 'Write the customer’s name, or choose an existing customer.', values };
    if (!d.phone && !d.email) return { error: 'Give a phone number or an email to reach them.', values };
    const { data, error } = await supabase.from('customers').insert({ full_name: d.full_name, phone: d.phone || null, email: d.email || null, preferred_contact: d.phone ? 'phone' : 'email' }).select('id').single();
    if (error) return { error: message(error), values };
    customer = data.id;
  }
  const assigned = MANAGERS.includes(me.profile.role) ? d.assigned_to || null : me.id;
  const { data, error } = await supabase.from('leads').insert({ customer_id: customer, source: d.source, vehicle_id: d.vehicle_id || null, message: d.message || null, assigned_to: assigned }).select('id').single();
  if (error) return { error: message(error), values };
  refresh();
  redirect(`/admin/leads/${data.id}`);
}

export async function updateLead(_: FormState, form: FormData): Promise<FormState> {
  const me = await staff();
  if (!me) return { error: 'Your role doesn’t work with leads.' };
  const p = z.object({
    id: z.uuid(), status: z.enum(STATUSES), vehicle_id: optUuid, next_follow_up_at: z.string(), lost_reason: z.string().trim().max(500),
    assigned_to: optUuid.optional(),
  }).safeParse(Object.fromEntries(form));
  if (!p.success) return { error: 'Something was missing. Refresh the page and try again.' };
  const d = p.data;
  const follow = d.next_follow_up_at ? fromShowroomInput(d.next_follow_up_at) : null;
  if (d.next_follow_up_at && !follow) return { error: 'Choose a follow-up date and time.' };
  const change: TablesUpdate<'leads'> = { status: d.status, vehicle_id: d.vehicle_id || null, next_follow_up_at: follow, lost_reason: d.status === 'lost' ? d.lost_reason || null : null };
  if (d.assigned_to !== undefined && MANAGERS.includes(me.profile.role)) change.assigned_to = d.assigned_to || null;
  const supabase = await supabaseServer();
  const { error, count } = await supabase.from('leads').update(change, { count: 'exact' }).eq('id', d.id);
  if (error) return { error: message(error) };
  if (!count) return { error: 'This lead isn’t yours to change.' };
  refresh();
  return { done: 'Saved.' };
}

export async function pickUpLead(id: string): Promise<FormState> {
  const me = await staff();
  if (!me) return { error: 'Your role doesn’t work with leads.' };
  const supabase = await supabaseServer();
  const { error, count } = await supabase.from('leads').update({ assigned_to: me.id }, { count: 'exact' }).eq('id', id).is('assigned_to', null);
  if (error) return { error: message(error) };
  if (!count) return { error: 'Someone already picked it up. Refresh the page.' };
  refresh();
  return { done: 'It’s yours.' };
}

export async function deleteLead(id: string): Promise<FormState> {
  if (!(await staff(MANAGERS))) return { error: 'Only a manager or the owner can delete a lead.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) return { error: message(error) };
  refresh();
  redirect('/admin/leads?deleted=1');
}

export async function addNote(_: FormState, form: FormData): Promise<FormState> {
  const me = await staff();
  if (!me) return { error: 'Your role doesn’t work with leads.' };
  const p = z.object({ lead_id: z.uuid(), body: z.string().trim().min(1, 'Write the note.').max(4000) }).safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message, values: typed(form, 'body') };
  const supabase = await supabaseServer();
  const { error } = await supabase.from('lead_notes').insert({ lead_id: p.data.lead_id, body: p.data.body, author_id: me.id });
  if (error) return { error: message(error), values: typed(form, 'body') };
  refresh();
  return { done: 'Note added.' };
}

export async function deleteNote(id: string): Promise<FormState> {
  if (!(await staff())) return { error: 'Your role doesn’t work with leads.' };
  const supabase = await supabaseServer();
  const { error, count } = await supabase.from('lead_notes').delete({ count: 'exact' }).eq('id', id);
  if (error) return { error: message(error) };
  if (!count) return { error: 'Only its author or a manager can delete a note.' };
  refresh();
  return { done: 'Note deleted.' };
}

export async function logContact(_: FormState, form: FormData): Promise<FormState> {
  if (!(await staff())) return { error: 'Your role doesn’t work with leads.' };
  const p = z.object({ lead_id: z.uuid(), type: z.enum(['call', 'whatsapp_message', 'email', 'meeting']), summary: z.string().trim().max(1000) }).safeParse(Object.fromEntries(form));
  if (!p.success) return { error: 'Choose what happened.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.from('lead_activities').insert({ lead_id: p.data.lead_id, type: p.data.type, details: p.data.summary ? { summary: p.data.summary } : {} });
  if (error) return { error: message(error) };
  const { data: lead } = await supabase.from('leads').select('status').eq('id', p.data.lead_id).maybeSingle();
  if (lead?.status === 'new') await supabase.from('leads').update({ status: 'contacted' }).eq('id', p.data.lead_id);
  refresh();
  return { done: 'Added to the history.' };
}

/* ------------------------------------------------------------ viewings */

export async function bookViewing(_: FormState, form: FormData): Promise<FormState> {
  const me = await staff();
  const values = typed(form, 'starts_at', 'minutes', 'assigned_to', 'internal_note');
  if (!me) return { error: 'Your role doesn’t book viewings.', values };
  const p = z.object({ lead_id: z.uuid(), starts_at: z.string(), minutes: z.coerce.number().int().min(15).max(240), assigned_to: optUuid, internal_note: z.string().trim().max(2000) })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return { error: 'Choose the day, the time and how long.', values };
  const starts = fromShowroomInput(p.data.starts_at);
  if (!starts) return { error: 'Choose the day and the time.', values };
  const supabase = await supabaseServer();
  const { data: lead } = await supabase.from('leads').select('customer_id, vehicle_id, customers ( email, full_name, preferred_locale )').eq('id', p.data.lead_id).maybeSingle();
  if (!lead) return { error: 'This lead isn’t yours to book.', values };
  const manager = MANAGERS.includes(me.profile.role);
  const { data, error } = await supabase.from('appointments').insert({
    customer_id: lead.customer_id, lead_id: p.data.lead_id, vehicle_id: lead.vehicle_id, starts_at: starts,
    ends_at: new Date(new Date(starts).getTime() + p.data.minutes * 60_000).toISOString(),
    status: manager ? 'confirmed' : 'requested', assigned_to: p.data.assigned_to || me.id, internal_note: p.data.internal_note || null,
  }).select('id').single();
  if (error) return { error: message(error), values };
  await supabase.from('leads').update({ status: 'viewing_booked' }).eq('id', p.data.lead_id).in('status', ['new', 'contacted', 'qualified']);
  if (manager && lead.customers) await emailCustomer('confirmed', { email: lead.customers.email, name: lead.customers.full_name, locale: lead.customers.preferred_locale }, starts, { leadId: p.data.lead_id, appointmentId: data.id });
  refresh();
  return { done: manager ? 'Viewing booked and confirmed.' : 'Viewing booked; a manager confirms it.' };
}

const VIEWING_STATUSES = ['confirmed', 'cancelled', 'completed', 'no_show'] as const;
export async function setViewing(_: FormState, form: FormData): Promise<FormState> {
  const me = await staff();
  if (!me) return { error: 'Your role doesn’t work with viewings.' };
  const p = z.object({ id: z.uuid(), status: z.enum(VIEWING_STATUSES).optional(), starts_at: z.string().optional(), assigned_to: optUuid.optional(), reason: z.string().trim().max(500).optional() })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return { error: 'Something was missing. Refresh the page and try again.' };
  const supabase = await supabaseServer();
  const { data: a } = await supabase.from('appointments').select('starts_at, ends_at, status, lead_id, customers ( email, full_name, preferred_locale )').eq('id', p.data.id).maybeSingle();
  if (!a) return { error: 'This viewing isn’t yours to change.' };
  const change: TablesUpdate<'appointments'> = {};
  let mail: 'confirmed' | 'moved' | 'cancelled' | null = null, at = a.starts_at;
  if (p.data.starts_at) {
    const s = fromShowroomInput(p.data.starts_at);
    if (!s) return { error: 'Choose the new day and time.' };
    change.starts_at = s;
    change.ends_at = new Date(new Date(s).getTime() + (new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime())).toISOString();
    change.status = a.status === 'confirmed' && MANAGERS.includes(me.profile.role) ? 'confirmed' : 'rescheduled';
    mail = change.status === 'confirmed' ? 'moved' : null; at = s;
  }
  if (p.data.status) {
    change.status = p.data.status;
    if (p.data.status === 'cancelled') { change.cancelled_reason = p.data.reason || null; mail = 'cancelled'; }
    if (p.data.status === 'confirmed') mail = 'confirmed';
  }
  if (p.data.assigned_to !== undefined && MANAGERS.includes(me.profile.role)) change.assigned_to = p.data.assigned_to || null;
  const { error, count } = await supabase.from('appointments').update(change, { count: 'exact' }).eq('id', p.data.id);
  if (error) return { error: message(error) };
  if (!count) return { error: 'This viewing isn’t yours to change.' };
  if (mail && a.customers) await emailCustomer(mail, { email: a.customers.email, name: a.customers.full_name, locale: a.customers.preferred_locale }, at, { leadId: a.lead_id, appointmentId: p.data.id });
  refresh();
  return { done: p.data.status === 'cancelled' ? 'Cancelled.' : p.data.status === 'confirmed' ? 'Confirmed.' : p.data.status ? 'Saved.' : 'Moved.' };
}

/* ------------------------------------------------------------ customers */

export async function updateCustomer(_: FormState, form: FormData): Promise<FormState> {
  const values = typed(form, 'full_name', 'phone', 'email', 'preferred_locale', 'preferred_contact');
  if (!(await staff())) return { error: 'Your role doesn’t work with customers.', values };
  const p = z.object({
    id: z.uuid(), full_name: z.string().trim().min(1, 'Write their name.').max(120), phone: optPhone, email: optEmail,
    preferred_locale: z.enum(['en', 'fr', 'ar']), preferred_contact: z.enum(['phone', 'whatsapp', 'email']), marketing_consent: z.string().optional(),
  }).safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message, values };
  if (!p.data.phone && !p.data.email) return { error: 'Keep a phone number or an email.', values };
  const supabase = await supabaseServer();
  const { data: before } = await supabase.from('customers').select('marketing_consent').eq('id', p.data.id).maybeSingle();
  const consent = p.data.marketing_consent === 'on';
  const { error, count } = await supabase.from('customers').update({
    full_name: p.data.full_name, phone: p.data.phone || null, email: p.data.email || null, preferred_locale: p.data.preferred_locale,
    preferred_contact: p.data.preferred_contact, marketing_consent: consent, ...(before && before.marketing_consent !== consent ? { consent_at: consent ? new Date().toISOString() : null } : {}),
  }, { count: 'exact' }).eq('id', p.data.id);
  if (error) return { error: message(error), values };
  if (!count) return { error: 'This customer isn’t yours to change.', values };
  refresh();
  return { done: 'Saved.' };
}

export async function deleteCustomer(id: string): Promise<FormState> {
  if (!(await staff(MANAGERS))) return { error: 'Only a manager or the owner can delete a customer.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) return { error: message(error) };
  refresh();
  redirect('/admin/customers?deleted=1');
}
