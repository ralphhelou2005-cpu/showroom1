/* Private viewings: opening hours, closures, notice, capacity, double bookings, approval and history.
   Times are written in the showroom's time zone (Asia/Beirut), on a Monday one to two weeks from today. */
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createDb, one, U } from './db';

let db: PGlite;
let monday: string, customer: string, lead: string, f8: string, svj: string, r8: string;
const at = (time: string, day = monday) => `('${day} ${time}'::timestamp at time zone 'Asia/Beirut')`;
const slots = async (from = monday, to = monday, who: 'anon' | 'sales' = 'anon') =>
  (await as(db, who, `select to_char(slot_start at time zone 'Asia/Beirut', 'Dy HH24:MI') s from public.available_slots($1::date, $2::date)`, [from, to])).rows.map(r => r.s);
const book = (who: 'server' | 'sales' | 'manager', start: string, end: string, extra: Record<string, string | null> = {}) => {
  const cols = ['customer_id', 'starts_at', 'ends_at', ...Object.keys(extra)];
  const vals = [`'${customer}'`, at(start), at(end), ...Object.values(extra).map(v => (v === null ? 'null' : `'${v}'`))];
  return as(db, who, `insert into public.appointments (${cols.join(', ')}) values (${vals.join(', ')}) returning id, status`);
};
const rules = (patch: object) => db.query(`update public.site_settings set value = value || $1::jsonb where key = 'booking.rules'`, [JSON.stringify(patch)]);

beforeAll(async () => {
  db = await createDb();
  monday = (await one(db, `select to_char(d, 'YYYY-MM-DD') d from (select (current_date + ((8 - extract(isodow from current_date)::int) % 7) + 7) d) x`)).d;
  customer = (await as(db, 'server', `insert into public.customers (full_name, phone) values ('Lea', '+96170000001') returning id`)).rows[0].id;
  lead = (await as(db, 'server', `insert into public.leads (customer_id, source, assigned_to) values ($1, 'private_viewing', $2) returning id`, [customer, U.sales])).rows[0].id;
  const id = async (slug: string) => (await one(db, `select id from public.vehicles where slug = $1`, [slug])).id;
  [f8, svj, r8] = [await id('f8-tributo'), await id('aventador-svj'), await id('r8-v10-plus')];
});

describe('before the owner enters opening hours', () => {
  it('nothing can be booked', async () => {
    expect(await slots()).toEqual([]);
    expect((await book('server', '11:00', '12:00')).err).toMatch(/booking.outside_opening_hours/);
  });
});

describe('opening hours', () => {
  it('are set by managers, not salespeople, and are public', async () => {
    expect((await as(db, 'sales', `insert into public.business_hours (weekday, opens_at, closes_at) values (1, '10:00', '19:00')`)).err).toMatch(/row-level security/);
    for (let d = 1; d <= 6; d++)
      expect((await as(db, 'manager', `insert into public.business_hours (weekday, opens_at, closes_at) values ($1, '10:00', '19:00')`, [d])).err).toBeUndefined();
    expect((await as(db, 'anon', `select count(*)::int n from public.business_hours`)).rows[0].n).toBe(6);
  });

  it('refuse two overlapping periods on one day', async () => {
    expect((await as(db, 'manager', `insert into public.business_hours (weekday, opens_at, closes_at) values (1, '18:00', '20:00')`)).err).toMatch(/conflicting key|exclusion/);
  });

  it('give hourly times from 10:00 to 18:00 in showroom time, none on Sunday', async () => {
    const s = await slots();
    expect(s).toHaveLength(9);
    expect(s[0]).toBe('Mon 10:00');
    expect(s.at(-1)).toBe('Mon 18:00');
    const sunday = (await one(db, `select to_char($1::date - 1, 'YYYY-MM-DD') d`, [monday])).d;
    expect(await slots(sunday, sunday)).toEqual([]);
  });

  it('refuse a viewing outside them', async () => {
    expect((await book('server', '09:00', '10:00')).err).toMatch(/booking.outside_opening_hours/);
    expect((await book('server', '18:30', '19:30')).err).toMatch(/booking.outside_opening_hours/);
  });
});

