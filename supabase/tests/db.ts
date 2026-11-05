/* A real Postgres (PGlite, in memory) dressed up like a Supabase project, for testing the migrations and
   every access rule without touching a live database. It recreates what Supabase provides before our SQL runs:
   the anon / authenticated / service_role roles, auth.users and auth.uid(), the storage tables, and
   Supabase's default grants (new public tables open to the API roles, so our SQL has to lock them itself). */
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SUPABASE = join(import.meta.dirname, '..');
export const MIGRATIONS = readdirSync(join(SUPABASE, 'migrations')).filter(f => f.endsWith('.sql')).sort();
export const migration = (name: string) => readFileSync(join(SUPABASE, 'migrations', MIGRATIONS.find(f => f.includes(name))!), 'utf8');
export const LEGACY_CARS: Record<string, any>[] = JSON.parse(readFileSync(join(SUPABASE, 'tests/fixtures/legacy-cars.json'), 'utf8'));

const STAND_IN = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

  create schema auth; grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (id uuid primary key, email text, raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}',
    encrypted_password varchar(255) default '', email_confirmed_at timestamptz, last_sign_in_at timestamptz, banned_until timestamptz,
    created_at timestamptz default now(), updated_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  create schema storage; grant usage on schema storage to anon, authenticated, service_role;
  create table storage.buckets (id text primary key, name text not null, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[], created_at timestamptz default now());
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text, owner uuid);
  alter table storage.objects enable row level security;
  grant all on storage.objects, storage.buckets to anon, authenticated, service_role;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant execute on function storage.foldername(text) to anon, authenticated, service_role;
`;

export const U = {
  owner:   '10000000-0000-4000-8000-000000000001',
  manager: '10000000-0000-4000-8000-000000000002',
  sales:   '10000000-0000-4000-8000-000000000003',
  sales2:  '10000000-0000-4000-8000-000000000004',
  editor:  '10000000-0000-4000-8000-000000000005',
  nobody:  '10000000-0000-4000-8000-000000000006',   // signed up on their own: no role
} as const;
export type Who = keyof typeof U | 'anon' | 'server';

/* legacy: start from today's live database (setup.sql, the 7 cars, the owner on the admin list).
   staff: add a manager, two salespeople, an inventory editor and a user without a role, the way invitations do. */
export async function createDb({ legacy = true, staff = true } = {}) {
  const db = await PGlite.create({ extensions: { btree_gist } });
  await db.exec(STAND_IN);
  if (legacy) {
    await db.exec(readFileSync(join(SUPABASE, 'setup.sql'), 'utf8'));
    await db.query(`delete from public.cars`);
    for (const c of LEGACY_CARS) {
      await db.query(
        `insert into public.cars (id, make, model, type, tagline, images, credit, specs, year, mileage_km, color, previous_owners,
           service_records, import_papers, price, status, sample, sort_order, created_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [c.id, c.make, c.model, c.type, c.tagline, c.images, c.credit, JSON.stringify(c.specs), c.year, c.mileage_km, c.color,
         c.previous_owners, c.service_records, c.import_papers, c.price, c.status, c.sample, c.sort_order, c.created_at]);
    }
    await db.query(`insert into auth.users (id, email) values ($1, 'owner@milcar.test')`, [U.owner]);
    await db.query(`insert into private.admins (user_id, email) values ($1, 'owner@milcar.test')`, [U.owner]);
  } else {
    await db.query(`insert into auth.users (id, email, raw_app_meta_data) values ($1, 'owner@milcar.test', '{"role": "OWNER"}')`, [U.owner]);
  }
  for (const f of MIGRATIONS) await db.exec(readFileSync(join(SUPABASE, 'migrations', f), 'utf8'));
  if (!legacy) await db.query(`update public.profiles set role = 'OWNER' where id = $1`, [U.owner]);
  if (staff) {
    for (const [who, role] of [['manager', 'MANAGER'], ['sales', 'SALESPERSON'], ['sales2', 'SALESPERSON'], ['editor', 'INVENTORY_EDITOR'], ['nobody', null]] as const) {
      await db.query(`insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values ($1, $2, $3, $4)`,
        [U[who], who + '@milcar.test', JSON.stringify(role ? { role } : {}), JSON.stringify({ full_name: who })]);
    }
  }
  return db;
}

export interface Result { rows: any[]; n: number; err?: string }

/* run SQL as a visitor, as a logged-in person, or as the server (service role) */
export async function as(db: PGlite, who: Who, sql: string, params: unknown[] = []): Promise<Result> {
  const role = who === 'anon' ? 'anon' : who === 'server' ? 'service_role' : 'authenticated';
  const sub = who === 'anon' || who === 'server' ? '' : U[who];
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub}', false);`);
  try {
    const r = await db.query(sql, params);
    return { rows: r.rows as any[], n: r.affectedRows ?? 0 };
  } catch (e) {
    return { rows: [], n: 0, err: (e as Error).message };
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}

/* true when the statement was refused: an error, or rules that let it touch no rows */
export const refused = (r: Result) => !!r.err || r.n === 0;
export const one = async (db: PGlite, sql: string, params: unknown[] = []) => (await db.query(sql, params)).rows[0] as any;
