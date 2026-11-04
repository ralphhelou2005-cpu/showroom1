/* The migrations run on today's live database without disturbing the current site, lock every table,
   and copy the 7 legacy cars faithfully. */
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createDb, LEGACY_CARS, migration, one, U } from './db';

let db: PGlite;
beforeAll(async () => { db = await createDb(); });

describe('on the live database', () => {
  it('leaves the legacy site exactly as it was', async () => {
    const cars = (await db.query(`select * from public.cars order by sort_order`)).rows as any[];
    expect(cars.map(c => c.id)).toEqual(LEGACY_CARS.map(c => c.id));
    for (const [i, c] of LEGACY_CARS.entries()) {
      expect(cars[i].make).toBe(c.make);
      expect(cars[i].images).toEqual(c.images);
      expect(cars[i].specs).toEqual(c.specs);
    }
    expect((await one(db, `select count(*)::int n from private.admins`)).n).toBe(1);
    expect((await one(db, `select count(*)::int n from storage.buckets where id = 'car-photos'`)).n).toBe(1);
    // visitors still read the legacy table the way the current site does
    const seen = await as(db, 'anon', `select id from public.cars where status <> 'sold'`);
    expect(seen.rows).toHaveLength(7);
  });

  it('turns the owner on the legacy admin list into OWNER', async () => {
    expect(await one(db, `select role, email from public.profiles where id = $1`, [U.owner])).toEqual({ role: 'OWNER', email: 'owner@milcar.test' });
  });

  it('gives invited staff their role, and a self-made account none', async () => {
    const rows = (await db.query(`select p.id, p.role, p.full_name from public.profiles p order by p.email`)).rows as any[];
    const role = (id: string) => { const r = rows.find(x => x.id === id); return r ? r.role : 'missing'; };
    expect(role(U.manager)).toBe('MANAGER');
    expect(role(U.sales)).toBe('SALESPERSON');
    expect(role(U.editor)).toBe('INVENTORY_EDITOR');
    expect(role(U.nobody)).toBe(null);
    expect(rows.find(r => r.id === U.sales).full_name).toBe('sales');
  });

  it('turns on row level security for every table the API can reach', async () => {
    const open = (await db.query(`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`)).rows;
    expect(open).toEqual([]);
  });

  it('gives visitors no access at all to staff data', async () => {
    for (const t of ['profiles', 'customers', 'leads', 'lead_notes', 'lead_activities', 'appointments', 'closures',
                     'notifications', 'audit_logs', 'analytics_events', 'vehicle_status_history']) {
      const r = await as(db, 'anon', `select * from public.${t} limit 1`);
      expect(r.err, t).toMatch(/permission denied/);
    }
    for (const t of ['vehicles', 'brands', 'customers', 'leads', 'appointments', 'site_settings', 'business_hours']) {
      const r = await as(db, 'anon', `delete from public.${t}`);
      expect(!!r.err || r.n === 0, t).toBe(true);
    }
  });

  it('keeps the rate-limit table out of the API entirely', async () => {
    for (const who of ['anon', 'nobody', 'owner'] as const) {
      expect((await as(db, who, `select * from private.rate_limits`)).err).toMatch(/permission denied/);
      expect((await as(db, who, `select public.hit_rate_limit('x', 60, 5)`)).err).toMatch(/permission denied/);
    }
  });
});

describe('copying the legacy cars', () => {
  it('copies all 7 cars with their addresses, as they are today', async () => {
    const v = (await db.query(`
      select v.*, b.name brand from public.vehicles v join public.brands b on b.id = v.brand_id order by v.sort_order`)).rows as any[];
    expect(v.map(x => x.slug)).toEqual(LEGACY_CARS.map(c => c.id));
    expect(v.map(x => x.legacy_id)).toEqual(LEGACY_CARS.map(c => c.id));
    for (const [i, c] of LEGACY_CARS.entries()) {
      expect(v[i].brand).toBe(c.make);
      expect(v[i].model).toBe(c.model);
      expect(v[i].status).toBe(c.status);
      expect(v[i].publication).toBe('published');
      expect(v[i].is_sample).toBe(c.sample);
      expect(v[i].photo_credit).toBe(c.credit);
      expect(v[i].price).toBe(null);
    }
    expect(v.map(x => x.body_type)).toEqual(['supercar', 'supercar', 'supercar', 'sports_car', 'suv', 'suv', 'supercar']);
  });

  it('makes one brand per make', async () => {
    const b = (await db.query(`select slug, name from public.brands order by sort_order`)).rows;
    expect(b).toEqual([
      { slug: 'lamborghini', name: 'Lamborghini' }, { slug: 'ferrari', name: 'Ferrari' }, { slug: 'audi', name: 'Audi' },
      { slug: 'mercedes-amg', name: 'Mercedes-AMG' }, { slug: 'range-rover', name: 'Range Rover' }, { slug: 'gt3-rs', name: 'GT3 RS' }]);
  });

  it('keeps the English text, photo order and spec order', async () => {
    for (const c of LEGACY_CARS) {
      const t = await one(db, `select t.* from public.vehicle_translations t join public.vehicles v on v.id = t.vehicle_id where v.slug = $1`, [c.id]);
      expect(t.locale).toBe('en');
      expect(t.tagline).toBe(c.tagline);
      const media = (await db.query(`select m.storage_bucket, m.storage_path from public.vehicle_media m join public.vehicles v on v.id = m.vehicle_id
                                      where v.slug = $1 order by m.sort_order`, [c.id])).rows as any[];
      expect(media.map(m => m.storage_path)).toEqual(c.images);
      expect(media.every(m => m.storage_bucket === null)).toBe(true);
      const specs = (await db.query(`select t.label, t.value from public.vehicle_features f join public.vehicles v on v.id = f.vehicle_id
                                      join public.vehicle_feature_translations t on t.feature_id = f.id and t.locale = 'en'
                                      where v.slug = $1 order by f.sort_order`, [c.id])).rows;
      expect(specs).toEqual(c.specs);
    }
  });

  it('copies nothing twice, and picks up a car added later', async () => {
    await db.exec(migration('copy_legacy_cars'));
    expect((await one(db, `select count(*)::int n from public.vehicles`)).n).toBe(7);
    await db.query(`insert into public.cars (id, make, model, type, images) values ('porsche-911-gt3', 'Porsche', '911 GT3', 'Sports cars',
                    array['https://example.supabase.co/storage/v1/object/public/car-photos/porsche-911-gt3/1.webp'])`);
    await db.exec(migration('copy_legacy_cars'));
    expect((await one(db, `select count(*)::int n from public.vehicles`)).n).toBe(8);
    expect(await one(db, `select m.storage_bucket, m.storage_path from public.vehicle_media m join public.vehicles v on v.id = m.vehicle_id where v.slug = 'porsche-911-gt3'`))
      .toEqual({ storage_bucket: 'car-photos', storage_path: 'porsche-911-gt3/1.webp' });
  });

  it('records each copied car in the status history', async () => {
    expect((await one(db, `select count(*)::int n from public.vehicle_status_history where from_status is null`)).n).toBe(8);
  });
});

describe('on a fresh project (staging)', () => {
  it('runs without the legacy tables', async () => {
    const fresh = await createDb({ legacy: false, staff: false });
    expect((await one(fresh, `select count(*)::int n from public.vehicles`)).n).toBe(0);
    expect((await one(fresh, `select role from public.profiles where id = $1`, [U.owner])).role).toBe('OWNER');
    expect(await one(fresh, `select to_regclass('public.cars') t`)).toEqual({ t: null });
  });
});
