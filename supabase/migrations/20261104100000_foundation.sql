-- Milcar platform, part 1 of 9: extensions, shared types, and the helpers every other part uses.
--
-- The migrations run once per database, in file-name order (`supabase db push`, or paste each file into the
-- SQL editor). They only add things: the legacy site's public.cars, private.admins and the car-photos bucket
-- are left exactly as they are, so the current website keeps working until the new one replaces it.

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;   -- lets one constraint refuse double bookings
create schema if not exists private;                                -- never exposed through the API
grant usage on schema private to anon, authenticated, service_role;


-- ============================================================
-- Shared types
-- ============================================================

create type public.app_role as enum ('OWNER', 'MANAGER', 'SALESPERSON', 'INVENTORY_EDITOR');
create type public.locale as enum ('en', 'fr', 'ar');

create type public.vehicle_status as enum ('available', 'reserved', 'sold');
create type public.publication_status as enum ('draft', 'published', 'archived');
create type public.body_type as enum ('supercar', 'sports_car', 'suv', 'sedan', 'coupe', 'convertible',
                                      'grand_tourer', 'pickup', 'classic', 'other');
create type public.media_kind as enum ('image', 'video');

create type public.lead_status as enum ('new', 'contacted', 'qualified', 'viewing_booked', 'negotiating', 'won', 'lost');
create type public.lead_source as enum ('website_form', 'private_viewing', 'whatsapp', 'phone', 'walk_in',
                                        'instagram', 'facebook', 'referral', 'other');
create type public.activity_type as enum (
  'created', 'status_changed', 'assigned', 'vehicle_changed', 'follow_up_set', 'note_added',
  'call', 'whatsapp_message', 'email', 'meeting',
  'appointment_requested', 'appointment_confirmed', 'appointment_rescheduled',
  'appointment_cancelled', 'appointment_completed', 'appointment_no_show');

create type public.appointment_status as enum ('requested', 'confirmed', 'rescheduled', 'cancelled', 'completed', 'no_show');

create type public.notification_channel as enum ('email', 'in_app', 'whatsapp');
create type public.notification_status as enum ('queued', 'sent', 'failed', 'skipped');


-- ============================================================
-- Helpers
-- ============================================================

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- text in several languages, stored as {"en": "...", "fr": "...", "ar": "..."}: only those keys, only strings
create or replace function private.is_i18n_text(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(value) = 'object'
     and not exists (select 1 from jsonb_each(value) e
                     where e.key not in ('en', 'fr', 'ar') or jsonb_typeof(e.value) <> 'string');
$$;

-- a phone number in international form: +9613123456
create or replace function private.is_phone(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value ~ '^\+[1-9][0-9]{6,14}$';
$$;

create or replace function private.is_email(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select char_length(value) <= 254 and value ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$';
$$;

create or replace function private.is_slug(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select char_length(value) <= 80 and value ~ '^[a-z0-9]+(-[a-z0-9]+)*$';
$$;


-- ============================================================
-- Audit log: who changed what, written by triggers on every admin table
-- ============================================================
-- Nobody can write to it directly or change it afterwards. Only the owner can read it (part 6 adds that rule).

create table public.audit_logs (
  id             uuid primary key default gen_random_uuid(),
  occurred_at    timestamptz not null default now(),
  actor_id       uuid references auth.users (id) on delete set null,   -- empty: the website or a server job
  actor_role     public.app_role,
  action         text not null check (action in ('insert', 'update', 'delete')),
  table_name     text not null,
  record_id      text,
  changed_fields text[],
  old_data       jsonb,
  new_data       jsonb
);
create index audit_logs_record_idx on public.audit_logs (table_name, record_id, occurred_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, occurred_at desc);
create index audit_logs_time_idx on public.audit_logs (occurred_at desc);
alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from anon, authenticated;

create or replace function private.audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  before jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  after  jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  changed text[];
begin
  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into changed
    from jsonb_object_keys(after) k
    where k <> 'updated_at' and after -> k is distinct from before -> k;
    if changed is null then return null; end if;   -- nothing really changed
  end if;
  insert into public.audit_logs (actor_id, actor_role, action, table_name, record_id, changed_fields, old_data, new_data)
  values ((select auth.uid()), private.app_role(), lower(tg_op), tg_table_name,
          coalesce(after ->> 'id', before ->> 'id'), changed, before, after);
  return null;
end;
$$;
