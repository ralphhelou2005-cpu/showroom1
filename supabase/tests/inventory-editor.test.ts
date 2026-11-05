/* Part 13: saving, duplicating and reordering cars from the dashboard, for each role; the featured trio. */
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createDb, migration, one, refused } from './db';

let db: PGlite;
let ferrari: string;
beforeAll(async () => {
  db = await createDb();
  ferrari = (await one(db, `select id from public.brands where slug = 'ferrari'`)).id;
});

const roma = (extra: Record<string, unknown> = {}) => ({
  vehicle: { slug: 'ferrari-roma-2023', brand_id: ferrari, model: 'Roma', body_type: 'grand_tourer', model_year: 2023, mileage_km: 4200,
             exterior_color: 'Blu Pozzi', price: 245000, currency: 'USD', ...extra },
  translations: {
    en: { title: '', tagline: 'La nuova dolce vita', description: 'One owner, full Ferrari service history.' },
    fr: { tagline: '', description: '' },
    ar: { tagline: 'الحياة الحلوة الجديدة' },
  },
  specs: [
    { en: { label: 'Engine', value: '3.9 L twin-turbo V8' }, ar: { label: 'المحرك', value: 'V8 سعة 3.9 لتر' } },
    { en: { label: 'Power', value: '620 PS' } },
    { en: { label: '', value: 'no label: left out' } },
  ],
});
const save = (who: Parameters<typeof as>[1], p: unknown) => as(db, who, `select public.save_vehicle($1::jsonb) as id`, [JSON.stringify(p)]);

