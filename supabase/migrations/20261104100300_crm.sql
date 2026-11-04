-- Milcar platform, part 4 of 9: customers, leads, notes and the activity history.
--
-- A lead is one customer's interest, usually in one car; a customer interested in three cars has three leads.
-- Website inquiries arrive through the server (which checks them for spam first), never straight from a browser:
-- visitors have no access to any of these tables.
--
-- Managers and the owner see and change everything. Salespeople see the leads assigned to them plus the
-- unassigned ones (so they can pick them up), and the customers behind those leads. Inventory editors see none of it.

create table public.customers (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null check (char_length(full_name) between 1 and 120),
  email             text check (email is null or private.is_email(email)),
  phone             text check (phone is null or private.is_phone(phone)),
  preferred_locale  public.locale not null default 'en',
  preferred_contact text check (preferred_contact in ('phone', 'whatsapp', 'email')),
  marketing_consent boolean not null default false,
  consent_at        timestamptz,
  created_by        uuid references public.profiles (id) on delete set null,   -- empty: came in from the website
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (email is not null or phone is not null)
);
-- one customer per email and per phone number, so repeat inquiries land on the same person
create unique index customers_email_key on public.customers (lower(email)) where email is not null;
create unique index customers_phone_key on public.customers (phone) where phone is not null;
create index customers_name_idx on public.customers (lower(full_name));
create trigger customers_updated_at before update on public.customers for each row execute function private.set_updated_at();

