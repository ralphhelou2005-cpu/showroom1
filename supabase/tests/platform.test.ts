/* Settings, notifications, analytics and rate limits. */
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createDb, one, refused, U } from './db';

let db: PGlite;
beforeAll(async () => { db = await createDb(); });

describe('settings', () => {
  it('start with no invented contact details and every integration off', async () => {
    const profile = (await one(db, `select value from public.site_settings where key = 'business.profile'`)).value;
    expect(profile).toEqual({ name: 'Milcar', address: null, map_url: null, phone: null, whatsapp: null, email: null, instagram: null });
    for (const k of ['notifications.email', 'integrations.whatsapp_business', 'integrations.google_calendar'])
      expect((await one(db, `select value->>'enabled' e from public.site_settings where key = $1`, [k])).e, k).toBe('false');
  });

  it('are changed by the owner only, and audited', async () => {
    expect(refused(await as(db, 'manager', `update public.site_settings set value = value || '{"phone": "+9611000000"}' where key = 'business.profile'`))).toBe(true);
    expect((await as(db, 'owner', `update public.site_settings set value = value || '{"phone": "+9611000000"}' where key = 'business.profile'`)).n).toBe(1);
    const log = await one(db, `select actor_id, changed_fields from public.audit_logs where table_name = 'site_settings' order by occurred_at desc limit 1`);
    expect(log).toEqual({ actor_id: U.owner, changed_fields: ['value'] });
  });

  it('private settings stay private', async () => {
    expect((await as(db, 'anon', `select count(*)::int n from public.site_settings where key like 'integrations.%'`)).rows[0].n).toBe(0);
    expect((await as(db, 'nobody', `select count(*)::int n from public.site_settings where key like 'integrations.%'`)).rows[0].n).toBe(0);
    expect((await as(db, 'editor', `select count(*)::int n from public.site_settings where key like 'integrations.%'`)).rows[0].n).toBe(2);
  });
});

describe('notifications', () => {
  let mine: string;
  beforeAll(async () => {
    mine = (await as(db, 'server', `insert into public.notifications (channel, template, recipient_profile_id, payload)
                                     values ('in_app', 'lead.assigned', $1, '{"lead": "x"}') returning id`, [U.sales])).rows[0].id;
    await as(db, 'server', `insert into public.notifications (channel, template, recipient_profile_id) values ('in_app', 'lead.assigned', $1)`, [U.sales2]);
  });

  it('people see their own; managers all', async () => {
    expect((await as(db, 'sales', `select id from public.notifications`)).rows.map(r => r.id)).toEqual([mine]);
    expect((await as(db, 'manager', `select count(*)::int n from public.notifications`)).rows[0].n).toBe(2);
    expect((await as(db, 'anon', `select * from public.notifications`)).err).toMatch(/permission denied/);
  });

  it('people mark only their own as read, and cannot write any', async () => {
    const theirs = (await one(db, `select id from public.notifications where recipient_profile_id = $1`, [U.sales2])).id;
    expect((await as(db, 'sales', `select public.mark_notifications_read($1::uuid[]) n`, [[mine, theirs]])).rows[0].n).toBe(1);
    expect((await one(db, `select read_at from public.notifications where id = $1`, [theirs])).read_at).toBe(null);
    expect((await as(db, 'sales', `insert into public.notifications (channel, template, recipient_email) values ('email', 'x', 'a@b.co')`)).err).toMatch(/permission denied/);
    expect((await as(db, 'sales', `update public.notifications set status = 'sent'`)).err).toMatch(/permission denied/);
  });

  it('can never be marked sent without a sending time', async () => {
    expect((await as(db, 'server', `update public.notifications set status = 'sent' where id = $1`, [mine])).err).toMatch(/check/);
  });
});

describe('analytics', () => {
  it('are written by the server only and read by managers only', async () => {
    const hash = 'a'.repeat(64);
    expect((await as(db, 'anon', `insert into public.analytics_events (type, visitor_hash) values ('page_view', $1)`, [hash])).err).toMatch(/permission denied/);
    expect((await as(db, 'server', `insert into public.analytics_events (type, path, visitor_hash, device) values ('vehicle_view', '/car/f8-tributo', $1, 'mobile')`, [hash])).err).toBeUndefined();
    expect((await as(db, 'manager', `select count(*)::int n from public.analytics_events`)).rows[0].n).toBe(1);
    expect((await as(db, 'sales', `select count(*)::int n from public.analytics_events`)).rows[0].n).toBe(0);
  });

  it('accept only known events and no personal data shapes', async () => {
    expect((await as(db, 'server', `insert into public.analytics_events (type) values ('made_up')`)).err).toMatch(/check/);
    expect((await as(db, 'server', `insert into public.analytics_events (type, visitor_hash) values ('page_view', '203.0.113.9')`)).err).toMatch(/check/);
  });
});

describe('rate limits', () => {
  it('let the first requests through and stop the rest', async () => {
    const hit = async () => (await as(db, 'server', `select public.hit_rate_limit('inquiry:203.0.113.9', 600, 3) ok`)).rows[0].ok;
    expect([await hit(), await hit(), await hit(), await hit(), await hit()]).toEqual([true, true, true, false, false]);
    expect((await as(db, 'server', `select public.hit_rate_limit('inquiry:198.51.100.7', 600, 3) ok`)).rows[0].ok).toBe(true);
  });

  it('refuse nonsense windows', async () => {
    expect((await as(db, 'server', `select public.hit_rate_limit('x', 0, 3)`)).err).toMatch(/rate_limit.bad_arguments/);
  });
});
