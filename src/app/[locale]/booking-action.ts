'use server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { emailStaffAboutInquiry } from '@/lib/email';
import { typed } from '@/lib/form-state';
import { secretKey } from '@/lib/env.server';
import { clientIp, withinLimit } from '@/lib/staff';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { visitorHash } from '@/lib/visitor';

/* "Request my viewing": checked here (a hidden trap field, the rate limit, the spam check once Turnstile is set),
   then saved in one step by the database (submit_inquiry: the customer, their lead, the requested time), and the
   team is emailed. Visitors never write to the database themselves. */

export type BookingState = {
  ok?: boolean; error?: 'name' | 'phone' | 'taken' | 'closed' | 'busy' | 'offline' | 'failed'; at?: string | null;
  values?: Record<string, string>;   // what the visitor typed, handed back with an error (React empties the form)
} | null;

const input = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().transform(s => s.replace(/[\s().-]/g, '').replace(/^00/, '+')),
  car: z.string().trim().max(200).optional().default(''),
  slug: z.string().regex(/^[a-z0-9-]{1,100}$/).optional().or(z.literal('')).default(''),
  starts_at: z.string().max(40).optional().default(''),
  at_label: z.string().max(80).optional().default(''),
  locale: z.enum(['en', 'fr', 'ar']).default('en'),
});

async function turnstileOk(token: string | null, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()) return true;
  if (!token) return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: new URLSearchParams({ secret, response: token, remoteip: ip }), signal: AbortSignal.timeout(8000),
    });
    return (await r.json()).success === true;
  } catch { return false; }
}

export async function requestViewing(_: BookingState, form: FormData): Promise<BookingState> {
  const r = await handle(form);
  return r?.error ? { ...r, values: typed(form, 'name', 'phone', 'car', 'slug', 'starts_at', 'at_label') } : r;
}

async function handle(form: FormData): Promise<BookingState> {
  if (String(form.get('company') ?? '').trim()) return { ok: true, at: null };   // the trap: only robots fill it in
  const p = input.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues.some(i => i.path[0] === 'name') ? 'name' : 'failed' };
  const d = p.data;
  if (!/^\+[1-9]\d{6,14}$/.test(d.phone)) return { error: 'phone' };
  if (!secretKey()) return { error: 'offline' };
  const ip = await clientIp();
  if (!(await withinLimit('booking:ip:' + ip, 3600, 6)) || !(await withinLimit('booking:phone:' + d.phone, 86400, 4))) return { error: 'busy' };
  if (!(await turnstileOk(form.get('cf-turnstile-response') as string | null, ip))) return { error: 'failed' };

  const admin = supabaseAdmin();
  const { data, error } = await admin.rpc('submit_inquiry', { p: {
    name: d.name, phone: d.phone, locale: d.locale, vehicle_slug: d.slug || null, car_text: d.car || null, starts_at: d.starts_at || null,
    source_detail: 'website booking form',
  } });
  if (error || !data) {
    if (/booking\.(slot_full|too_soon)|one_viewing/.test(error?.message ?? '')) return { error: 'taken' };
    if (/booking\./.test(error?.message ?? '')) return { error: 'closed' };
    if (/inquiry\.bad_phone/.test(error?.message ?? '')) return { error: 'phone' };
    console.error('booking request failed:', error?.message);
    return { error: 'failed' };
  }
  const r = data as { lead_id: string; appointment_id: string | null; vehicle_id: string | null };

  const visitor = visitorHash(ip, (await headers()).get('user-agent') ?? '');
  const events = [{ type: 'inquiry', lead_id: r.lead_id, vehicle_id: r.vehicle_id, locale: d.locale, path: '/', visitor_hash: visitor }];
  if (r.appointment_id) events.push({ ...events[0], type: 'booking_requested' });
  await admin.from('analytics_events').insert(events);

  await emailStaffAboutInquiry({ name: d.name, phone: d.phone, email: null, car: d.car || null, at: d.starts_at || null, message: null, leadId: r.lead_id, appointmentId: r.appointment_id });
  return { ok: true, at: r.appointment_id ? d.at_label || null : null };
}
