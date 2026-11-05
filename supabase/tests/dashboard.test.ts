/* Part 12: the team list and the overview the dashboard reads, for each role. */
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createDb, one, U } from './db';

let db: PGlite;
beforeAll(async () => {
  db = await createDb();
  // the owner and the manager have chosen passwords and signed in; the others are invitations not yet accepted
  await db.query(`update auth.users set encrypted_password = 'x', last_sign_in_at = now() where id in ($1, $2)`, [U.owner, U.manager]);
});

const team = async (who: Parameters<typeof as>[1]) => as(db, who, `select * from public.team_members()`);
const overview = async (who: Parameters<typeof as>[1]) => (await as(db, who, `select public.dashboard_overview() as o`)).rows[0]?.o;

describe('the team list', () => {
  it('shows staff everyone with a role, and whether they have joined', async () => {
    const r = await team('sales');
    expect(r.err).toBeUndefined();
    expect(r.rows.map(m => m.email).sort()).toEqual(['editor@milcar.test', 'manager@milcar.test', 'owner@milcar.test', 'sales2@milcar.test', 'sales@milcar.test']);
    const by = Object.fromEntries(r.rows.map(m => [m.email, m]));
    expect(by['owner@milcar.test'].joined).toBe(true);
    expect(by['manager@milcar.test'].last_sign_in_at).not.toBeNull();
    expect(by['sales2@milcar.test'].joined).toBe(false);
    expect(by['sales2@milcar.test'].last_sign_in_at).toBeNull();
    // the password itself never leaves the database
    expect(Object.keys(r.rows[0])).not.toContain('encrypted_password');
  });

  it('shows the owner logins without a role too, so they can give one', async () => {
    const r = await team('owner');
    expect(r.rows.find(m => m.email === 'nobody@milcar.test')).toMatchObject({ role: null, joined: false });
    expect(r.rows).toHaveLength(6);
  });

  it('lists active people first, then by role', async () => {
    await db.query(`update public.profiles set active = false where id = $1`, [U.sales2]);
    const r = await team('owner');
    expect(r.rows.at(-1).email).toBe('sales2@milcar.test');
    expect(r.rows[0].role).toBe('OWNER');
    await db.query(`update public.profiles set active = true where id = $1`, [U.sales2]);
  });

  it('shows nothing to a login without a role, a switched-off person or a visitor', async () => {
    expect((await team('nobody')).rows).toEqual([]);
    await db.query(`update public.profiles set active = false where id = $1`, [U.sales2]);
    expect((await team('sales2')).rows).toEqual([]);
    await db.query(`update public.profiles set active = true where id = $1`, [U.sales2]);
    expect((await team('anon')).err).toMatch(/permission denied/);
  });
});

describe('the overview', () => {
  beforeAll(async () => {
    // a customer with three leads: one new and unassigned, one the salesperson's with a follow-up due, one won
    const c = await one(db, `insert into public.customers (full_name, phone) values ('Rami Khoury', '+9613123456') returning id`);
    const car = await one(db, `select id from public.vehicles where slug = 'f8-tributo'`);
    await db.query(`insert into public.leads (customer_id, vehicle_id, source) values ($1, $2, 'website_form')`, [c.id, car.id]);
    await db.query(`insert into public.leads (customer_id, source, status, assigned_to, next_follow_up_at)
                    values ($1, 'whatsapp', 'contacted', $2, now() - interval '1 hour')`, [c.id, U.sales]);
    await db.query(`insert into public.leads (customer_id, source, status, assigned_to, closed_at)
                    values ($1, 'walk_in', 'won', $2, now() - interval '3 days')`, [c.id, U.sales2]);
    await db.query(`update public.vehicles set publication = 'draft' where slug = 'huracan-evo'`);
  });

  it('counts the inventory as the public site shows it', async () => {
    const o = await overview('owner');
    const v = await one(db, `select count(*) filter (where publication = 'published' and status = 'available')::int on_sale,
                                    count(*) filter (where publication = 'published' and status = 'reserved')::int reserved,
                                    count(*) filter (where status = 'sold')::int sold from public.vehicles`);
    expect(o.inventory).toMatchObject({ on_sale: v.on_sale, reserved: v.reserved, sold: v.sold, drafts: 1, archived: 0 });
    expect(o.inventory.samples).toBeGreaterThan(0);
  });

  it('counts every lead for the owner and the manager', async () => {
    for (const who of ['owner', 'manager'] as const) {
      expect((await overview(who)).leads).toMatchObject({ open: 2, new: 1, unassigned: 1, due: 1, won_30d: 1, mine: 0 });
    }
  });

  it("counts a salesperson's own and unassigned leads only", async () => {
    expect((await overview('sales')).leads).toMatchObject({ open: 2, new: 1, mine: 1, unassigned: 1, due: 1, won_30d: 0 });
    // the other salesperson's won lead is theirs alone
    expect((await overview('sales2')).leads).toMatchObject({ open: 1, mine: 0, won_30d: 1 });
  });

  it('shows an inventory editor no leads or viewings', async () => {
    const o = await overview('editor');
    expect(o.leads).toMatchObject({ open: 0, new: 0, due: 0 });
    expect(o.viewings).toEqual({ to_approve: 0, today: 0, next_7_days: 0 });
    expect(o.inventory.drafts).toBe(1);
  });

  it('counts the team by role', async () => {
    expect((await overview('sales')).team).toEqual({ active: 5, by_role: { OWNER: 1, MANAGER: 1, SALESPERSON: 2, INVENTORY_EDITOR: 1 } });
  });

  it('lists the latest inventory changes with who made them', async () => {
    await as(db, 'manager', `update public.vehicles set status = 'reserved' where slug = 'aventador-svj'`);
    const first = (await overview('owner')).recent[0];
    expect(first).toMatchObject({ vehicle: 'Lamborghini Aventador SVJ', slug: 'aventador-svj', from_status: 'available', to_status: 'reserved', changed_by: 'manager' });
    expect((await overview('owner')).recent.length).toBeLessThanOrEqual(8);
  });

  it('is closed to visitors and empty for a login without a role', async () => {
    expect((await as(db, 'anon', `select public.dashboard_overview()`)).err).toMatch(/permission denied/);
    const o = await overview('nobody');
    expect(o.inventory.drafts).toBe(0);
    expect(o.leads.open).toBe(0);
    expect(o.recent).toEqual([]);
  });
});