describe('saving a car', () => {
  let id: string;

  it('lets an inventory editor add a draft with its text and specs in one go', async () => {
    const r = await save('editor', roma());
    expect(r.err).toBeUndefined();
    id = r.rows[0].id;
    const v = await one(db, `select publication, status, is_featured, sort_order, created_by from public.vehicles where id = $1`, [id]);
    expect(v).toMatchObject({ publication: 'draft', status: 'available', is_featured: false });
    expect(v.sort_order).toBe((await one(db, `select max(sort_order) m from public.vehicles`)).m);
    const t = (await db.query<any>(`select locale, tagline from public.vehicle_translations where vehicle_id = $1 order by locale`, [id])).rows;
    expect(t).toEqual([{ locale: 'en', tagline: 'La nuova dolce vita' }, { locale: 'ar', tagline: 'الحياة الحلوة الجديدة' }]);   // French was empty: not kept
    const s = (await db.query<any>(`select f.sort_order, t.locale, t.label from public.vehicle_features f join public.vehicle_feature_translations t on t.feature_id = f.id
                                    where f.vehicle_id = $1 order by f.sort_order, t.locale`, [id])).rows;
    expect(s).toEqual([{ sort_order: 10, locale: 'en', label: 'Engine' }, { sort_order: 10, locale: 'ar', label: 'المحرك' }, { sort_order: 20, locale: 'en', label: 'Power' }]);
    expect((await one(db, `select count(*)::int n from public.vehicle_status_history where vehicle_id = $1`, [id])).n).toBe(1);
  });

  it('keeps the specs untouched when they did not change, and rewrites them when they did', async () => {
    const before = (await db.query<any>(`select id from public.vehicle_features where vehicle_id = $1 order by sort_order`, [id])).rows.map(r => r.id);
    expect((await save('editor', { id, ...roma() })).err).toBeUndefined();
    expect((await db.query<any>(`select id from public.vehicle_features where vehicle_id = $1 order by sort_order`, [id])).rows.map(r => r.id)).toEqual(before);
    const p = roma(); p.specs = [p.specs[1], p.specs[0]];
    expect((await save('editor', { id, ...p })).err).toBeUndefined();
    expect((await db.query<any>(`select t.label from public.vehicle_features f join public.vehicle_feature_translations t on t.feature_id = f.id and t.locale = 'en'
                                 where f.vehicle_id = $1 order by f.sort_order`, [id])).rows.map(r => r.label)).toEqual(['Power', 'Engine']);
  });

  it('removes a language once all its fields are empty', async () => {
    const p = roma(); p.translations.ar = { tagline: '  ' };
    await save('editor', { id, ...p });
    expect((await db.query<any>(`select locale from public.vehicle_translations where vehicle_id = $1`, [id])).rows.map(r => r.locale)).toEqual(['en']);
  });

  it('lets an editor publish, but not reserve or sell', async () => {
    expect((await save('editor', { id, ...roma({ publication: 'published' }) })).err).toBeUndefined();
    expect((await one(db, `select publication, published_at from public.vehicles where id = $1`, [id])).published_at).not.toBeNull();
    expect((await save('editor', { id, ...roma({ publication: 'published', status: 'reserved' }) })).err).toMatch(/vehicle.status_requires_manager/);
    expect((await save('editor', roma({ slug: 'roma-two', status: 'sold' }))).err).toMatch(/vehicle.status_requires_manager/);
  });

  it('lets a manager reserve, and records who did', async () => {
    expect((await save('manager', { id, ...roma({ publication: 'published', status: 'reserved' }) })).err).toBeUndefined();
    const h = await one(db, `select h.from_status, h.to_status, p.full_name from public.vehicle_status_history h join public.profiles p on p.id = h.changed_by
                             where h.vehicle_id = $1 order by h.changed_at desc, h.to_status desc limit 1`, [id]);
    expect(h).toMatchObject({ from_status: 'available', to_status: 'reserved', full_name: 'manager' });
  });

  it('refuses a salesperson, a login without a role and a visitor', async () => {
    expect(refused(await save('sales', roma({ slug: 'roma-sales' })))).toBe(true);
    expect(refused(await save('nobody', roma({ slug: 'roma-nobody' })))).toBe(true);
    expect((await save('anon', roma({ slug: 'roma-anon' }))).err).toMatch(/permission denied/);
    expect((await save('sales', { id, ...roma({ model: 'Changed' }) })).err).toMatch(/vehicle.not_found/);   // the rules hide it from updates
  });

  it('refuses an address already taken, and saves nothing of a failed car', async () => {
    const n = (await one(db, `select count(*)::int n from public.vehicle_translations`)).n;
    expect((await save('editor', roma())).err).toMatch(/duplicate key|unique/);
    expect((await one(db, `select count(*)::int n from public.vehicle_translations`)).n).toBe(n);
  });
});

describe('duplicating a car', () => {
  it('makes a draft copy with its text and specs, without photos or VIN', async () => {
    const src = await one(db, `select id from public.vehicles where slug = 'f8-tributo'`);
    await db.query(`update public.vehicles set vin = 'ZFF92LMA000000001' where id = $1`, [src.id]);
    const r = await as(db, 'editor', `select public.duplicate_vehicle($1) as id`, [src.id]);
    expect(r.err).toBeUndefined();
    const copy = await one(db, `select slug, publication, status, is_featured, vin from public.vehicles where id = $1`, [r.rows[0].id]);
    expect(copy).toEqual({ slug: 'f8-tributo-copy', publication: 'draft', status: 'available', is_featured: false, vin: null });
    const count = async (sql: string, vid: string) => (await one(db, sql, [vid])).n;
    const specs = `select count(*)::int n from public.vehicle_features f join public.vehicle_feature_translations t on t.feature_id = f.id where f.vehicle_id = $1`;
    expect(await count(specs, r.rows[0].id)).toBe(await count(specs, src.id));
    expect(await count(`select count(*)::int n from public.vehicle_media where vehicle_id = $1`, r.rows[0].id)).toBe(0);
    const again = await as(db, 'manager', `select public.duplicate_vehicle($1) as id`, [src.id]);
    expect((await one(db, `select slug from public.vehicles where id = $1`, [again.rows[0].id])).slug).toBe('f8-tributo-copy-2');
  });

  it('is refused to a salesperson', async () => {
    const src = await one(db, `select id from public.vehicles where slug = 'g63'`);
    expect(refused(await as(db, 'sales', `select public.duplicate_vehicle($1) as id`, [src.id]))).toBe(true);
  });
});

