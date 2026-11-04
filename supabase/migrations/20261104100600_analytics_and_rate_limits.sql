-- Milcar platform, part 7 of 9: first-party analytics and rate limits.
--
-- Analytics: the server records what visitors do (pages, car views, inquiries, WhatsApp clicks, bookings) with no
-- cookies and no personal data. A visitor is a hash of their IP address and browser with a salt that changes
-- every day, so a person is counted once a day and can never be followed from one day to the next.
-- Everything shown on the dashboard is counted from these rows; nothing is estimated or invented.

create table public.analytics_events (
  id            uuid primary key default gen_random_uuid(),
  occurred_at   timestamptz not null default now(),
  type          text not null check (type in ('page_view', 'vehicle_view', 'inquiry', 'whatsapp_click', 'phone_click',
                                              'booking_requested', 'booking_confirmed', 'lead_won')),
  path          text check (char_length(path) <= 300),
  locale        public.locale,
  vehicle_id    uuid references public.vehicles (id) on delete set null,
  lead_id       uuid references public.leads (id) on delete set null,
  visitor_hash  text check (visitor_hash ~ '^[0-9a-f]{64}$'),
  referrer_host text check (char_length(referrer_host) <= 253),
  utm_source    text check (char_length(utm_source) <= 100),
  utm_medium    text check (char_length(utm_medium) <= 100),
  utm_campaign  text check (char_length(utm_campaign) <= 100),
  device        text check (device in ('mobile', 'tablet', 'desktop')),
  country       char(2) check (country ~ '^[A-Z]{2}$')
);
create index analytics_events_type_idx on public.analytics_events (type, occurred_at desc);
create index analytics_events_vehicle_idx on public.analytics_events (vehicle_id, occurred_at desc) where vehicle_id is not null;
create index analytics_events_time_idx on public.analytics_events (occurred_at desc);

alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon, authenticated;
grant select on public.analytics_events to authenticated;
create policy "Managers read analytics" on public.analytics_events
  for select to authenticated
  using ((select private.has_role('OWNER', 'MANAGER')));


-- ============================================================
-- Rate limits for the public forms and the event endpoint
-- ============================================================
-- Kept in the private schema, which the API cannot reach. Only the server (service role) calls the function.

create table private.rate_limits (
  key          text not null check (char_length(key) <= 200),
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (key, window_start)
);
alter table private.rate_limits enable row level security;
revoke all on private.rate_limits from public, anon, authenticated;

-- counts one more request for `p_key` in the current window; true while it is still within `p_max`
create or replace function public.hit_rate_limit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  win timestamptz;
  n integer;
begin
  if p_window_seconds is null or p_window_seconds not between 1 and 86400 or p_max is null or p_max < 1 then
    raise exception using errcode = '22023', message = 'rate_limit.bad_arguments';
  end if;
  win := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into private.rate_limits as r (key, window_start, hits) values (p_key, win, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into n;
  if random() < 0.01 then
    delete from private.rate_limits where window_start < now() - interval '1 day';
  end if;
  return n <= p_max;
end;
$$;
revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
