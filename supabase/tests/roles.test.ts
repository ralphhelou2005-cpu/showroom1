/* Who may do what with the team, the inventory, the media bucket and the audit log. */
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createDb, one, refused, U } from './db';

let db: PGlite;
beforeAll(async () => { db = await createDb(); });

const newVehicle = (slug: string, extra = '') =>
  `insert into public.vehicles (slug, brand_id, model, body_type${extra ? ', ' + extra.split('=')[0] : ''})
   values ('${slug}', (select id from public.brands where slug = 'ferrari'), 'Roma', 'grand_tourer'${extra ? ", '" + extra.split('=')[1] + "'" : ''}) returning id`;

describe('visitors', () => {
  it('see published, unsold vehicles and nothing else', async () => {
    await db.exec(`update public.vehicles set status = 'sold' where slug = 'g63';
                   update public.vehicles set publication = 'draft' where slug = 'huracan-evo';
                   update public.vehicles set status = 'reserved' where slug = 'f8-tributo';`);
    const seen = (await as(db, 'anon', `select slug, status from public.vehicles order by sort_order`)).rows;
    expect(seen.map(r => r.slug)).toEqual(['aventador-svj', 'f8-tributo', 'r8-v10-plus', 'range-rover-sport-svr', 'gt3-rs-porsche']);
    expect(seen.find(r => r.slug === 'f8-tributo').status).toBe('reserved');
  });

  it("see a vehicle's text, photos and specs only when they can see the vehicle", async () => {
    const counts = async (slug: string) => (await as(db, 'anon', `
      select (select count(*) from public.vehicle_translations t join public.vehicles v on v.id = t.vehicle_id where v.slug = $1)::int t,
             (select count(*) from public.vehicle_media m join public.vehicles v on v.id = m.vehicle_id where v.slug = $1)::int m,
             (select count(*) from public.vehicle_feature_translations ft join public.vehicle_features f on f.id = ft.feature_id
                join public.vehicles v on v.id = f.vehicle_id where v.slug = $1)::int f`, [slug])).rows[0];
    expect(await counts('aventador-svj')).toEqual({ t: 1, m: 2, f: 7 });
    expect(await counts('g63')).toEqual({ t: 0, m: 0, f: 0 });          // sold
    expect(await counts('huracan-evo')).toEqual({ t: 0, m: 0, f: 0 });  // draft
    // and not even by guessing the ids
    const hidden = await one(db, `select id from public.vehicles where slug = 'g63'`);
    expect((await as(db, 'anon', `select * from public.vehicle_media where vehicle_id = $1`, [hidden.id])).rows).toEqual([]);
  });

  it('cannot change the inventory', async () => {
    expect(refused(await as(db, 'anon', `update public.vehicles set price = 1`))).toBe(true);
    expect(refused(await as(db, 'anon', newVehicle('roma-anon')))).toBe(true);
    expect(refused(await as(db, 'anon', `delete from public.vehicle_media`))).toBe(true);
    expect(refused(await as(db, 'anon', `insert into public.brands (slug, name) values ('x', 'X')`))).toBe(true);
  });

  it('read public settings and opening hours, not private ones', async () => {
    const keys = (await as(db, 'anon', `select key from public.site_settings order by key`)).rows.map(r => r.key);
    expect(keys).toEqual(['booking.rules', 'business.profile']);
  });
});

describe('a self-made account without a role', () => {
  it('sees exactly what a visitor sees, and only its own profile', async () => {
    expect((await as(db, 'nobody', `select count(*)::int n from public.vehicles`)).rows[0].n).toBe(5);
    expect((await as(db, 'nobody', `select id from public.profiles`)).rows.map(r => r.id)).toEqual([U.nobody]);
    expect((await as(db, 'nobody', `select count(*)::int n from public.leads`)).rows[0].n).toBe(0);
    expect(refused(await as(db, 'nobody', newVehicle('roma-nobody')))).toBe(true);
    expect((await as(db, 'nobody', `select public.my_role() r`)).rows[0].r).toBe(null);
  });

  it('cannot give itself a role', async () => {
    const r = await as(db, 'nobody', `update public.profiles set role = 'OWNER' where id = $1`, [U.nobody]);
    expect(r.err).toMatch(/profile.owner_only/);
  });
});