describe('booking', () => {
  let first: string;
  it('takes a free time, which is then no longer offered', async () => {
    const r = await book('server', '11:00', '12:00', { vehicle_id: f8, lead_id: lead });
    expect(r.err).toBeUndefined();
    expect(r.rows[0].status).toBe('requested');
    first = r.rows[0].id;
    expect(await slots()).not.toContain('Mon 11:00');
    expect(await slots()).toHaveLength(8);
  });

  it('never gives the same time twice when the showroom takes one viewing at a time', async () => {
    expect((await book('server', '11:30', '12:30', { vehicle_id: svj })).err).toMatch(/booking.slot_full/);
  });

  it('takes as many viewings at once as the owner allows, but never the same car twice', async () => {
    await rules({ max_parallel: 2 });
    expect((await book('server', '11:00', '12:00', { vehicle_id: svj })).err).toBeUndefined();
    expect((await book('server', '11:00', '12:00', { vehicle_id: r8 })).err).toMatch(/booking.slot_full/);
    await db.query(`delete from public.appointments where vehicle_id = $1`, [svj]);
    expect((await book('server', '11:00', '12:00', { vehicle_id: f8 })).err).toMatch(/appointments_one_viewing_per_car/);
  });

  it('never puts one salesperson in two viewings at once', async () => {
    expect((await book('manager', '11:30', '12:30', { vehicle_id: r8, assigned_to: U.sales })).err).toBeUndefined();
    await db.query(`delete from public.appointments where vehicle_id = $1`, [r8]);
    await db.query(`update public.appointments set assigned_to = $1 where id = $2`, [U.sales, first]);
    expect((await book('manager', '11:30', '12:30', { vehicle_id: r8, assigned_to: U.sales })).err).toMatch(/appointments_one_viewing_per_salesperson/);
    await rules({ max_parallel: 1 });
  });

  it('asks visitors for notice and limits how far ahead they book; staff may enter any time', async () => {
    await rules({ min_notice_hours: 24 * 30 });
    expect((await book('server', '15:00', '16:00')).err).toMatch(/booking.too_soon/);
    expect(await slots()).toEqual([]);
    await rules({ min_notice_hours: 24, max_days_ahead: 3 });
    expect((await book('server', '15:00', '16:00')).err).toMatch(/booking.too_far_ahead/);
    expect(await slots()).toEqual([]);
    const staff = await book('manager', '15:00', '16:00');
    expect(staff.err).toBeUndefined();
    await db.query(`delete from public.appointments where id = $1`, [staff.rows[0].id]);
    await rules({ max_days_ahead: 60 });
  });

  it('respects closures', async () => {
    expect((await as(db, 'manager', `insert into public.closures (starts_at, ends_at, reason) values (${at('14:00')}, ${at('16:00')}, 'Private event')`)).err).toBeUndefined();
    const s = await slots();
    expect(s).not.toContain('Mon 14:00');
    expect(s).not.toContain('Mon 15:00');
    expect(s).toContain('Mon 16:00');
    expect((await book('server', '14:30', '15:30')).err).toMatch(/booking.showroom_closed/);
    expect((await as(db, 'anon', `select * from public.closures`)).err).toMatch(/permission denied/);
  });

  it('refuses viewings longer than four hours or ending before they start', async () => {
    const tuesday = (await one(db, `select to_char($1::date + 1, 'YYYY-MM-DD') d`, [monday])).d;
    const staff = (start: string, end: string) => as(db, 'manager',
      `insert into public.appointments (customer_id, starts_at, ends_at) values ($1, ${at(start, tuesday)}, ${at(end, tuesday)})`, [customer]);
    expect((await staff('10:00', '14:30')).err).toMatch(/check/);
    expect((await staff('12:00', '11:00')).err).toMatch(/check/);
  });

  it('only a manager confirms; the confirmation is signed and in the lead history', async () => {
    expect((await as(db, 'sales', `update public.appointments set status = 'confirmed' where id = $1`, [first])).err).toMatch(/appointment.confirm_requires_manager/);
    expect((await as(db, 'manager', `update public.appointments set status = 'confirmed' where id = $1`, [first])).n).toBe(1);
    const a = await one(db, `select status, confirmed_by, confirmed_at from public.appointments where id = $1`, [first]);
    expect(a.status).toBe('confirmed');
    expect(a.confirmed_by).toBe(U.manager);
    const h = (await db.query(`select type from public.lead_activities where lead_id = $1 order by occurred_at, type`, [lead])).rows.map((r: any) => r.type);
    expect(h).toEqual(['created', 'assigned', 'appointment_requested', 'appointment_confirmed']);
  });

  it('a salesperson moving a confirmed viewing sends it back for approval', async () => {
    const r = await as(db, 'sales', `update public.appointments set starts_at = ${at('12:00')}, ends_at = ${at('13:00')} where id = $1 returning status`, [first]);
    expect(r.rows[0].status).toBe('rescheduled');
    expect(await slots()).toContain('Mon 11:00');
    expect(await slots()).not.toContain('Mon 12:00');
  });

  it('cancelling frees the time', async () => {
    expect((await as(db, 'sales', `update public.appointments set status = 'cancelled', cancelled_reason = 'Travelling' where id = $1`, [first])).n).toBe(1);
    expect(await slots()).toContain('Mon 12:00');
    const h = (await db.query(`select type from public.lead_activities where lead_id = $1 order by occurred_at, type`, [lead])).rows.map((r: any) => r.type);
    expect(h.slice(-2)).toEqual(['appointment_rescheduled', 'appointment_cancelled']);
  });
});

describe('privacy', () => {
  it('visitors see free times only, never bookings', async () => {
    expect((await as(db, 'anon', `select * from public.appointments`)).err).toMatch(/permission denied/);
    const cols = (await as(db, 'anon', `select * from public.available_slots($1::date, $1::date)`, [monday])).rows[0];
    expect(Object.keys(cols)).toEqual(['slot_start', 'slot_end']);
  });

  it('salespeople see their own viewings, managers all', async () => {
    expect((await as(db, 'sales', `select count(*)::int n from public.appointments`)).rows[0].n).toBe(1);
    expect((await as(db, 'sales2', `select count(*)::int n from public.appointments`)).rows[0].n).toBe(0);
    expect((await as(db, 'manager', `select count(*)::int n from public.appointments`)).rows[0].n).toBe(1);
  });

  it('refuses a search wider than two months', async () => {
    expect((await as(db, 'anon', `select * from public.available_slots(current_date, current_date + 90)`)).err).toMatch(/booking.bad_range/);
  });
});
