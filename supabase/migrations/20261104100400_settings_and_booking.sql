-- Milcar platform, part 5 of 9: site settings, opening hours, closures and private-viewing appointments.
--
-- Bookings are checked by the database itself, whoever makes them: inside opening hours, not on a closed day,
-- never two viewings of the same car or for the same salesperson at once, and no more viewings at a time than
-- the showroom allows. Visitors book through the server; they only ever see free times, never other bookings.
--
-- Opening hours start empty, so nobody can book until the owner enters the real hours.

create table public.site_settings (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$'),
  value       jsonb not null,
  is_public   boolean not null default false,       -- public settings are readable by the website
  description text,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);
create trigger site_settings_updated_at before update on public.site_settings for each row execute function private.set_updated_at();

-- starting values: empty where only the owner knows the answer (the website shows nothing rather than a placeholder),
-- and booking rules the owner can change. Integrations stay off until they are configured.
insert into public.site_settings (key, value, is_public, description) values
  ('business.profile',
   '{"name": "Milcar", "address": null, "map_url": null, "phone": null, "whatsapp": null, "email": null, "instagram": null}',
   true, 'Name and contact details shown on the website. Empty details are not shown.'),
  ('booking.rules',
   '{"timezone": "Asia/Beirut", "slot_minutes": 60, "min_notice_hours": 24, "max_days_ahead": 60, "max_parallel": 1, "requires_approval": true}',
   true, 'Private viewings: length, notice, how far ahead, how many at once, and whether a manager confirms each one.'),
  ('notifications.email', '{"enabled": false, "from": null, "staff_recipients": []}', false,
   'Emails to customers and staff. Off until an email provider is configured.'),
  ('integrations.whatsapp_business', '{"enabled": false}', false,
   'WhatsApp Business API. Off until it is configured; plain WhatsApp links work without it.'),
  ('integrations.google_calendar', '{"enabled": false}', false,
   'Copy confirmed viewings to Google Calendar. Off until it is configured.')
on conflict (key) do nothing;

-- the booking rules, with safe defaults for anything missing
create or replace function private.booking_rules()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return '{"timezone": "Asia/Beirut", "slot_minutes": 60, "min_notice_hours": 24, "max_days_ahead": 60, "max_parallel": 1, "requires_approval": true}'::jsonb
         || coalesce((select s.value from public.site_settings s where s.key = 'booking.rules'), '{}'::jsonb);
end;
$$;


-- ============================================================
-- Opening hours and closures
-- ============================================================

create table public.business_hours (
  id         uuid primary key default gen_random_uuid(),
  weekday    smallint not null check (weekday between 0 and 6),   -- 0 Sunday … 6 Saturday, showroom time
  opens_at   time not null,
  closes_at  time not null,
  updated_at timestamptz not null default now(),
  check (closes_at > opens_at),
  -- two opening periods on one day may not overlap
  exclude using gist (weekday with =, tsrange('2000-01-01'::date + opens_at, '2000-01-01'::date + closes_at) with &&)
);
create trigger business_hours_updated_at before update on public.business_hours for each row execute function private.set_updated_at();