create table public.leads (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references public.customers (id) on delete cascade,
  vehicle_id        uuid references public.vehicles (id) on delete set null,
  source            public.lead_source not null,
  source_detail     text check (char_length(source_detail) <= 300),   -- e.g. the page or campaign it came from
  status            public.lead_status not null default 'new',
  assigned_to       uuid references public.profiles (id) on delete set null,
  locale            public.locale not null default 'en',              -- the language the customer wrote in
  message           text check (char_length(message) <= 4000),
  next_follow_up_at timestamptz,
  lost_reason       text check (char_length(lost_reason) <= 500),
  closed_at         timestamptz,
  created_by        uuid references public.profiles (id) on delete set null,   -- empty: from the website
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index leads_assigned_idx on public.leads (assigned_to, status);
create index leads_status_idx on public.leads (status, created_at desc);
create index leads_customer_idx on public.leads (customer_id);
create index leads_vehicle_idx on public.leads (vehicle_id);
create index leads_follow_up_idx on public.leads (next_follow_up_at) where status not in ('won', 'lost');
create trigger leads_updated_at before update on public.leads for each row execute function private.set_updated_at();

create table public.lead_notes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads (id) on delete cascade,
  author_id  uuid references public.profiles (id) on delete set null,
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lead_notes_lead_idx on public.lead_notes (lead_id, created_at desc);
create trigger lead_notes_updated_at before update on public.lead_notes for each row execute function private.set_updated_at();

-- the history of a lead: written by the triggers below, plus calls and messages staff log by hand. Never edited.
create table public.lead_activities (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null,
  type        public.activity_type not null,
  details     jsonb not null default '{}' check (jsonb_typeof(details) = 'object'),
  occurred_at timestamptz not null default now()
);
create index lead_activities_lead_idx on public.lead_activities (lead_id, occurred_at desc);


-- ============================================================
-- Automatic history and stamps
-- ============================================================

create or replace function private.stamp_lead()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    -- a salesperson cannot hand a lead to someone else; managers and the owner can
    if (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to)
       and new.assigned_to is distinct from (select auth.uid()) and new.assigned_to is not null
       and not private.has_role('OWNER', 'MANAGER') then
      raise exception using errcode = 'P0001', message = 'lead.assign_requires_manager';
    end if;
    if tg_op = 'INSERT' then new.created_by := (select auth.uid()); end if;
  end if;
  if new.status in ('won', 'lost') and (tg_op = 'INSERT' or old.status not in ('won', 'lost')) then new.closed_at := now(); end if;
  if new.status not in ('won', 'lost') then new.closed_at := null; end if;
  return new;
end;
$$;
create trigger leads_10_stamp before insert or update on public.leads for each row execute function private.stamp_lead();

create or replace function private.log_lead()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    insert into public.lead_activities (lead_id, actor_id, type, details)
    values (new.id, me, 'created', jsonb_build_object('source', new.source, 'status', new.status));
    if new.assigned_to is not null then
      insert into public.lead_activities (lead_id, actor_id, type, details) values (new.id, me, 'assigned', jsonb_build_object('to', new.assigned_to));
    end if;
    return null;
  end if;
  if new.status <> old.status then
    insert into public.lead_activities (lead_id, actor_id, type, details) values (new.id, me, 'status_changed', jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into public.lead_activities (lead_id, actor_id, type, details) values (new.id, me, 'assigned', jsonb_build_object('from', old.assigned_to, 'to', new.assigned_to));
  end if;
  if new.vehicle_id is distinct from old.vehicle_id then
    insert into public.lead_activities (lead_id, actor_id, type, details) values (new.id, me, 'vehicle_changed', jsonb_build_object('from', old.vehicle_id, 'to', new.vehicle_id));
  end if;
  if new.next_follow_up_at is distinct from old.next_follow_up_at then
    insert into public.lead_activities (lead_id, actor_id, type, details) values (new.id, me, 'follow_up_set', jsonb_build_object('at', new.next_follow_up_at));
  end if;
  return null;
end;
$$;
create trigger leads_history after insert or update on public.leads for each row execute function private.log_lead();

create or replace function private.stamp_lead_note()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if tg_op = 'INSERT' then new.author_id := (select auth.uid());
    else new.author_id := old.author_id; new.lead_id := old.lead_id; end if;
  end if;
  return new;
end;
$$;
create trigger lead_notes_10_stamp before insert or update on public.lead_notes for each row execute function private.stamp_lead_note();

create or replace function private.log_lead_note()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lead_activities (lead_id, actor_id, type, details)
  values (new.lead_id, new.author_id, 'note_added', jsonb_build_object('note_id', new.id));
  return null;
end;
$$;
create trigger lead_notes_history after insert on public.lead_notes for each row execute function private.log_lead_note();

create or replace function private.stamp_activity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    -- by hand, staff only log contact they made themselves; everything else is written by the system
    if new.type not in ('call', 'whatsapp_message', 'email', 'meeting') then
      raise exception using errcode = 'P0001', message = 'activity.system_only';
    end if;
    new.actor_id := (select auth.uid());
    new.occurred_at := least(new.occurred_at, now());
  end if;
  return new;
end;
$$;
create trigger lead_activities_10_stamp before insert on public.lead_activities for each row execute function private.stamp_activity();

create or replace function private.stamp_customer()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and tg_op = 'INSERT' then new.created_by := (select auth.uid()); end if;
  if new.marketing_consent and (tg_op = 'INSERT' or not old.marketing_consent) then new.consent_at := now(); end if;
  if not new.marketing_consent then new.consent_at := null; end if;
  return new;
end;
$$;
create trigger customers_10_stamp before insert or update on public.customers for each row execute function private.stamp_customer();

create trigger customers_audit after insert or update or delete on public.customers for each row execute function private.audit();
create trigger leads_audit after insert or update or delete on public.leads for each row execute function private.audit();
create trigger lead_notes_audit after insert or update or delete on public.lead_notes for each row execute function private.audit();


-- ============================================================
-- Who may see and change the CRM
-- ============================================================

alter table public.customers enable row level security;
alter table public.leads enable row level security;
alter table public.lead_notes enable row level security;
alter table public.lead_activities enable row level security;

revoke all on public.customers, public.leads, public.lead_notes, public.lead_activities from anon, authenticated;
grant select, insert, update, delete on public.customers, public.leads, public.lead_notes to authenticated;
grant select, insert on public.lead_activities to authenticated;

-- leads
create policy "Managers see all leads; salespeople their own and unassigned ones" on public.leads
  for select to authenticated
  using ((select private.has_role('OWNER', 'MANAGER'))
         or ((select private.has_role('SALESPERSON')) and (assigned_to = (select auth.uid()) or assigned_to is null)));
create policy "Sales staff add leads" on public.leads
  for insert to authenticated
  with check ((select private.has_role('OWNER', 'MANAGER', 'SALESPERSON')));
create policy "Managers edit any lead; salespeople their own or one they pick up" on public.leads
  for update to authenticated
  using ((select private.has_role('OWNER', 'MANAGER'))
         or ((select private.has_role('SALESPERSON')) and (assigned_to = (select auth.uid()) or assigned_to is null)))
  with check ((select private.has_role('OWNER', 'MANAGER'))
              or ((select private.has_role('SALESPERSON')) and assigned_to = (select auth.uid())));
create policy "Managers delete leads" on public.leads
  for delete to authenticated
  using ((select private.has_role('OWNER', 'MANAGER')));

-- customers: salespeople see the people behind the leads they can see, and those they added themselves
create policy "Managers see all customers; salespeople theirs" on public.customers
  for select to authenticated
  using ((select private.has_role('OWNER', 'MANAGER'))
         or ((select private.has_role('SALESPERSON'))
             and (created_by = (select auth.uid()) or exists (select 1 from public.leads l where l.customer_id = customers.id))));
create policy "Sales staff add customers" on public.customers
  for insert to authenticated
  with check ((select private.has_role('OWNER', 'MANAGER', 'SALESPERSON')));
create policy "Managers edit any customer; salespeople theirs" on public.customers
  for update to authenticated
  using ((select private.has_role('OWNER', 'MANAGER'))
         or ((select private.has_role('SALESPERSON'))
             and (created_by = (select auth.uid()) or exists (select 1 from public.leads l where l.customer_id = customers.id))))
  with check ((select private.has_role('OWNER', 'MANAGER', 'SALESPERSON')));
create policy "Managers delete customers" on public.customers
  for delete to authenticated
  using ((select private.has_role('OWNER', 'MANAGER')));

-- notes and history follow their lead (the lead lookup goes through the lead rules above)
create policy "Visible with their lead" on public.lead_notes
  for select to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_id));
create policy "Sales staff add notes to leads they see" on public.lead_notes
  for insert to authenticated
  with check ((select private.has_role('OWNER', 'MANAGER', 'SALESPERSON')) and exists (select 1 from public.leads l where l.id = lead_id));
create policy "Authors edit their notes; managers any" on public.lead_notes
  for update to authenticated
  using (author_id = (select auth.uid()) or (select private.has_role('OWNER', 'MANAGER')))
  with check (author_id = (select auth.uid()) or (select private.has_role('OWNER', 'MANAGER')));
create policy "Authors delete their notes; managers any" on public.lead_notes
  for delete to authenticated
  using (author_id = (select auth.uid()) or (select private.has_role('OWNER', 'MANAGER')));

create policy "Visible with their lead" on public.lead_activities
  for select to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_id));
create policy "Sales staff log contact on leads they see" on public.lead_activities
  for insert to authenticated
  with check ((select private.has_role('OWNER', 'MANAGER', 'SALESPERSON')) and exists (select 1 from public.leads l where l.id = lead_id));
