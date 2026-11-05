import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { shortDateTime } from '@/lib/admin-format';
import { emailConnected } from '@/lib/email';
import { secretKey } from '@/lib/env.server';
import { requireStaff } from '@/lib/staff';
import { supabaseServer } from '@/lib/supabase/server';
import { BusinessForm, ClosureForm, HoursForm, RecipientsForm, RemoveClosure, RulesForm } from './forms';

export const metadata: Metadata = { title: 'Settings' };

/* what's connected, from the server's own settings: nothing claims to work until its keys are set, and what
   isn't built yet says so */
function connections(): { name: string; on: boolean; need?: string; later?: string }[] {
  const set = (k: string) => !!process.env[k]?.trim();
  return [
    { name: 'Saving inquiries, invitations, rate limits', on: !!secretKey(), need: 'SUPABASE_SECRET_KEY' },
    { name: 'Email to customers and staff (Resend)', on: emailConnected(), need: 'RESEND_API_KEY and EMAIL_FROM (an address on a domain verified in Resend)' },
    { name: 'Spam check on the website’s forms (Cloudflare Turnstile)', on: set('TURNSTILE_SECRET_KEY') && set('NEXT_PUBLIC_TURNSTILE_SITE_KEY'), need: 'NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY; until then a hidden trap field and the rate limit stop most spam' },
    { name: 'Visitor analytics', on: !!secretKey() && (process.env.ANALYTICS_SALT?.length ?? 0) >= 32, need: 'ANALYTICS_SALT (32+ random characters) and SUPABASE_SECRET_KEY' },
    { name: 'WhatsApp Business API (automatic messages)', on: false, later: 'Not part of the site yet. The WhatsApp buttons and links work without it.' },
    { name: 'Google Calendar (copy confirmed viewings)', on: false, later: 'Not part of the site yet. Viewings are in the dashboard’s diary.' },
    { name: 'Error tracking (Sentry)', on: false, later: 'Not part of the site yet. Server errors are in the hosting’s logs.' },
  ];
}

export default async function SettingsPage() {
  const me = await requireStaff();
  if (me.profile.role !== 'OWNER' && me.profile.role !== 'MANAGER') redirect('/admin');
  const owner = me.profile.role === 'OWNER';
  const supabase = await supabaseServer();
  const [settings, hours, closures] = await Promise.all([
    supabase.from('site_settings').select('key, value'),
    supabase.from('business_hours').select('weekday, opens_at, closes_at').order('weekday'),
    supabase.from('closures').select('id, starts_at, ends_at, reason').gte('ends_at', new Date().toISOString()).order('starts_at'),
  ]);
  const get = (k: string) => (settings.data?.find(s => s.key === k)?.value ?? {}) as Record<string, never>;
  const panel = 'mt-8 rounded-3xl bg-panel px-[clamp(20px,4vw,36px)] py-[clamp(22px,4vw,32px)] shadow-[inset_0_0_0_1px_var(--line)]';
  const h2 = 'mb-2 text-[clamp(24px,2.6vw,30px)]';
  return (
    <>
      <p className="label">The showroom</p>
      <h1 className="mt-3 text-[clamp(38px,6vw,64px)]">Settings</h1>
      {owner && <section className={panel} aria-labelledby="business"><h2 id="business" className={h2}>Your details</h2>
        <p className="mb-6 text-[15px] text-muted">Shown in the footer and on the contact page; empty ones aren’t shown.</p><BusinessForm b={get('business.profile')} /></section>}
      <section className={panel} aria-labelledby="hours"><h2 id="hours" className={h2}>Opening hours</h2>
        <p className="mb-6 text-[15px] text-muted">Showroom time (Beirut). Visitors can ask for a viewing only within them.</p><HoursForm hours={hours.data ?? []} /></section>
      <section className={panel} aria-labelledby="closures"><h2 id="closures" className={h2}>Closures</h2>
        <p className="mb-6 text-[15px] text-muted">Holidays and days off: no viewing can be booked then.</p>
        {(closures.data ?? []).length > 0 && <ul className="m-0 mb-6 list-none divide-y divide-line p-0">{closures.data!.map(c => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span>{shortDateTime(c.starts_at)} – {shortDateTime(c.ends_at)}{c.reason ? <span className="text-muted"> · {c.reason}</span> : null}</span><span><RemoveClosure id={c.id} /></span></li>))}</ul>}
        <ClosureForm /></section>
      {owner && <section className={panel} aria-labelledby="rules"><h2 id="rules" className={h2}>Booking rules</h2><div className="mt-6"><RulesForm r={get('booking.rules')} /></div></section>}
      {owner && <section className={panel} aria-labelledby="mail"><h2 id="mail" className={h2}>Emails</h2><div className="mt-6"><RecipientsForm list={(get('notifications.email') as { staff_recipients?: string[] }).staff_recipients ?? []} /></div></section>}
      {owner && <section className={panel} aria-labelledby="connections"><h2 id="connections" className={h2}>Connections</h2>
        <p className="mb-6 text-[15px] text-muted">Set in the hosting’s environment settings (README, .env.example). Each one says plainly whether it works.</p>
        <ul className="m-0 list-none divide-y divide-line p-0">{connections().map(c => (
          <li key={c.name} className="py-3"><p className="m-0 text-ink">{c.name} · <span className={c.on ? 'text-champagne-hi' : 'text-muted'}>{c.on ? 'Connected' : c.later ? 'Not built yet' : 'Not connected'}</span></p>
            {!c.on && <p className="m-0 mt-1 text-[13px] text-muted">{c.later ?? `Needs ${c.need}.`}</p>}</li>))}</ul></section>}
    </>
  );
}
