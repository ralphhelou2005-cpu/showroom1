/* Customers, leads, notes and history: who sees which lead, and the history writing itself. */
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createDb, one, refused, U } from './db';

let db: PGlite;
let customer: string, lead: string, otherLead: string;
const history = async (id: string) =>
  (await db.query(`select type, actor_id, details from public.lead_activities where lead_id = $1 order by occurred_at, type`, [id])).rows as any[];

beforeAll(async () => {
  db = await createDb();
  // what the server does with a website inquiry (after its spam check): a customer and a lead, nobody assigned
  customer = (await as(db, 'server', `insert into public.customers (full_name, email, phone, preferred_locale)
    values ('Nadine Haddad', 'Nadine@Example.com', '+96171123456', 'fr') returning id`)).rows[0].id;
  lead = (await as(db, 'server', `insert into public.leads (customer_id, vehicle_id, source, locale, message)
    values ($1, (select id from public.vehicles where slug = 'f8-tributo'), 'website_form', 'fr', 'Disponible samedi ?') returning id`, [customer])).rows[0].id;
  const c2 = (await as(db, 'server', `insert into public.customers (full_name, phone) values ('Karim', '+9613111222') returning id`)).rows[0].id;
  otherLead = (await as(db, 'server', `insert into public.leads (customer_id, source, assigned_to) values ($1, 'whatsapp', $2) returning id`, [c2, U.sales2])).rows[0].id;
});

describe('a website inquiry', () => {
  it('starts its history by itself', async () => {
    const h = await history(lead);
    expect(h.map(x => x.type)).toEqual(['created']);
    expect(h[0].actor_id).toBe(null);
    expect(h[0].details).toEqual({ source: 'website_form', status: 'new' });
  });

  it('cannot be sent straight from a browser', async () => {
    expect((await as(db, 'anon', `insert into public.customers (full_name, phone) values ('Spam', '+9613000000')`)).err).toMatch(/permission denied/);
    expect((await as(db, 'anon', `insert into public.leads (customer_id, source) values ($1, 'website_form')`, [customer])).err).toMatch(/permission denied/);
  });

  it('lands on the same customer when they write again (email case does not matter)', async () => {
    const r = await as(db, 'server', `insert into public.customers (full_name, email) values ('Nadine H', 'nadine@example.com')`);
    expect(r.err).toMatch(/duplicate key/);
  });

  it('refuses badly written contact details', async () => {
    expect((await as(db, 'server', `insert into public.customers (full_name, phone) values ('X', '71 123 456')`)).err).toMatch(/check/);
    expect((await as(db, 'server', `insert into public.customers (full_name, email) values ('X', 'not-an-email')`)).err).toMatch(/check/);
    expect((await as(db, 'server', `insert into public.customers (full_name) values ('No way to reach')`)).err).toMatch(/check/);
  });
});