describe('ordering photos', () => {
  it('puts them in the new order, the first being the main picture', async () => {
    const v = await one(db, `select id from public.vehicles where slug = 'r8-v10-plus'`);
    const ids = (await db.query<any>(`select id from public.vehicle_media where vehicle_id = $1 order by sort_order`, [v.id])).rows.map(r => r.id);
    const turned = [...ids].reverse();
    expect((await as(db, 'editor', `select public.reorder_vehicle_media($1, $2::uuid[])`, [v.id, turned])).err).toBeUndefined();
    expect((await db.query<any>(`select id from public.vehicle_media where vehicle_id = $1 order by sort_order`, [v.id])).rows.map(r => r.id)).toEqual(turned);
    expect((await as(db, 'editor', `select public.reorder_vehicle_media($1, $2::uuid[])`, [v.id, turned.slice(1)])).err).toMatch(/media.order_mismatch/);
    await as(db, 'sales', `select public.reorder_vehicle_media($1, $2::uuid[])`, [v.id, ids]);
    expect((await db.query<any>(`select id from public.vehicle_media where vehicle_id = $1 order by sort_order`, [v.id])).rows.map(r => r.id)).toEqual(turned);
  });
});

describe('the featured cars', () => {
  it('start as the three the home page has always shown, with their pictures described', async () => {
    const f = (await db.query<any>(`select v.slug, v.featured_rank, m.alt from public.vehicles v
                                    join public.vehicle_media m on m.vehicle_id = v.id and m.sort_order = (select min(sort_order) from public.vehicle_media where vehicle_id = v.id)
                                    where v.is_featured order by v.featured_rank`)).rows;
    expect(f).toEqual([
      { slug: 'f8-tributo', featured_rank: 1, alt: { en: 'Red Ferrari F8 Tributo' } },
      { slug: 'huracan-evo', featured_rank: 2, alt: { en: 'Orange Lamborghini Huracán EVO' } },
      { slug: 'g63', featured_rank: 3, alt: { en: 'Black Mercedes-AMG G 63' } },
    ]);
  });

  it('make room: a car featured at a taken position takes it, and the others move down one', async () => {
    const r = await save('manager', roma({ slug: 'roma-featured', publication: 'published', is_featured: true, featured_rank: 1 }));
    expect(r.err).toBeUndefined();
    const ranks = async () => (await db.query<any>(`select slug, featured_rank from public.vehicles where is_featured order by featured_rank`)).rows;
    expect(await ranks()).toEqual([
      { slug: 'roma-featured', featured_rank: 1 }, { slug: 'f8-tributo', featured_rank: 2 }, { slug: 'huracan-evo', featured_rank: 3 }, { slug: 'g63', featured_rank: 4 },
    ]);
    await save('manager', { id: r.rows[0].id, ...roma({ slug: 'roma-featured', publication: 'published', is_featured: true, featured_rank: 1 }) });
    expect((await ranks()).map(x => x.featured_rank)).toEqual([1, 2, 3, 4]);   // saved again at the same place: nobody moves
    await db.query(`delete from public.vehicles where slug = 'roma-featured'`);
    await db.exec(`update public.vehicles set featured_rank = featured_rank - 1 where is_featured`);
  });

  it('are never reset by running the migration again', async () => {
    await db.exec(`update public.vehicles set is_featured = false, featured_rank = null; update public.vehicles set is_featured = true, featured_rank = 1 where slug = 'g63';`);
    await db.exec(migration('inventory_editor'));
    expect((await db.query<any>(`select slug from public.vehicles where is_featured`)).rows.map(r => r.slug)).toEqual(['g63']);
  });
});
