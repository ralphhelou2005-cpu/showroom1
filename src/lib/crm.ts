import 'server-only';
import type { Enums } from '@/types/database';
import { supabaseServer } from './supabase/server';

/* What the dashboard's customers, leads and viewings pages read, as the signed-in person: a salesperson sees
   their own and unassigned leads and those leads' customers; managers and the owner see everything. */

export type LeadRow = Awaited<ReturnType<typeof listLeads>>[number];

const carName = (v: { model: string; variant: string | null; brands: { name: string } | null } | null) =>
  v ? `${v.brands?.name ?? ''} ${v.variant ? `${v.model} ${v.variant}` : v.model}`.trim() : null;

export async function listLeads() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('leads')
    .select(`id, status, source, assigned_to, next_follow_up_at, created_at, updated_at, closed_at, message,
      customers ( id, full_name, phone, email ), vehicles ( id, slug, model, variant, brands ( name ) )`)
    .order('created_at', { ascending: false });
  if (error) throw new Error('leads: ' + error.message);
  return data.map(l => ({ ...l, car: carName(l.vehicles) }));
}

export async function getLead(id: string) {
  const supabase = await supabaseServer();
  const { data: lead, error } = await supabase.from('leads')
    .select(`id, status, source, source_detail, assigned_to, next_follow_up_at, created_at, closed_at, lost_reason, message, locale, vehicle_id, customer_id,
      customers ( id, full_name, phone, email, preferred_locale, preferred_contact, marketing_consent ),
      vehicles ( id, slug, model, variant, brands ( name ) ),
      lead_notes ( id, body, author_id, created_at, updated_at ),
      lead_activities ( id, type, actor_id, details, occurred_at ),
      appointments ( id, starts_at, ends_at, status, assigned_to, customer_note, internal_note, cancelled_reason )`)
    .eq('id', id).maybeSingle();
  if (error) throw new Error('lead: ' + error.message);
  if (!lead) return null;
  return { ...lead, car: carName(lead.vehicles) };
}

export async function listCustomers() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('customers')
    .select('id, full_name, phone, email, preferred_locale, preferred_contact, marketing_consent, created_at, leads ( id, status, created_at )')
    .order('created_at', { ascending: false });
  if (error) throw new Error('customers: ' + error.message);
  return data;
}

export async function getCustomer(id: string) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('customers')
    .select(`id, full_name, phone, email, preferred_locale, preferred_contact, marketing_consent, consent_at, created_at,
      leads ( id, status, source, created_at, vehicles ( model, variant, brands ( name ) ) ),
      appointments ( id, starts_at, status )`)
    .eq('id', id).maybeSingle();
  if (error) throw new Error('customer: ' + error.message);
  return data;
}

export async function listViewings() {
  const supabase = await supabaseServer();
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { data, error } = await supabase.from('appointments')
    .select(`id, starts_at, ends_at, status, assigned_to, customer_note, internal_note, cancelled_reason, lead_id,
      customers ( id, full_name, phone, email ), vehicles ( slug, model, variant, brands ( name ) )`)
    .gte('starts_at', since).order('starts_at');
  if (error) throw new Error('viewings: ' + error.message);
  return data.map(a => ({ ...a, car: carName(a.vehicles) }));
}

/* the people a lead or a viewing can be given to */
export async function listSalesTeam() {
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc('team_members');
  return (data ?? []).filter(m => m.active && (m.role === 'OWNER' || m.role === 'MANAGER' || m.role === 'SALESPERSON'))
    .map(m => ({ id: m.id, name: m.full_name.trim() || m.email, role: m.role as Enums<'app_role'> }));
}

export async function listCarOptions() {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('vehicles').select('id, model, variant, status, publication, brands ( name )').order('sort_order');
  return (data ?? []).map(v => ({ id: v.id, name: carName(v)!, status: v.status, publication: v.publication }));
}

/* a CSV cell: quoted when needed, and never read as a formula by a spreadsheet */
export function csv(rows: (string | number | boolean | null | undefined)[][]) {
  const cell = (v: unknown) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
