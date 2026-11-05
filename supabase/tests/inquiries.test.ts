/* Part 14: inquiries and viewing requests from the website, and the analytics summary. */
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createDb, one } from './db';

let db: PGlite;
beforeAll(async () => { db = await createDb(); });

const submit = (p: Record<string, unknown>, who: Parameters<typeof as>[1] = 'server') =>
  as(db, who, `select public.submit_inquiry($1::jsonb) as r`, [JSON.stringify(p)]);
/* the next Monday at 11:00 in Beirut, at least two days ahead */
const nextMonday11 = async () => (await one(db, `
  select ((date_trunc('week', (now() at time zone 'Asia/Beirut')::date + 9) + interval '11 hours') at time zone 'Asia/Beirut') as t`)).t as Date;

describe('an inquiry from the website', () => {
  it('creates the customer and their lead, matched to the car', async () => {
    const r = await submit({ name: 'Rami Khoury', phone: '+961 3 123 456', locale: 'ar', vehicle_slug: 'f8-tributo', car_text: 'Ferrari F8 Tributo', message: 'Is it still available?' });
    expect(r.err).toBeUndefined();
    const { customer_id, lead_id, appointment_id, vehicle_id } = r.rows[0].r;
    expect(appointment_id).toBeNull();
    expect(vehicle_id).toBe((await one(db, `select id from public.vehicles where slug = 'f8-tributo'`)).id);
    expect(await one(db, `select full_name, phone, preferred_locale from public.customers where id = $1`, [customer_id])).toEqual({ full_name: 'Rami Khoury', phone: '+9613123456', preferred_locale: 'ar' });
    expect(await one(db, `select source, status, locale, message from public.leads where id = $1`, [lead_id]))
      .toEqual({ source: 'website_form', status: 'new', locale: 'ar', message: 'Ferrari F8 Tributo\nIs it still available?' });
  });

  it('finds the same person again by phone, and fills in a missing email', async () => {
    const r = await submit({ name: 'Rami K.', phone: '+9613123456', email: 'Rami@Example.com' });
    const first = await one(db, `select id, email, full_name from public.customers where phone = '+9613123456'`);
    expect(r.rows[0].r.customer_id).toBe(first.id);
    expect(first).toMatchObject({ email: 'rami@example.com', full_name: 'Rami Khoury' });
    expect((await one(db, `select count(*)::int n from public.leads where customer_id = $1`, [first.id])).n).toBe(2);
  });

  it('refuses a missing name, no way to reach them, or a wrong phone', async () => {
    expect((await submit({ name: ' ', phone: '+9613123456' })).err).toMatch(/inquiry.name_required/);
    expect((await submit({ name: 'Nadia' })).err).toMatch(/inquiry.contact_required/);
    expect((await submit({ name: 'Nadia', phone: '03 123' })).err).toMatch(/inquiry.bad_phone/);
    expect((await submit({ name: 'Nadia', email: 'not-an-email' })).err).toMatch(/inquiry.bad_email/);
  });

  it('asks for a viewing only inside opening hours, and keeps nothing of a refused one', async () => {
    const leads = (await one(db, `select count(*)::int n from public.leads`)).n;
    const at = await nextMonday11();
    expect((await submit({ name: 'Nadia Saab', phone: '+96170111222', starts_at: at })).err).toMatch(/booking.outside_opening_hours/);
    expect((await one(db, `select count(*)::int n from public.leads`)).n).toBe(leads);
    expect((await one(db, `select count(*)::int n from public.customers where phone = '+96170111222'`)).n).toBe(0);
    await db.query(`insert into public.business_hours (weekday, opens_at, closes_at) values (1, '10:00', '19:00')`);
    const r = await submit({ name: 'Nadia Saab', phone: '+96170111222', starts_at: at, vehicle_slug: 'g63' });
    expect(r.err).toBeUndefined();
    const a = await one(db, `select status, ends_at - starts_at as len, vehicle_id is not null as car from public.appointments where id = $1`, [r.rows[0].r.appointment_id]);
    expect(a).toMatchObject({ status: 'requested', car: true });
    expect((await one(db, `select source from public.leads where id = $1`, [r.rows[0].r.lead_id])).source).toBe('private_viewing');
    // the same car at the same time is taken
    expect((await submit({ name: 'Other', phone: '+96170111333', starts_at: at, vehicle_slug: 'g63' })).err).toMatch(/booking.slot_full|appointments_one_viewing_per_car/);
  });

  it('is confirmed at once when the owner turned approval off', async () => {
    await db.query(`update public.site_settings set value = value || '{"requires_approval": false, "max_parallel": 3}' where key = 'booking.rules'`);
    const at = new Date((await nextMonday11()).getTime() + 2 * 3600_000);
    const r = await submit({ name: 'Joe', email: 'joe@example.com', starts_at: at });
    expect((await one(db, `select status from public.appointments where id = $1`, [r.rows[0].r.appointment_id])).status).toBe('confirmed');
  });

  it('is for the server only', async () => {
    expect((await submit({ name: 'X', phone: '+9613000000' }, 'anon')).err).toMatch(/permission denied/);
    expect((await submit({ name: 'X', phone: '+9613000000' }, 'owner')).err).toMatch(/permission denied/);
  });
});

describe('the analytics summary', () => {
  beforeAll(async () => {
    const v = (await one(db, `select id from public.vehicles where slug = 'f8-tributo'`)).id;
    const h = (c: string) => c.repeat(64);
    await as(db, 'server', `insert into public.analytics_events (type, path, visitor_hash, utm_source, device) values
      ('page_view', '/', '${h('a')}', 'instagram', 'mobile'), ('page_view', '/inventory', '${h('a')}', 'instagram', 'mobile'),
      ('page_view', '/', '${h('b')}', null, 'desktop'), ('whatsapp_click', '/car/f8-tributo', '${h('b')}', null, 'desktop')`);
    await as(db, 'server', `insert into public.analytics_events (type, path, visitor_hash, vehicle_id) values ('vehicle_view', '/car/f8-tributo', '${h('b')}', $1)`, [v]);
  });

  it('counts visitors, views, clicks and leads for the owner', async () => {
    const s = (await as(db, 'owner', `select public.analytics_summary(30) as s`)).rows[0].s;
    expect(s).toMatchObject({ visitors: 2, page_views: 3, vehicle_views: 1, whatsapp_clicks: 1, devices: { mobile: 1, desktop: 1 } });
    expect(s.top_cars[0]).toMatchObject({ slug: 'f8-tributo', views: 1 });
    expect(s.sources).toEqual(expect.arrayContaining([{ source: 'instagram', visitors: 1 }, { source: 'direct', visitors: 1 }]));
    expect(s.new_leads).toBeGreaterThanOrEqual(4);
    expect(s.lead_sources.website_form).toBeGreaterThanOrEqual(2);
  });

  it('shows a salesperson no visits, and visitors nothing', async () => {
    expect((await as(db, 'sales', `select public.analytics_summary(30) as s`)).rows[0].s).toMatchObject({ visitors: 0, page_views: 0 });
    expect((await as(db, 'anon', `select public.analytics_summary(30)`)).err).toMatch(/permission denied/);
  });
});
