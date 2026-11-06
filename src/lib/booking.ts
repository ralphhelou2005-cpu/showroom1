import 'server-only';
import { headers } from 'next/headers';
import { z } from 'zod';
import { emailStaffAboutInquiry } from './email';
import { secretKey } from './env.server';
import { clientIp, withinLimit } from './staff';
import { supabaseAdmin } from './supabase/admin';
import { supabasePublic } from './supabase/public';
import { visitorHash } from './visitor';

/* "Request my viewing", for both booking forms: the website's own (src/app/[locale]/booking-action.ts) and the
   current site's on GitHub Pages until the switch (src/app/api/booking). Checked here (a hidden trap field, the rate
   limits, the spam check once Turnstile is set), then saved in one step by the database (submit_inquiry: the
   customer, their lead, the requested time), and the team is emailed. Visitors never write to the database. */

export type BookingError = 'name' | 'phone' | 'taken' | 'closed' | 'busy' | 'offline' | 'failed';
export type BookingResult = { ok: true; at: string | null } | { ok?: false; error: BookingError };

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

/* `raw`: the form's fields as text (name, phone, car, slug, starts_at, at_label, locale, and the trap `company`) */
export async function submitBooking(raw: Record<string, unknown>, turnstileToken: string | null): Promise<BookingResult> {
  if (String(raw.company ?? '').trim()) return { ok: true, at: null };   // the trap: only robots fill it in
  const p = input.safeParse(raw);
  if (!p.success) return { error: p.error.issues.some(i => i.path[0] === 'name') ? 'name' : 'failed' };
  const d = p.data;
  if (!/^\+[1-9]\d{6,14}$/.test(d.phone)) return { error: 'phone' };
  if (!secretKey()) return { error: 'offline' };
  const ip = await clientIp();
  if (!(await withinLimit('booking:ip:' + ip, 3600, 6)) || !(await withinLimit('booking:phone:' + d.phone, 86400, 4))) return { error: 'busy' };
  if (!(await turnstileOk(turnstileToken, ip))) return { error: 'failed' };

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

/* The free viewing times of the next three weeks, for the forms' calendar: none until opening hours are set in the
   dashboard. `day` is the showroom's date (YYYY-MM-DD, Beirut), `label` the day as words, `time` the hour. */
export type Slot = { value: string; day: string; label: string; time: string };

export async function freeSlots(locale: 'en' | 'fr' | 'ar' = 'en'): Promise<{ today: string; slots: Slot[] }> {
  const now = new Date();
  const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Beirut' });
  const until = new Date(now.getTime() + 21 * 86400_000);
  const { data } = await supabasePublic().rpc('available_slots', { p_from: key.format(now), p_to: key.format(until) }).then(r => r, () => ({ data: null }));
  const tag = locale === 'ar' ? 'ar-LB-u-nu-latn' : locale === 'fr' ? 'fr-FR' : 'en-GB';
  const long = new Intl.DateTimeFormat(tag, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Beirut' });
  const hour = new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Beirut' });
  return {
    today: key.format(now),
    slots: (data ?? []).slice(0, 300).map(s => {
      const at = new Date(s.slot_start);
      return { value: s.slot_start, day: key.format(at), label: long.format(at), time: hour.format(at) };
    }),
  };
}
