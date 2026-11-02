-- Milcar: the cars, the photo folder, and who is allowed to change them.
--
-- How to use: in Supabase open SQL Editor > New query, paste ALL of this file, then press Run.
-- It is safe to run again later: it never removes or overwrites cars you have added or changed.
-- Supabase may warn about a "destructive operation". That is the "drop policy if exists" lines,
-- which only replace this file's own rules. You can confirm.


-- ============================================================
-- 1. The cars
-- ============================================================

create table if not exists public.cars (
  id              text primary key
                  check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),     -- the car's web address name, e.g. f8-tributo
  make            text not null,
  model           text not null,
  type            text not null
                  check (type in ('Supercars', 'Sports cars', 'SUVs')),
  tagline         text,
  images          text[] not null default '{}',                -- first photo is the main one: a site path (assets/cars/f8.webp) or an uploaded photo's web address
  credit          text,                                        -- who took the photos
  specs           jsonb not null default '[]'
                  check (jsonb_typeof(specs) = 'array'),       -- factory specs in the order shown: [{"label": "Engine", "value": "3.9 L twin-turbo V8"}, ...]

  -- "This car": the exact car on the floor. Empty shows "On request".
  year            smallint check (year between 1900 and 2100),
  mileage_km      integer  check (mileage_km >= 0),
  color           text,
  previous_owners smallint check (previous_owners >= 0),
  service_records text,
  import_papers   text,

  price           integer  check (price > 0),                  -- in US dollars. Empty shows "Price on request".
  status          text not null default 'available'
                  check (status in ('available', 'reserved', 'sold')),
  sample          boolean not null default false,              -- shows the "Sample" tag
  sort_order      integer not null default 0,                  -- lower numbers come first
  created_at      timestamptz not null default now()
);


-- ============================================================
-- 2. Who may change the cars
-- ============================================================
-- Being logged in is not enough on its own: Supabase lets anyone make an account unless sign-ups are
-- switched off, so only the logins on this admin list can add, change or delete cars and photos.
-- The list lives outside the public part of the database, so nobody can read it from the website.

create schema if not exists private;

create table if not exists private.admins (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  email    text,
  added_at timestamptz not null default now()
);
alter table private.admins enable row level security;
revoke all on private.admins from public;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.admins where user_id = auth.uid());
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;

-- lets the admin page ask "is the person logged in on the admin list?" (they only learn about themselves)
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.is_admin();
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;


-- ============================================================
-- 3. Row Level Security on the cars
-- ============================================================
-- Visitors see every car that is not sold. Admins see all of them and are the only ones who can change them.

alter table public.cars enable row level security;

revoke all on public.cars from anon, authenticated;
grant select on public.cars to anon, authenticated;
grant insert, update, delete on public.cars to authenticated;

drop policy if exists "Anyone can see cars that are not sold" on public.cars;
create policy "Anyone can see cars that are not sold" on public.cars
  for select to anon, authenticated
  using (status <> 'sold' or (select private.is_admin()));

drop policy if exists "Admins can add cars" on public.cars;
create policy "Admins can add cars" on public.cars
  for insert to authenticated
  with check ((select private.is_admin()));

drop policy if exists "Admins can change cars" on public.cars;
create policy "Admins can change cars" on public.cars
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Admins can delete cars" on public.cars;
create policy "Admins can delete cars" on public.cars
  for delete to authenticated
  using ((select private.is_admin()));


