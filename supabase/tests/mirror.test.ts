/* The mirror (part 11): whatever the owner changes in the current admin page (public.cars) shows up in the new
   tables, recorded as them. Here the owner acts exactly as the old admin page does: logged in, writing to public.cars. */
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createDb, LEGACY_CARS, one, U } from './db';

let db: PGlite;
const vehicle = (slug: string) => one(db, `select v.*, b.name brand from public.vehicles v join public.brands b on b.id = v.brand_id where v.slug = $1`, [slug]);
const media = async (slug: string) => (await db.query(`select m.id, m.storage_bucket, m.storage_path from public.vehicle_media m join public.vehicles v on v.id = m.vehicle_id where v.slug = $1 order by m.sort_order`, [slug])).rows as any[];
const specs = async (slug: string) => (await db.query(`select t.label, t.value from public.vehicle_features f join public.vehicles v on v.id = f.vehicle_id
  join public.vehicle_feature_translations t on t.feature_id = f.id and t.locale = 'en' where v.slug = $1 order by f.sort_order`, [slug])).rows;
const tagline = async (slug: string) => (await one(db, `select t.tagline from public.vehicle_translations t join public.vehicles v on v.id = t.vehicle_id where v.slug = $1 and t.locale = 'en'`, [slug]))?.tagline;

beforeAll(async () => { db = await createDb(); });

describe('changes made in the current admin page', () => {
  it('start in step: every car mirrored, nothing extra', async () => {
    expect((await one(db, `select count(*)::int n from public.vehicles`)).n).toBe(LEGACY_CARS.length);
    expect((await one(db, `select count(*)::int n from public.vehicles v where not exists (select 1 from public.cars c where c.id = v.legacy_id)`)).n).toBe(0);
  });

  it('reserving and selling show up, in the status history, as the owner', async () => {
    expect((await as(db, 'owner', `update public.cars set status = 'reserved' where id = 'range-rover-sport-svr'`)).n).toBe(1);
    expect((await as(db, 'owner', `update public.cars set status = 'sold' where id = 'gt3-rs-porsche'`)).n).toBe(1);
    expect((await vehicle('range-rover-sport-svr')).status).toBe('reserved');
    expect((await vehicle('gt3-rs-porsche')).status).toBe('sold');
    const h = (await db.query(`select h.from_status, h.to_status, h.changed_by from public.vehicle_status_history h join public.vehicles v on v.id = h.vehicle_id
                                where v.slug = 'gt3-rs-porsche' order by h.changed_at, h.to_status`)).rows.at(-1) as any;
    expect(h).toEqual({ from_status: 'available', to_status: 'sold', changed_by: U.owner });
    const audit = await one(db, `select actor_id, changed_fields from public.audit_logs where table_name = 'vehicles' and action = 'update' order by occurred_at desc limit 1`);
    expect(audit).toEqual({ actor_id: U.owner, changed_fields: ['status'] });
  });

  it('a sold car disappears from the new public pages too', async () => {
    const seen = (await as(db, 'anon', `select slug from public.vehicles`)).rows.map(r => r.slug);
    expect(seen).not.toContain('gt3-rs-porsche');
    expect(seen).toContain('range-rover-sport-svr');
  });

  it('price, year, mileage, colour, text and the sample flag follow', async () => {
    await as(db, 'owner', `update public.cars set price = 245000, year = 2019, mileage_km = 12400, color = 'Verde Mantis', sample = false,
                           tagline = 'Green, and quick about it.', service_records = 'Full dealer history' where id = 'aventador-svj'`);
    const v = await vehicle('aventador-svj');
    expect([+v.price, v.model_year, v.mileage_km, v.exterior_color, v.is_sample]).toEqual([245000, 2019, 12400, 'Verde Mantis', false]);
    expect(await tagline('aventador-svj')).toBe('Green, and quick about it.');
    expect((await one(db, `select t.service_records from public.vehicle_translations t join public.vehicles v on v.id = t.vehicle_id where v.slug = 'aventador-svj'`)).service_records).toBe('Full dealer history');
  });

  it('photos follow in their order, uploads included; an unrelated edit leaves them alone', async () => {
    const before = await media('f8-tributo');
    await as(db, 'owner', `update public.cars set credit = 'Lance Asper' where id = 'f8-tributo'`);
    expect((await media('f8-tributo')).map(m => m.id)).toEqual(before.map(m => m.id));
    await as(db, 'owner', `update public.cars set images = array['https://x.supabase.co/storage/v1/object/public/car-photos/f8-tributo/1.webp', 'assets/cars/f8.webp'] where id = 'f8-tributo'`);
    expect((await media('f8-tributo')).map(m => [m.storage_bucket, m.storage_path])).toEqual([['car-photos', 'f8-tributo/1.webp'], [null, 'assets/cars/f8.webp']]);
  });

  it('specs follow in their order; empty rows are left out', async () => {
    await as(db, 'owner', `update public.cars set specs = '[{"label": "Engine", "value": "3.9 L V8"}, {"label": "", "value": "x"}, {"label": "Power", "value": "720 PS"}]' where id = 'f8-tributo'`);
    expect(await specs('f8-tributo')).toEqual([{ label: 'Engine', value: '3.9 L V8' }, { label: 'Power', value: '720 PS' }]);
  });

  it('a new car arrives with its brand, and a changed make moves it to that brand', async () => {
    await as(db, 'owner', `insert into public.cars (id, make, model, type, images, specs, sort_order)
                           values ('porsche-911-gt3-rs', 'Porsche', '911 GT3 RS', 'Sports cars', array['assets/cars/r8.webp'], '[{"label": "Engine", "value": "4.0 L flat-six"}]', 80)`);
    const v = await vehicle('porsche-911-gt3-rs');
    expect([v.brand, v.model, v.body_type, v.publication, v.status]).toEqual(['Porsche', '911 GT3 RS', 'sports_car', 'published', 'available']);
    expect(await specs('porsche-911-gt3-rs')).toEqual([{ label: 'Engine', value: '4.0 L flat-six' }]);
    await as(db, 'owner', `update public.cars set make = 'Porsche AG' where id = 'porsche-911-gt3-rs'`);
    expect((await vehicle('porsche-911-gt3-rs')).brand).toBe('Porsche AG');
  });

  it('deleting a car removes it', async () => {
    expect((await as(db, 'owner', `delete from public.cars where id = 'porsche-911-gt3-rs'`)).n).toBe(1);
    expect(await vehicle('porsche-911-gt3-rs')).toBeUndefined();
  });

  it('people outside the admin list still cannot change anything, through either table', async () => {
    expect((await as(db, 'sales', `update public.cars set status = 'sold' where id = 'g63'`)).n).toBe(0);
    expect((await vehicle('g63')).status).toBe('available');
    expect((await as(db, 'anon', `select private.mirror_car(to_jsonb(c)) from public.cars c limit 1`)).err).toMatch(/permission denied/);
    expect((await as(db, 'owner', `select private.mirror_car('{"id": "x"}'::jsonb)`)).err).toMatch(/permission denied/);
  });

  it('can be switched off for the new admin (Phase 5)', async () => {
    await db.exec(`alter table public.cars disable trigger cars_mirror`);
    await as(db, 'owner', `update public.cars set status = 'reserved' where id = 'g63'`);
    expect((await vehicle('g63')).status).toBe('available');
  });
});