describe('salespeople', () => {
  it('see unassigned leads and their own, not a colleague’s', async () => {
    const mine = (await as(db, 'sales', `select id from public.leads`)).rows.map(r => r.id);
    expect(mine).toEqual([lead]);
    expect((await as(db, 'sales2', `select id from public.leads order by created_at`)).rows.map(r => r.id)).toEqual([lead, otherLead]);
  });

  it('pick up an unassigned lead, which a colleague then no longer sees', async () => {
    expect((await as(db, 'sales', `update public.leads set assigned_to = $1, status = 'contacted' where id = $2`, [U.sales, lead])).n).toBe(1);
    expect((await as(db, 'sales2', `select id from public.leads`)).rows.map(r => r.id)).toEqual([otherLead]);
    expect(refused(await as(db, 'sales2', `update public.leads set assigned_to = $1 where id = $2`, [U.sales2, lead]))).toBe(true);
    const h = await history(lead);   // one update: both entries share its time, listed in the type's own order
    expect(h.map(x => x.type)).toEqual(['created', 'status_changed', 'assigned']);
    expect(h[2]).toEqual({ type: 'assigned', actor_id: U.sales, details: { from: null, to: U.sales } });
  });

  it('cannot hand a lead to someone else, or drop it', async () => {
    expect((await as(db, 'sales', `update public.leads set assigned_to = $1 where id = $2`, [U.sales2, lead])).err).toMatch(/lead.assign_requires_manager/);
    expect(refused(await as(db, 'sales', `update public.leads set assigned_to = null where id = $1`, [lead]))).toBe(true);
    expect(refused(await as(db, 'sales', `delete from public.leads where id = $1`, [lead]))).toBe(true);
  });

  it('see the customers behind their leads, and nobody else', async () => {
    expect((await as(db, 'sales', `select full_name from public.customers`)).rows.map(r => r.full_name)).toEqual(['Nadine Haddad']);
    expect((await as(db, 'sales2', `select full_name from public.customers`)).rows.map(r => r.full_name)).toEqual(['Karim']);
    expect((await as(db, 'sales', `update public.customers set preferred_contact = 'whatsapp' where id = $1`, [customer])).n).toBe(1);
  });

  it('write notes signed with their own name, whatever they claim', async () => {
    const r = await as(db, 'sales', `insert into public.lead_notes (lead_id, author_id, body) values ($1, $2, 'Wants to see it Saturday.') returning author_id`, [lead, U.manager]);
    expect(r.rows[0].author_id).toBe(U.sales);
    expect((await as(db, 'sales2', `select count(*)::int n from public.lead_notes`)).rows[0].n).toBe(0);
    expect((await history(lead)).at(-1).type).toBe('note_added');
  });

  it('log their calls and messages, but not system events', async () => {
    expect((await as(db, 'sales', `insert into public.lead_activities (lead_id, type, details) values ($1, 'call', '{"minutes": 4}')`, [lead])).err).toBeUndefined();
    expect((await as(db, 'sales', `insert into public.lead_activities (lead_id, type) values ($1, 'status_changed')`, [lead])).err).toMatch(/activity.system_only/);
    expect(refused(await as(db, 'sales', `insert into public.lead_activities (lead_id, type) values ($1, 'call')`, [otherLead]))).toBe(true);
    expect(refused(await as(db, 'sales', `update public.lead_activities set details = '{}' where lead_id = $1`, [lead]))).toBe(true);
    expect(refused(await as(db, 'sales', `delete from public.lead_activities where lead_id = $1`, [lead]))).toBe(true);
  });

  it('set follow-ups and close a lead, with the dates kept for them', async () => {
    await as(db, 'sales', `update public.leads set next_follow_up_at = now() + interval '2 days' where id = $1`, [lead]);
    await as(db, 'sales', `update public.leads set status = 'won' where id = $1`, [lead]);
    expect((await one(db, `select closed_at from public.leads where id = $1`, [lead])).closed_at).not.toBe(null);
    await as(db, 'sales', `update public.leads set status = 'negotiating' where id = $1`, [lead]);
    expect((await one(db, `select closed_at from public.leads where id = $1`, [lead])).closed_at).toBe(null);
    expect((await history(lead)).map(x => x.type)).toContain('follow_up_set');
  });
});

describe('managers', () => {
  it('see every lead and customer, and assign leads', async () => {
    expect((await as(db, 'manager', `select count(*)::int n from public.leads`)).rows[0].n).toBe(2);
    expect((await as(db, 'manager', `select count(*)::int n from public.customers`)).rows[0].n).toBe(2);
    expect((await as(db, 'manager', `update public.leads set assigned_to = $1 where id = $2`, [U.sales2, lead])).n).toBe(1);
    expect((await as(db, 'sales', `select count(*)::int n from public.leads`)).rows[0].n).toBe(0);
    expect((await as(db, 'sales2', `select count(*)::int n from public.lead_notes`)).rows[0].n).toBe(1);   // the notes follow the lead
  });

  it('can edit or delete any note; salespeople only their own', async () => {
    const note = (await one(db, `select id from public.lead_notes limit 1`)).id;
    expect(refused(await as(db, 'sales2', `update public.lead_notes set body = 'changed' where id = $1`, [note]))).toBe(true);
    expect((await as(db, 'manager', `update public.lead_notes set body = 'Wants Saturday morning.' where id = $1`, [note])).n).toBe(1);
    expect((await one(db, `select author_id from public.lead_notes where id = $1`, [note])).author_id).toBe(U.sales);
  });
});

describe('inventory editors', () => {
  it('see no CRM data at all', async () => {
    for (const t of ['customers', 'leads', 'lead_notes', 'lead_activities'])
      expect((await as(db, 'editor', `select count(*)::int n from public.${t}`)).rows[0].n, t).toBe(0);
    expect(refused(await as(db, 'editor', `insert into public.customers (full_name, phone) values ('X', '+9613999999')`))).toBe(true);
  });
});

describe('customer consent', () => {
  it('is dated when given and cleared when withdrawn', async () => {
    await as(db, 'manager', `update public.customers set marketing_consent = true where id = $1`, [customer]);
    expect((await one(db, `select consent_at from public.customers where id = $1`, [customer])).consent_at).not.toBe(null);
    await as(db, 'manager', `update public.customers set marketing_consent = false where id = $1`, [customer]);
    expect((await one(db, `select consent_at from public.customers where id = $1`, [customer])).consent_at).toBe(null);
  });
});
