-- Milcar platform, part 6 of 9: notifications (emails, in-app messages, later WhatsApp) and who reads the audit log.
--
-- The server writes a notification here first, then sends it, and records whether that worked. Nothing is ever
-- marked "sent" unless the email provider accepted it; while email is not configured, notifications stay
-- "skipped" with the reason, so nothing pretends to have been delivered.

create table public.notifications (
  id                     uuid primary key default gen_random_uuid(),
  channel                public.notification_channel not null,
  template               text not null check (template ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$'),   -- e.g. booking.confirmed
  locale                 public.locale not null default 'en',
  recipient_profile_id   uuid references public.profiles (id) on delete cascade,   -- a member of staff
  recipient_email        text check (recipient_email is null or private.is_email(recipient_email)),
  recipient_phone        text check (recipient_phone is null or private.is_phone(recipient_phone)),
  payload                jsonb not null default '{}' check (jsonb_typeof(payload) = 'object'),
  related_lead_id        uuid references public.leads (id) on delete set null,
  related_appointment_id uuid references public.appointments (id) on delete set null,
  status                 public.notification_status not null default 'queued',
  attempts               smallint not null default 0 check (attempts >= 0),
  last_error             text check (char_length(last_error) <= 1000),
  provider_message_id    text,
  scheduled_for          timestamptz not null default now(),
  sent_at                timestamptz,
  read_at                timestamptz,                                              -- in-app messages
  created_at             timestamptz not null default now(),
  check (recipient_profile_id is not null or recipient_email is not null or recipient_phone is not null),
  check (status <> 'sent' or sent_at is not null)
);
create index notifications_queue_idx on public.notifications (scheduled_for) where status = 'queued';
create index notifications_recipient_idx on public.notifications (recipient_profile_id, created_at desc);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;

create policy "People see their own notifications; managers all" on public.notifications
  for select to authenticated
  using (recipient_profile_id = (select auth.uid()) or (select private.has_role('OWNER', 'MANAGER')));

-- the only change staff make themselves: marking their own messages as read
create or replace function public.mark_notifications_read(p_ids uuid[])
returns integer
language sql
security definer
set search_path = ''
as $$
  with done as (
    update public.notifications set read_at = now()
    where id = any (p_ids) and recipient_profile_id = (select auth.uid()) and read_at is null
    returning 1)
  select count(*)::int from done;
$$;
revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;


-- ============================================================
-- The audit log (part 1) is read by the owner only, and never changed by anyone
-- ============================================================

grant select on public.audit_logs to authenticated;
create policy "The owner reads the audit log" on public.audit_logs
  for select to authenticated
  using ((select private.has_role('OWNER')));