describe('inventory editors', () => {
  let id: string;
  it('add a vehicle as a draft, with text, photos and specs, and publish it', async () => {
    const r = await as(db, 'editor', newVehicle('ferrari-roma'));
    expect(r.err).toBeUndefined();
    id = r.rows[0].id;
    expect((await as(db, 'editor', `insert into public.vehicle_translations (vehicle_id, locale, tagline) values ($1, 'fr', 'Une GT élégante.')`, [id])).err).toBeUndefined();
    expect((await as(db, 'editor', `insert into public.vehicle_media (vehicle_id, kind, storage_bucket, storage_path, alt)
                                    values ($1, 'video', 'media', 'vehicles/x/walkaround.mp4', '{"en": "Walk-around", "ar": "جولة"}')`, [id])).err).toBeUndefined();
    const f = await as(db, 'editor', `insert into public.vehicle_features (vehicle_id) values ($1) returning id`, [id]);
    expect((await as(db, 'editor', `insert into public.vehicle_feature_translations (feature_id, locale, label, value) values ($1, 'en', 'Engine', '3.9 L V8')`, [f.rows[0].id])).err).toBeUndefined();
    const v = await one(db, `select publication, created_by, published_at from public.vehicles where id = $1`, [id]);
    expect(v).toEqual({ publication: 'draft', created_by: U.editor, published_at: null });
    expect((await as(db, 'anon', `select count(*)::int n from public.vehicles where id = $1`, [id])).rows[0].n).toBe(0);
    expect((await as(db, 'editor', `update public.vehicles set publication = 'published', is_featured = true where id = $1`, [id])).n).toBe(1);
    expect((await one(db, `select published_at from public.vehicles where id = $1`, [id])).published_at).not.toBe(null);
    expect((await as(db, 'anon', `select count(*)::int n from public.vehicles where id = $1`, [id])).rows[0].n).toBe(1);
  });

  it('cannot reserve, sell or delete', async () => {
    expect((await as(db, 'editor', `update public.vehicles set status = 'reserved' where id = $1`, [id])).err).toMatch(/vehicle.status_requires_manager/);
    expect((await as(db, 'editor', newVehicle('roma-sold', 'status=sold'))).err).toMatch(/vehicle.status_requires_manager/);
    expect(refused(await as(db, 'editor', `delete from public.vehicles where id = $1`, [id]))).toBe(true);
  });

  it('refuse bad data', async () => {
    expect((await as(db, 'editor', newVehicle('Bad Slug!'))).err).toMatch(/check/);
    expect((await as(db, 'editor', `update public.vehicles set price = -5 where id = $1`, [id])).err).toMatch(/check/);
    expect((await as(db, 'editor', `update public.vehicles set vin = 'not-a-vin' where id = $1`, [id])).err).toMatch(/check/);
    expect((await as(db, 'editor', `insert into public.vehicle_translations (vehicle_id, locale) values ($1, 'de')`, [id])).err).toMatch(/invalid input value for enum/);
    expect((await as(db, 'editor', `update public.vehicle_media set alt = '{"de": "x"}' where vehicle_id = $1`, [id])).err).toMatch(/check/);
    expect((await as(db, 'editor', `insert into public.vehicle_translations (vehicle_id, locale, tagline) values ($1, 'fr', 'twice')`, [id])).err).toMatch(/duplicate/);
  });

  it('see no customers, leads or appointments', async () => {
    for (const t of ['customers', 'leads', 'appointments', 'analytics_events', 'audit_logs'])
      expect((await as(db, 'editor', `select count(*)::int n from public.${t}`)).rows[0].n, t).toBe(0);
  });

  it('upload to the media bucket, in the vehicles and brands folders only', async () => {
    expect((await as(db, 'editor', `insert into storage.objects (bucket_id, name) values ('media', 'vehicles/${id}/1.webp')`)).err).toBeUndefined();
    expect((await as(db, 'editor', `insert into storage.objects (bucket_id, name) values ('media', 'other/1.webp')`)).err).toMatch(/row-level security/);
    expect((await as(db, 'editor', `insert into storage.objects (bucket_id, name) values ('car-photos', 'x/1.webp')`)).err).toMatch(/row-level security/);
    expect((await as(db, 'sales', `insert into storage.objects (bucket_id, name) values ('media', 'vehicles/${id}/2.webp')`)).err).toMatch(/row-level security/);
    expect((await as(db, 'anon', `insert into storage.objects (bucket_id, name) values ('media', 'vehicles/${id}/3.webp')`)).err).toMatch(/row-level security/);
  });
});

describe('salespeople', () => {
  it('see the whole inventory, drafts and sold cars included, but change nothing', async () => {
    expect((await as(db, 'sales', `select count(*)::int n from public.vehicles`)).rows[0].n).toBe(8);
    expect(refused(await as(db, 'sales', `update public.vehicles set price = 100000 where slug = 'aventador-svj'`))).toBe(true);
    expect(refused(await as(db, 'sales', newVehicle('roma-sales')))).toBe(true);
  });
});

