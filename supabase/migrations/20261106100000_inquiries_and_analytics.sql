-- Milcar platform, part 14: inquiries from the website, and the analytics summary.
--   submit_inquiry(p)       a visitor's booking request: the customer (found again by phone or email), their lead
--                           and, when they chose a time, the requested viewing, all or nothing. Server only.
--   analytics_summary(days) the dashboard's analytics, as the person asking (managers and the owner).


-- ============================================================
-- An inquiry from the website
-- ============================================================
-- p = { name, phone, email, locale, vehicle_slug, car_text, message, starts_at, marketing_consent }
-- The viewing's time is checked by the booking rules (opening hours, closures, notice, capacity), as for any booking.
-- Only the server calls it, after its spam check and rate limit; visitors can't reach it.

create or replace function public.submit_inquiry(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text := left(trim(coalesce(p ->> 'name', '')), 120);
  tel text := nullif(regexp_replace(coalesce(p ->> 'phone', ''), '[\s().-]', '', 'g'), '');
  mail text := nullif(lower(trim(coalesce(p ->> 'email', ''))), '');
  loc public.locale := coalesce(nullif(p ->> 'locale', ''), 'en')::public.locale;
  starts timestamptz := nullif(p ->> 'starts_at', '')::timestamptz;
  rules jsonb := private.booking_rules();
  car uuid;
  cust uuid;
  lid uuid;
  aid uuid;
  note text := left(concat_ws(E'\n', nullif(trim(coalesce(p ->> 'car_text', '')), ''), nullif(trim(coalesce(p ->> 'message', '')), '')), 2000);
begin
  if who = '' then raise exception using errcode = 'P0001', message = 'inquiry.name_required'; end if;
  if tel is null and mail is null then raise exception using errcode = 'P0001', message = 'inquiry.contact_required'; end if;
  if tel is not null and not private.is_phone(tel) then raise exception using errcode = 'P0001', message = 'inquiry.bad_phone'; end if;
  if mail is not null and not private.is_email(mail) then raise exception using errcode = 'P0001', message = 'inquiry.bad_email'; end if;

  select v.id into car from public.vehicles v
  where v.slug = nullif(p ->> 'vehicle_slug', '') and v.publication = 'published' and v.status <> 'sold';

  -- the same person comes back as the same customer: by phone first, then by email
  select c.id into cust from public.customers c where tel is not null and c.phone = tel;
  if cust is null and mail is not null then
    select c.id into cust from public.customers c where lower(c.email) = mail;
  end if;
  if cust is null then
    insert into public.customers (full_name, phone, email, preferred_locale, preferred_contact, marketing_consent, consent_at)
    values (who, tel, mail, loc, case when tel is not null then 'phone' else 'email' end,
            coalesce((p ->> 'marketing_consent')::boolean, false),
            case when coalesce((p ->> 'marketing_consent')::boolean, false) then now() end)
    returning id into cust;
  else
    -- fill in what was missing, never take someone else's phone or email
    update public.customers c set
      phone = coalesce(c.phone, case when tel is not null and not exists (select 1 from public.customers x where x.phone = tel) then tel end),
      email = coalesce(c.email, case when mail is not null and not exists (select 1 from public.customers x where lower(x.email) = mail) then mail end)
    where c.id = cust;
  end if;

  insert into public.leads (customer_id, vehicle_id, source, source_detail, locale, message)
  values (cust, car, (case when starts is null then 'website_form' else 'private_viewing' end)::public.lead_source,
          left(nullif(p ->> 'source_detail', ''), 300), loc, nullif(note, ''))
  returning id into lid;

  if starts is not null then
    insert into public.appointments (customer_id, lead_id, vehicle_id, starts_at, ends_at, status, locale, customer_note)
    values (cust, lid, car, starts, starts + make_interval(mins => (rules ->> 'slot_minutes')::int),
            (case when coalesce((rules ->> 'requires_approval')::boolean, true) then 'requested' else 'confirmed' end)::public.appointment_status,
            loc, nullif(note, ''))
    returning id into aid;
  end if;

  return jsonb_build_object('customer_id', cust, 'lead_id', lid, 'appointment_id', aid, 'vehicle_id', car);
end;
$$;
revoke all on function public.submit_inquiry(jsonb) from public, anon, authenticated;
grant execute on function public.submit_inquiry(jsonb) to service_role;


-- ============================================================
-- The analytics summary
-- ============================================================
-- Counted from the website's own events (no cookies: a visitor is an anonymous code that changes every day) and
-- from the leads. Runs as the person asking: the events' rule lets only managers and the owner read them.

create or replace function public.analytics_summary(p_days integer default 30)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with e as (
    select * from public.analytics_events where occurred_at >= now() - make_interval(days => greatest(1, least(p_days, 366)))
  )
  select jsonb_build_object(
    'days', greatest(1, least(p_days, 366)),
    'visitors', (select count(distinct visitor_hash) from e where type = 'page_view'),
    'page_views', (select count(*) from e where type = 'page_view'),
    'vehicle_views', (select count(*) from e where type = 'vehicle_view'),
    'whatsapp_clicks', (select count(*) from e where type = 'whatsapp_click'),
    'phone_clicks', (select count(*) from e where type = 'phone_click'),
    'inquiries', (select count(*) from e where type = 'inquiry'),
    'bookings', (select count(*) from e where type = 'booking_requested'),
    'new_leads', (select count(*) from public.leads l where l.created_at >= now() - make_interval(days => greatest(1, least(p_days, 366)))),
    'leads_won', (select count(*) from public.leads l where l.status = 'won' and l.closed_at >= now() - make_interval(days => greatest(1, least(p_days, 366)))),
    'by_day', coalesce((select jsonb_agg(jsonb_build_object('day', d.day, 'visitors', d.visitors, 'views', d.views) order by d.day)
                        from (select (occurred_at at time zone 'Asia/Beirut')::date as day, count(distinct visitor_hash) as visitors, count(*) as views
                              from e where type = 'page_view' group by 1) d), '[]'::jsonb),
    'top_cars', coalesce((select jsonb_agg(jsonb_build_object('slug', c.slug, 'name', c.name, 'views', c.n) order by c.n desc)
                          from (select v.slug, b.name || ' ' || v.model as name, count(*) as n
                                from e join public.vehicles v on v.id = e.vehicle_id join public.brands b on b.id = v.brand_id
                                where e.type = 'vehicle_view' group by v.slug, b.name, v.model order by n desc limit 6) c), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('source', s.src, 'visitors', s.n) order by s.n desc)
                         from (select coalesce(utm_source, referrer_host, 'direct') as src, count(distinct visitor_hash) as n
                               from e where type = 'page_view' group by 1 order by n desc limit 6) s), '[]'::jsonb),
    'devices', coalesce((select jsonb_object_agg(x.device, x.n) from (select coalesce(device, 'desktop') as device, count(distinct visitor_hash) as n
                                                                      from e where type = 'page_view' group by 1) x), '{}'::jsonb),
    'lead_sources', coalesce((select jsonb_object_agg(x.source, x.n) from (select l.source, count(*) as n from public.leads l
                                                                           where l.created_at >= now() - make_interval(days => greatest(1, least(p_days, 366)))
                                                                           group by l.source) x), '{}'::jsonb)
  );
$$;
revoke all on function public.analytics_summary(integer) from public, anon;
grant execute on function public.analytics_summary(integer) to authenticated;