-- ============================================================
-- 4. The photo folder
-- ============================================================
-- A public folder: anyone can view a photo by its web address (the website needs that),
-- but only admins can upload, replace or delete photos. Photos up to 10 MB.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('car-photos', 'car-photos', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "car-photos: admins can list" on storage.objects;
create policy "car-photos: admins can list" on storage.objects
  for select to authenticated
  using (bucket_id = 'car-photos' and (select private.is_admin()));

drop policy if exists "car-photos: admins can upload" on storage.objects;
create policy "car-photos: admins can upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'car-photos' and (select private.is_admin()));

drop policy if exists "car-photos: admins can replace" on storage.objects;
create policy "car-photos: admins can replace" on storage.objects
  for update to authenticated
  using (bucket_id = 'car-photos' and (select private.is_admin()))
  with check (bucket_id = 'car-photos' and (select private.is_admin()));

drop policy if exists "car-photos: admins can delete" on storage.objects;
create policy "car-photos: admins can delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'car-photos' and (select private.is_admin()));


-- ============================================================
-- 5. The six cars already on the site
-- ============================================================
-- Same details and photos as assets/inventory.js. Cars that are already in the table are left alone.

insert into public.cars (id, make, model, type, tagline, images, credit, specs, sample, sort_order) values
  ('aventador-svj', 'Lamborghini', 'Aventador SVJ', 'Supercars',
   'A V12 with nothing to prove.',
   array['assets/cars/svj.webp', 'assets/cars/int-lambo.webp'],
   'Wes Tindel, Viktor Theo',
   '[{"label": "Engine", "value": "6.5 L naturally aspirated V12"},
     {"label": "Power", "value": "770 CV at 8,500 rpm"},
     {"label": "Torque", "value": "720 Nm at 6,750 rpm"},
     {"label": "Gearbox", "value": "7-speed ISR"},
     {"label": "Drive", "value": "All-wheel drive"},
     {"label": "0 to 100 km/h", "value": "2.8 seconds"},
     {"label": "Top speed", "value": "350 km/h"}]',
   true, 10),

  ('huracan-evo', 'Lamborghini', 'Huracán EVO', 'Supercars',
   'Ten cylinders, four driven wheels.',
   array['assets/cars/huracan.webp', 'assets/cars/int-lambo.webp'],
   'Krish Parmar, Viktor Theo',
   '[{"label": "Engine", "value": "5.2 L naturally aspirated V10"},
     {"label": "Power", "value": "640 PS at 8,000 rpm"},
     {"label": "Torque", "value": "601 Nm at 6,500 rpm"},
     {"label": "Gearbox", "value": "7-speed dual-clutch"},
     {"label": "Drive", "value": "All-wheel drive"},
     {"label": "0 to 97 km/h", "value": "2.9 seconds"},
     {"label": "Top speed", "value": "325 km/h"}]',
   true, 20),

  ('f8-tributo', 'Ferrari', 'F8 Tributo', 'Supercars',
   'Twin turbos, driven from the rear.',
   array['assets/cars/f8.webp', 'assets/cars/int-ferrari.webp'],
   'Lance Asper, Franco Debartolo',
   '[{"label": "Engine", "value": "3.9 L twin-turbo V8"},
     {"label": "Power", "value": "720 PS at 8,000 rpm"},
     {"label": "Torque", "value": "770 Nm at 3,250 rpm"},
     {"label": "Gearbox", "value": "7-speed dual-clutch"},
     {"label": "Drive", "value": "Rear-wheel drive"},
     {"label": "0 to 100 km/h", "value": "2.9 seconds"},
     {"label": "Top speed", "value": "340 km/h"}]',
   true, 30),

  ('r8-v10-plus', 'Audi', 'R8 V10 Plus', 'Sports cars',
   'The everyday supercar.',
   array['assets/cars/r8.webp', 'assets/cars/r8-2.webp', 'assets/cars/int-audi.webp'],
   'Mihail Comanescu, Chris Carzoli',
   '[{"label": "Engine", "value": "5.2 L V10 FSI"},
     {"label": "Power", "value": "610 PS at 8,250 rpm"},
     {"label": "Torque", "value": "560 Nm at 6,500 rpm"},
     {"label": "Gearbox", "value": "7-speed S tronic"},
     {"label": "Drive", "value": "All-wheel drive"},
     {"label": "0 to 100 km/h", "value": "3.2 seconds"},
     {"label": "Top speed", "value": "330 km/h"}]',
   true, 40),

  ('g63', 'Mercedes-AMG', 'G 63', 'SUVs',
   'A square shape with serious power.',
   array['assets/cars/g63.webp', 'assets/cars/g63-2.webp'],
   'D Panyukov, Alexis AMZ DA CRUZ',
   '[{"label": "Engine", "value": "4.0 L twin-turbo V8"},
     {"label": "Power", "value": "585 hp"},
     {"label": "Torque", "value": "850 Nm"},
     {"label": "Gearbox", "value": "9-speed automatic"},
     {"label": "Drive", "value": "All-wheel drive"},
     {"label": "0 to 100 km/h", "value": "4.5 seconds"},
     {"label": "Top speed", "value": "220 km/h"}]',
   true, 50),

  ('range-rover-sport-svr', 'Range Rover', 'Sport SVR', 'SUVs',
   'Family space, supercharged.',
   array['assets/cars/rrs.webp', 'assets/cars/rrs-2.webp'],
   'Robin LE MEE, Brecht Denil',
   '[{"label": "Engine", "value": "5.0 L supercharged V8"},
     {"label": "Power", "value": "575 PS"},
     {"label": "Torque", "value": "700 Nm"},
     {"label": "Gearbox", "value": "8-speed automatic"},
     {"label": "Drive", "value": "All-wheel drive"},
     {"label": "0 to 100 km/h", "value": "4.5 seconds"},
     {"label": "Top speed", "value": "283 km/h"}]',
   true, 60)
on conflict (id) do nothing;


-- ============================================================
-- 6. Put your login on the admin list
-- ============================================================
-- First create your user: Authentication > Users > Add user > Create new user.
-- Then, here in the SQL Editor, change you@example.com below to that email and press Run again.
-- (Running it before the user exists does nothing, and that's fine.)

insert into private.admins (user_id, email)
select id, email from auth.users
where lower(email) = lower('you@example.com')
on conflict (user_id) do nothing;


-- What you should see under "Results": 6 cars, and your email on the admin list.
select
  (select count(*) from public.cars) as cars,
  coalesce((select string_agg(email, ', ') from private.admins), 'nobody yet: see part 6') as admin_list;
