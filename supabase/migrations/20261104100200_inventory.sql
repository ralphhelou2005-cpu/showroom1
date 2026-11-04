-- Milcar platform, part 3 of 9: brands and vehicles, with their translations, photos and videos, specs,
-- and the history of every status change.
--
-- Visitors see brands that are published, and vehicles that are published and not sold.
-- Inventory editors, managers and the owner write the listings; only managers and the owner reserve,
-- sell or delete a vehicle. Salespeople see everything, drafts and sold cars included, but change nothing here.

create table public.brands (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (private.is_slug(slug)),
  name         text not null check (char_length(name) between 1 and 80),
  description  jsonb not null default '{}' check (private.is_i18n_text(description)),
  logo_path    text check (char_length(logo_path) <= 400),          -- in the media bucket
  is_published boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index brands_order_idx on public.brands (sort_order, name);
create trigger brands_updated_at before update on public.brands for each row execute function private.set_updated_at();

create table public.vehicles (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (private.is_slug(slug)),   -- the address: /car/f8-tributo
  brand_id        uuid not null references public.brands (id) on delete restrict,
  model           text not null check (char_length(model) between 1 and 120),
  variant         text check (char_length(variant) <= 120),
  body_type       public.body_type not null,
  model_year      smallint check (model_year between 1900 and 2100),
  mileage_km      integer check (mileage_km >= 0),
  exterior_color  text check (char_length(exterior_color) <= 80),
  interior_color  text check (char_length(interior_color) <= 80),
  previous_owners smallint check (previous_owners >= 0),
  vin             text check (vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  price           numeric(12, 2) check (price > 0),                    -- empty: "Price on request"
  currency        char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  status          public.vehicle_status not null default 'available',
  publication     public.publication_status not null default 'draft',
  published_at    timestamptz,
  is_featured     boolean not null default false,
  featured_rank   smallint check (featured_rank >= 0),
  is_sample       boolean not null default false,                      -- a sample listing with stock photos
  photo_credit    text check (char_length(photo_credit) <= 200),
  sort_order      integer not null default 0,
  legacy_id       text unique,                                         -- its id in the legacy public.cars table
  created_by      uuid references public.profiles (id) on delete set null,
  updated_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index vehicles_public_idx on public.vehicles (publication, status, sort_order, created_at);
create index vehicles_brand_idx on public.vehicles (brand_id);
create index vehicles_featured_idx on public.vehicles (featured_rank) where is_featured;
create index vehicles_body_idx on public.vehicles (body_type);
create trigger vehicles_updated_at before update on public.vehicles for each row execute function private.set_updated_at();

create table public.vehicle_translations (
  id              uuid primary key default gen_random_uuid(),
  vehicle_id      uuid not null references public.vehicles (id) on delete cascade,
  locale          public.locale not null,
  title           text check (char_length(title) <= 160),             -- empty: brand and model
  tagline         text check (char_length(tagline) <= 160),
  description     text check (char_length(description) <= 10000),
  service_records text check (char_length(service_records) <= 2000),
  import_papers   text check (char_length(import_papers) <= 2000),
  seo_title       text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),
  updated_at      timestamptz not null default now(),
  unique (vehicle_id, locale)
);
create trigger vehicle_translations_updated_at before update on public.vehicle_translations for each row execute function private.set_updated_at();

create table public.vehicle_media (
  id               uuid primary key default gen_random_uuid(),
  vehicle_id       uuid not null references public.vehicles (id) on delete cascade,
  kind             public.media_kind not null,
  storage_bucket   text check (char_length(storage_bucket) <= 63),   -- empty: a picture that ships with the website
  storage_path     text not null check (char_length(storage_path) between 1 and 400),
  poster_path      text check (char_length(poster_path) <= 400),     -- videos: the still shown before playing
  width            integer check (width > 0),
  height           integer check (height > 0),
  duration_seconds numeric(7, 2) check (duration_seconds > 0),
  alt              jsonb not null default '{}' check (private.is_i18n_text(alt)),
  sort_order       integer not null default 0,                       -- the first one is the main picture
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  unique nulls not distinct (vehicle_id, storage_bucket, storage_path)
);
create index vehicle_media_order_idx on public.vehicle_media (vehicle_id, sort_order);

create table public.vehicle_features (
  id         uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  group_key  text not null default 'specs' check (group_key in ('specs', 'equipment', 'history')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index vehicle_features_order_idx on public.vehicle_features (vehicle_id, group_key, sort_order);

create table public.vehicle_feature_translations (
  id         uuid primary key default gen_random_uuid(),
  feature_id uuid not null references public.vehicle_features (id) on delete cascade,
  locale     public.locale not null,
  label      text not null check (char_length(label) between 1 and 80),    -- "Engine"
  value      text not null check (char_length(value) between 1 and 200),   -- "3.9 L twin-turbo V8"
  unique (feature_id, locale)
);

create table public.vehicle_status_history (
  id               uuid primary key default gen_random_uuid(),
  vehicle_id       uuid not null references public.vehicles (id) on delete cascade,
  from_status      public.vehicle_status,
  to_status        public.vehicle_status not null,
  from_publication public.publication_status,
  to_publication   public.publication_status not null,
  changed_by       uuid references public.profiles (id) on delete set null,
  changed_at       timestamptz not null default now()
);
create index vehicle_status_history_idx on public.vehicle_status_history (vehicle_id, changed_at desc);


-- ============================================================
-- Guards and history
-- ============================================================

create or replace function private.guard_vehicle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    -- reserving and selling is a sales decision: managers and the owner only
    if ((tg_op = 'INSERT' and new.status <> 'available') or (tg_op = 'UPDATE' and new.status <> old.status))
       and not private.has_role('OWNER', 'MANAGER') then
      raise exception using errcode = 'P0001', message = 'vehicle.status_requires_manager';
    end if;
    new.updated_by := (select auth.uid());
    if tg_op = 'INSERT' then new.created_by := (select auth.uid()); end if;
  end if;
  if new.publication = 'published' and new.published_at is null then new.published_at := now(); end if;
  return new;
end;
$$;
create trigger vehicles_10_guard before insert or update on public.vehicles for each row execute function private.guard_vehicle();

create or replace function private.record_vehicle_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status <> old.status or new.publication <> old.publication then
    insert into public.vehicle_status_history (vehicle_id, from_status, to_status, from_publication, to_publication, changed_by)
    values (new.id,
            case when tg_op = 'UPDATE' then old.status end, new.status,
            case when tg_op = 'UPDATE' then old.publication end, new.publication,
            (select auth.uid()));
  end if;
  return null;
end;
$$;
create trigger vehicles_status_history after insert or update of status, publication on public.vehicles
  for each row execute function private.record_vehicle_status();

create trigger brands_audit after insert or update or delete on public.brands for each row execute function private.audit();
create trigger vehicles_audit after insert or update or delete on public.vehicles for each row execute function private.audit();
create trigger vehicle_translations_audit after insert or update or delete on public.vehicle_translations for each row execute function private.audit();
create trigger vehicle_media_audit after insert or update or delete on public.vehicle_media for each row execute function private.audit();
create trigger vehicle_features_audit after insert or update or delete on public.vehicle_features for each row execute function private.audit();
create trigger vehicle_feature_translations_audit after insert or update or delete on public.vehicle_feature_translations for each row execute function private.audit();


-- ============================================================
-- Who may see and change the inventory
-- ============================================================

alter table public.brands enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_translations enable row level security;
alter table public.vehicle_media enable row level security;
alter table public.vehicle_features enable row level security;
alter table public.vehicle_feature_translations enable row level security;
alter table public.vehicle_status_history enable row level security;

revoke all on public.brands, public.vehicles, public.vehicle_translations, public.vehicle_media,
              public.vehicle_features, public.vehicle_feature_translations, public.vehicle_status_history
  from anon, authenticated;
grant select on public.brands, public.vehicles, public.vehicle_translations, public.vehicle_media,
               public.vehicle_features, public.vehicle_feature_translations
  to anon, authenticated;
grant insert, update, delete on public.brands, public.vehicles, public.vehicle_translations, public.vehicle_media,
                               public.vehicle_features, public.vehicle_feature_translations
  to authenticated;
grant select on public.vehicle_status_history to authenticated;

-- brands
create policy "Published brands are public; staff see all" on public.brands
  for select to anon, authenticated
  using (is_published or (select private.is_staff()));
create policy "Inventory staff add brands" on public.brands
  for insert to authenticated
  with check ((select private.has_role('OWNER', 'MANAGER', 'INVENTORY_EDITOR')));
create policy "Inventory staff edit brands" on public.brands
  for update to authenticated
  using ((select private.has_role('OWNER', 'MANAGER', 'INVENTORY_EDITOR')))
  with check ((select private.has_role('OWNER', 'MANAGER', 'INVENTORY_EDITOR')));
create policy "Managers delete brands" on public.brands
  for delete to authenticated
  using ((select private.has_role('OWNER', 'MANAGER')));

-- vehicles
create policy "Published unsold vehicles are public; staff see all" on public.vehicles
  for select to anon, authenticated
  using ((publication = 'published' and status <> 'sold') or (select private.is_staff()));
create policy "Inventory staff add vehicles" on public.vehicles
  for insert to authenticated
  with check ((select private.has_role('OWNER', 'MANAGER', 'INVENTORY_EDITOR')));
create policy "Inventory staff edit vehicles" on public.vehicles
  for update to authenticated
  using ((select private.has_role('OWNER', 'MANAGER', 'INVENTORY_EDITOR')))
  with check ((select private.has_role('OWNER', 'MANAGER', 'INVENTORY_EDITOR')));
create policy "Managers delete vehicles" on public.vehicles
  for delete to authenticated
  using ((select private.has_role('OWNER', 'MANAGER')));

-- a vehicle's translations, media and specs are visible exactly when the vehicle is
-- (the vehicle lookup below goes through the vehicle rules above for whoever is asking)
create policy "Visible with their vehicle" on public.vehicle_translations
  for select to anon, authenticated
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id));
create policy "Inventory staff write translations" on public.vehicle_translations
  for all to authenticated
  using ((select private.has_role('OWNER', 'MANAGER', 'INVENTORY_EDITOR')))
  with check ((select private.has_role('OWNER', 'MANAGER', 'INVENTORY_EDITOR')));

create policy "Visible with their vehicle" on public.vehicle_media
  for select to anon, authenticated
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id));
create policy "Inventory staff write media" on public.vehicle_media
  for all to authenticated
  using ((select private.has_role('OWNER', 'MANAGER', 'INVENTORY_EDITOR')))
  with check ((select private.has_role('OWNER', 'MANAGER', 'INVENTORY_EDITOR')));

create policy "Visible with their vehicle" on public.vehicle_features
  for select to anon, authenticated
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id));
create policy "Inventory staff write specs" on public.vehicle_features
  for all to authenticated
  using ((select private.has_role('OWNER', 'MANAGER', 'INVENTORY_EDITOR')))
  with check ((select private.has_role('OWNER', 'MANAGER', 'INVENTORY_EDITOR')));

create policy "Visible with their spec" on public.vehicle_feature_translations
  for select to anon, authenticated
  using (exists (select 1 from public.vehicle_features f where f.id = feature_id));
create policy "Inventory staff write spec text" on public.vehicle_feature_translations
  for all to authenticated
  using ((select private.has_role('OWNER', 'MANAGER', 'INVENTORY_EDITOR')))
  with check ((select private.has_role('OWNER', 'MANAGER', 'INVENTORY_EDITOR')));

create policy "Staff read the status history" on public.vehicle_status_history
  for select to authenticated
  using ((select private.is_staff()));
