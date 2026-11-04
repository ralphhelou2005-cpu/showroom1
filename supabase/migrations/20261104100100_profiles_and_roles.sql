-- Milcar platform, part 2 of 9: staff profiles and the four roles.
--
-- Every login gets a profile automatically. A profile without a role can do nothing at all, so an account
-- someone creates on their own (if sign-ups are left open) never reaches any data. Roles are given by the
-- owner, or set by the server when it sends a staff invitation (app_metadata.role, which users cannot edit).

create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  email            text check (email is null or private.is_email(email)),
  full_name        text not null default '' check (char_length(full_name) <= 120),
  phone            text check (phone is null or private.is_phone(phone)),
  role             public.app_role,                      -- empty: no access
  active           boolean not null default true,        -- the owner switches people off instead of deleting them
  preferred_locale public.locale not null default 'en',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index profiles_email_key on public.profiles (lower(email)) where email is not null;
create index profiles_role_idx on public.profiles (role) where active;
create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();


-- ============================================================
-- Role checks, used by every rule below. They read the profile of whoever is asking, and nobody else's.
-- ============================================================

create or replace function private.app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid()) and p.active;
$$;

create or replace function private.has_role(variadic roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.app_role() = any (roles), false);
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.app_role() is not null;
$$;

revoke all on function private.app_role(), private.has_role(public.app_role[]), private.is_staff() from public;
grant execute on function private.app_role(), private.has_role(public.app_role[]), private.is_staff() to anon, authenticated, service_role;

-- for the dashboard: "what may I do?" (people only ever learn their own role)
create or replace function public.my_role()
returns public.app_role
language sql
stable
set search_path = ''
as $$
  select private.app_role();
$$;
revoke all on function public.my_role() from public, anon;
grant execute on function public.my_role() to authenticated;


-- ============================================================
-- A profile for every login
-- ============================================================

create or replace function private.create_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invited text := new.raw_app_meta_data ->> 'role';
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, nullif(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''),
          case when invited in ('OWNER', 'MANAGER', 'SALESPERSON', 'INVENTORY_EDITOR') then invited::public.app_role end)
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_profile();

create or replace function private.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = nullif(new.email, '') where id = new.id;
  return new;
end;
$$;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (new.email is distinct from old.email) execute function private.sync_profile_email();

-- logins that already exist get their profile now, and the owner on the legacy admin list becomes OWNER
insert into public.profiles (id, email, full_name)
select u.id, nullif(u.email, ''), coalesce(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
on conflict (id) do nothing;

do $$
begin
  if to_regclass('private.admins') is not null then
    update public.profiles p set role = 'OWNER'
    from private.admins a
    where a.user_id = p.id and p.role is null;
  end if;
end;
$$;


-- ============================================================
-- Guards: only the owner changes roles, and there is always at least one active owner
-- ============================================================

create or replace function private.guard_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- people may edit their own name, phone and language; role, access and email belong to the owner
  if current_user = 'authenticated' and not private.has_role('OWNER') and
     (new.role is distinct from old.role or new.active <> old.active or new.email is distinct from old.email) then
    raise exception using errcode = 'P0001', message = 'profile.owner_only';
  end if;
  return new;
end;
$$;
create trigger profiles_10_guard before update on public.profiles for each row execute function private.guard_profile();

create or replace function private.keep_an_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'OWNER' and old.active
     and (tg_op = 'DELETE' or new.role is distinct from 'OWNER' or not new.active)
     and not exists (select 1 from public.profiles p where p.id <> old.id and p.role = 'OWNER' and p.active) then
    raise exception using errcode = 'P0001', message = 'profile.last_owner';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger profiles_20_keep_owner before update or delete on public.profiles for each row execute function private.keep_an_owner();

create trigger profiles_audit after insert or update or delete on public.profiles for each row execute function private.audit();


-- ============================================================
-- Who may see and change profiles
-- ============================================================
-- Everyone on the team sees the team (names and roles, so leads can show who they are assigned to).
-- People edit their own details; only the owner edits other people. Profiles are created by the login
-- trigger above and removed by deleting the login, never directly.

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select, update on public.profiles to authenticated;

create policy "Staff see the team, everyone sees themselves" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_staff()));

create policy "People edit themselves, the owner edits anyone" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select private.has_role('OWNER')))
  with check (id = (select auth.uid()) or (select private.has_role('OWNER')));