describe('managers', () => {
  it('reserve, sell and delete, and every change is in the status history', async () => {
    expect((await as(db, 'manager', `update public.vehicles set status = 'reserved' where slug = 'ferrari-roma'`)).n).toBe(1);
    expect((await as(db, 'manager', `update public.vehicles set status = 'sold' where slug = 'ferrari-roma'`)).n).toBe(1);
    const h = (await as(db, 'manager', `select h.from_status, h.to_status, h.changed_by from public.vehicle_status_history h
                                          join public.vehicles v on v.id = h.vehicle_id where v.slug = 'ferrari-roma' order by h.changed_at, h.to_status`)).rows;
    expect(h.map(x => [x.from_status, x.to_status])).toEqual([[null, 'available'], ['available', 'available'], ['available', 'reserved'], ['reserved', 'sold']]);
    expect(h.at(-1).changed_by).toBe(U.manager);
    expect((await as(db, 'manager', `delete from public.vehicles where slug = 'ferrari-roma'`)).n).toBe(1);
  });

  it('cannot change roles, their own included', async () => {
    expect(refused(await as(db, 'manager', `update public.profiles set role = 'OWNER' where id = $1`, [U.sales]))).toBe(true);
    expect(refused(await as(db, 'manager', `update public.profiles set active = false where id = $1`, [U.sales]))).toBe(true);
    expect((await as(db, 'manager', `update public.profiles set role = 'OWNER' where id = $1`, [U.manager])).err).toMatch(/profile.owner_only/);
    expect(await one(db, `select role, active from public.profiles where id = $1`, [U.sales])).toEqual({ role: 'SALESPERSON', active: true });
  });

  it('cannot read the audit log or change settings', async () => {
    expect((await as(db, 'manager', `select count(*)::int n from public.audit_logs`)).rows[0].n).toBe(0);
    expect(refused(await as(db, 'manager', `update public.site_settings set value = '{}' where key = 'business.profile'`))).toBe(true);
  });
});

describe('the team', () => {
  it('everyone edits their own name, nobody else does except the owner', async () => {
    expect((await as(db, 'sales', `update public.profiles set full_name = 'Sami' where id = $1`, [U.sales])).n).toBe(1);
    expect(refused(await as(db, 'sales', `update public.profiles set full_name = 'X' where id = $1`, [U.sales2]))).toBe(true);
    expect((await as(db, 'owner', `update public.profiles set full_name = 'Rami' where id = $1`, [U.sales2])).n).toBe(1);
  });

  it('the owner gives and removes access', async () => {
    expect((await as(db, 'owner', `update public.profiles set role = 'SALESPERSON' where id = $1`, [U.nobody])).n).toBe(1);
    expect((await as(db, 'nobody', `select public.my_role() r`)).rows[0].r).toBe('SALESPERSON');
    expect((await as(db, 'owner', `update public.profiles set active = false where id = $1`, [U.nobody])).n).toBe(1);
    expect((await as(db, 'nobody', `select public.my_role() r`)).rows[0].r).toBe(null);
    expect((await as(db, 'nobody', `select count(*)::int n from public.vehicles`)).rows[0].n).toBe(5);   // back to visitor view
  });

  it('there is always one active owner', async () => {
    expect((await as(db, 'owner', `update public.profiles set role = 'MANAGER' where id = $1`, [U.owner])).err).toMatch(/profile.last_owner/);
    expect((await as(db, 'owner', `update public.profiles set active = false where id = $1`, [U.owner])).err).toMatch(/profile.last_owner/);
    expect((await as(db, 'server', `delete from public.profiles where id = $1`, [U.owner])).err).toMatch(/profile.last_owner/);
    expect((await as(db, 'owner', `update public.profiles set role = 'OWNER' where id = $1`, [U.manager])).n).toBe(1);
    expect((await as(db, 'owner', `update public.profiles set role = 'MANAGER' where id = $1`, [U.manager])).n).toBe(1);   // fine: two owners for a moment
  });
});

describe('the audit log', () => {
  it('records who changed what', async () => {
    const r = (await as(db, 'owner', `select actor_id, actor_role, action, changed_fields from public.audit_logs
                                       where table_name = 'profiles' and record_id = $1 and action = 'update' order by occurred_at`, [U.sales])).rows;
    expect(r[0]).toEqual({ actor_id: U.sales, actor_role: 'SALESPERSON', action: 'update', changed_fields: ['full_name'] });
  });

  it('cannot be edited or emptied, even by the owner', async () => {
    expect(refused(await as(db, 'owner', `update public.audit_logs set actor_id = null`))).toBe(true);
    expect(refused(await as(db, 'owner', `delete from public.audit_logs`))).toBe(true);
    expect(refused(await as(db, 'owner', `insert into public.audit_logs (action, table_name) values ('insert', 'x')`))).toBe(true);
  });
});