create table public.closures (
  id         uuid primary key default gen_random_uuid(),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text check (char_length(reason) <= 200),             -- staff only
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index closures_time_idx on public.closures using gist (tstzrange(starts_at, ends_at));


-- ============================================================
-- Appointments
-- ============================================================

create table public.appointments (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references public.customers (id) on delete cascade,
  lead_id          uuid references public.leads (id) on delete set null,
  vehicle_id       uuid references public.vehicles (id) on delete set null,
  assigned_to      uuid references public.profiles (id) on delete set null,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  status           public.appointment_status not null default 'requested',
  locale           public.locale not null default 'en',
  customer_note    text check (char_length(customer_note) <= 2000),
  internal_note    text check (char_length(internal_note) <= 2000),
  cancelled_reason text check (char_length(cancelled_reason) <= 500),
  confirmed_by     uuid references public.profiles (id) on delete set null,
  confirmed_at     timestamptz,
  google_event_id  text,                                          -- only once Google Calendar is connected
  created_by       uuid references public.profiles (id) on delete set null,   -- empty: booked on the website
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (ends_at > starts_at and ends_at - starts_at <= interval '4 hours'),
  constraint appointments_one_viewing_per_car exclude using gist
    (vehicle_id with =, tstzrange(starts_at, ends_at) with &&)
    where (vehicle_id is not null and status in ('requested', 'confirmed', 'rescheduled')),
  constraint appointments_one_viewing_per_salesperson exclude using gist
    (assigned_to with =, tstzrange(starts_at, ends_at) with &&)
    where (assigned_to is not null and status in ('requested', 'confirmed', 'rescheduled'))
);
create index appointments_time_idx on public.appointments using gist (tstzrange(starts_at, ends_at))
  where status in ('requested', 'confirmed', 'rescheduled');
create index appointments_status_idx on public.appointments (status, starts_at);
create index appointments_assigned_idx on public.appointments (assigned_to, starts_at);
create index appointments_customer_idx on public.appointments (customer_id);
create index appointments_lead_idx on public.appointments (lead_id);
create trigger appointments_updated_at before update on public.appointments for each row execute function private.set_updated_at();

-- 1. who may do what: only managers and the owner confirm; a salesperson moving a confirmed viewing sends it back for approval
create or replace function private.guard_appointment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  manager boolean := private.has_role('OWNER', 'MANAGER');
  confirming boolean := new.status = 'confirmed' and (tg_op = 'INSERT' or old.status <> 'confirmed');
begin
  if current_user = 'authenticated' then
    if confirming and not manager then
      raise exception using errcode = 'P0001', message = 'appointment.confirm_requires_manager';
    end if;
    if tg_op = 'INSERT' then new.created_by := (select auth.uid()); end if;
  end if;
  if tg_op = 'UPDATE' and (new.starts_at <> old.starts_at or new.ends_at <> old.ends_at)
     and old.status = 'confirmed' and new.status = 'confirmed' and not manager then
    new.status := 'rescheduled';
    confirming := false;
  end if;
  if confirming then
    new.confirmed_by := (select auth.uid());
    new.confirmed_at := now();
  end if;
  return new;
end;
$$;
create trigger appointments_10_guard before insert or update on public.appointments for each row execute function private.guard_appointment();

-- 2. is the time possible? (reads every booking, not only those the person may see)
create or replace function private.check_appointment_time()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rules jsonb := private.booking_rules();
  tz text := rules ->> 'timezone';
  local_start timestamp := new.starts_at at time zone tz;
  local_end timestamp := new.ends_at at time zone tz;
  taken integer;
begin
  if new.status not in ('requested', 'confirmed', 'rescheduled') then return new; end if;
  if new.ends_at <= new.starts_at then return new; end if;   -- the table's own check refuses it
  -- an active booking whose time did not change was already checked (opening hours may have changed since)
  if tg_op = 'UPDATE' and new.starts_at = old.starts_at and new.ends_at = old.ends_at
     and old.status in ('requested', 'confirmed', 'rescheduled') then
    return new;
  end if;

  if local_start::date <> local_end::date or not exists (
       select 1 from public.business_hours b
       where b.weekday = extract(dow from local_start) and local_start::time >= b.opens_at and local_end::time <= b.closes_at) then
    raise exception using errcode = 'P0001', message = 'booking.outside_opening_hours';
  end if;
  if exists (select 1 from public.closures c where tstzrange(c.starts_at, c.ends_at) && tstzrange(new.starts_at, new.ends_at)) then
    raise exception using errcode = 'P0001', message = 'booking.showroom_closed';
  end if;
  -- notice and horizon apply to bookings made on the website; staff may enter any time
  if tg_op = 'INSERT' and new.created_by is null then
    if new.starts_at < now() + make_interval(hours => (rules ->> 'min_notice_hours')::int) then
      raise exception using errcode = 'P0001', message = 'booking.too_soon';
    end if;
    if new.starts_at > now() + make_interval(days => (rules ->> 'max_days_ahead')::int) then
      raise exception using errcode = 'P0001', message = 'booking.too_far_ahead';
    end if;
  end if;

  -- one booking at a time is checked, so two people can never take the last place together
  perform pg_advisory_xact_lock(hashtext('milcar.appointments'));
  select count(*) into taken from public.appointments a
  where a.id <> new.id and a.status in ('requested', 'confirmed', 'rescheduled')
    and tstzrange(a.starts_at, a.ends_at) && tstzrange(new.starts_at, new.ends_at);
  if taken >= (rules ->> 'max_parallel')::int then
    raise exception using errcode = 'P0001', message = 'booking.slot_full';
  end if;
  return new;
end;
$$;
create trigger appointments_20_check_time before insert or update on public.appointments for each row execute function private.check_appointment_time();

-- 3. the lead's history
create or replace function private.log_appointment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  kind public.activity_type;
begin
  if new.lead_id is null then return null; end if;
  if tg_op = 'INSERT' then
    kind := case new.status when 'confirmed' then 'appointment_confirmed' else 'appointment_requested' end;
  elsif new.status <> old.status then
    kind := case new.status
      when 'confirmed' then 'appointment_confirmed'
      when 'rescheduled' then 'appointment_rescheduled'
      when 'cancelled' then 'appointment_cancelled'
      when 'completed' then 'appointment_completed'
      when 'no_show' then 'appointment_no_show'
      else 'appointment_requested' end;
  elsif new.starts_at <> old.starts_at or new.ends_at <> old.ends_at then
    kind := 'appointment_rescheduled';
  else
    return null;
  end if;
  insert into public.lead_activities (lead_id, actor_id, type, details)
  values (new.lead_id, (select auth.uid()), kind,
          jsonb_build_object('appointment_id', new.id, 'starts_at', new.starts_at, 'status', new.status));
  return null;
end;
$$;
create trigger appointments_history after insert or update on public.appointments for each row execute function private.log_appointment();


-- ============================================================
-- Free times for the booking page
-- ============================================================
-- Returns the times a visitor could book between two dates (at most two months), in the showroom's time zone
-- rules. Nothing about other bookings is revealed: a time is either listed or not.

create or replace function public.available_slots(p_from date, p_to date, p_vehicle_id uuid default null)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  rules jsonb := private.booking_rules();
  tz text := rules ->> 'timezone';
  step interval := make_interval(mins => (rules ->> 'slot_minutes')::int);
  earliest timestamptz := now() + make_interval(hours => (rules ->> 'min_notice_hours')::int);
  latest timestamptz := now() + make_interval(days => (rules ->> 'max_days_ahead')::int);
  room integer := (rules ->> 'max_parallel')::int;
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 62 then
    raise exception using errcode = '22023', message = 'booking.bad_range';
  end if;
  return query
  with days as (
    select d::date as on_day from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') d
  ), periods as (
    select (days.on_day + b.opens_at) at time zone tz as p_start, (days.on_day + b.closes_at) at time zone tz as p_end
    from days join public.business_hours b on b.weekday = extract(dow from days.on_day)
  ), slots as (
    select s as s_start, s + step as s_end
    from periods, generate_series(periods.p_start, periods.p_end - step, step) s
  )
  select slots.s_start, slots.s_end from slots
  where slots.s_start >= earliest and slots.s_start <= latest
    and not exists (select 1 from public.closures c
                    where tstzrange(c.starts_at, c.ends_at) && tstzrange(slots.s_start, slots.s_end))
    and (select count(*) from public.appointments a
         where a.status in ('requested', 'confirmed', 'rescheduled')
           and tstzrange(a.starts_at, a.ends_at) && tstzrange(slots.s_start, slots.s_end)) < room
    and (p_vehicle_id is null or not exists (
         select 1 from public.appointments a
         where a.vehicle_id = p_vehicle_id and a.status in ('requested', 'confirmed', 'rescheduled')
           and tstzrange(a.starts_at, a.ends_at) && tstzrange(slots.s_start, slots.s_end)))
  order by 1;
end;
$$;
revoke all on function public.available_slots(date, date, uuid) from public;
grant execute on function public.available_slots(date, date, uuid) to anon, authenticated;

create trigger site_settings_audit after insert or update or delete on public.site_settings for each row execute function private.audit();
create trigger business_hours_audit after insert or update or delete on public.business_hours for each row execute function private.audit();
create trigger closures_audit after insert or update or delete on public.closures for each row execute function private.audit();
create trigger appointments_audit after insert or update or delete on public.appointments for each row execute function private.audit();


-- ============================================================
-- Who may see and change settings, hours and appointments
-- ============================================================

alter table public.site_settings enable row level security;
alter table public.business_hours enable row level security;
alter table public.closures enable row level security;
alter table public.appointments enable row level security;

revoke all on public.site_settings, public.business_hours, public.closures, public.appointments from anon, authenticated;
grant select on public.site_settings, public.business_hours to anon, authenticated;
grant insert, update, delete on public.site_settings, public.business_hours to authenticated;
grant select, insert, update, delete on public.closures, public.appointments to authenticated;

create policy "Public settings are public; staff see all" on public.site_settings
  for select to anon, authenticated
  using (is_public or (select private.is_staff()));
create policy "The owner changes settings" on public.site_settings
  for all to authenticated
  using ((select private.has_role('OWNER')))
  with check ((select private.has_role('OWNER')));

create policy "Opening hours are public" on public.business_hours
  for select to anon, authenticated
  using (true);
create policy "Managers set opening hours" on public.business_hours
  for all to authenticated
  using ((select private.has_role('OWNER', 'MANAGER')))
  with check ((select private.has_role('OWNER', 'MANAGER')));

create policy "Staff see closures" on public.closures
  for select to authenticated
  using ((select private.is_staff()));
create policy "Managers set closures" on public.closures
  for all to authenticated
  using ((select private.has_role('OWNER', 'MANAGER')))
  with check ((select private.has_role('OWNER', 'MANAGER')));

create policy "Managers see all viewings; salespeople theirs" on public.appointments
  for select to authenticated
  using ((select private.has_role('OWNER', 'MANAGER'))
         or ((select private.has_role('SALESPERSON'))
             and (assigned_to = (select auth.uid()) or exists (select 1 from public.leads l where l.id = lead_id))));
create policy "Sales staff book viewings" on public.appointments
  for insert to authenticated
  with check ((select private.has_role('OWNER', 'MANAGER'))
              or ((select private.has_role('SALESPERSON')) and (assigned_to is null or assigned_to = (select auth.uid()))));
create policy "Managers change any viewing; salespeople theirs" on public.appointments
  for update to authenticated
  using ((select private.has_role('OWNER', 'MANAGER'))
         or ((select private.has_role('SALESPERSON'))
             and (assigned_to = (select auth.uid()) or exists (select 1 from public.leads l where l.id = lead_id))))
  with check ((select private.has_role('OWNER', 'MANAGER'))
              or ((select private.has_role('SALESPERSON')) and (assigned_to is null or assigned_to = (select auth.uid()))));
create policy "Managers delete viewings" on public.appointments
  for delete to authenticated
  using ((select private.has_role('OWNER', 'MANAGER')));
