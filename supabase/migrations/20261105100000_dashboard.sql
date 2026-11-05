-- Milcar platform, part 12: what the dashboard reads in one go, the team list and the overview.
-- Adds two read-only functions; changes no table and no data.


-- ============================================================
-- The team page
-- ============================================================
-- Everyone's profile, plus two facts kept with the login, which the API cannot read: whether the person has
-- chosen a password yet (an invitation not yet accepted) and when they last signed in.
-- Staff see the team, as the profiles rule already allows; the owner also sees logins without a role
-- (someone who signed up on their own), so they can give them one or leave them without access.

create or replace function public.team_members()
returns table (
  id              uuid,
  email           text,
  full_name       text,
  phone           text,
  role            public.app_role,
  active          boolean,
  created_at      timestamptz,
  joined          boolean,
  last_sign_in_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.email, p.full_name, p.phone, p.role, p.active, p.created_at,
         coalesce(u.encrypted_password, '') <> '' as joined,
         u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where (select private.is_staff())
    and (p.role is not null or (select private.has_role('OWNER')))
  order by p.active desc, p.role nulls last, lower(p.full_name), lower(p.email);
$$;
revoke all on function public.team_members() from public, anon;
grant execute on function public.team_members() to authenticated;


-- ============================================================
-- The overview
-- ============================================================
-- The dashboard's first page in one request. It runs as the person asking (security invoker), so every
-- number obeys their rules: a salesperson counts their own and unassigned leads, an inventory editor sees no
-- leads or viewings at all. Viewings are counted in the showroom's time zone from the booking settings.

create or replace function public.dashboard_overview()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with tz as (
    select coalesce((select s.value ->> 'timezone' from public.site_settings s where s.key = 'booking.rules'), 'Asia/Beirut') as name
  ),
  bounds as (
    select (date_trunc('day', now() at time zone tz.name)) at time zone tz.name as today_start from tz
  )
  select jsonb_build_object(
    'inventory', (
      select jsonb_build_object(
        'on_sale',  count(*) filter (where v.publication = 'published' and v.status = 'available'),
        'reserved', count(*) filter (where v.publication = 'published' and v.status = 'reserved'),
        'sold',     count(*) filter (where v.status = 'sold'),
        'drafts',   count(*) filter (where v.publication = 'draft'),
        'archived', count(*) filter (where v.publication = 'archived'),
        'featured', count(*) filter (where v.is_featured and v.publication = 'published' and v.status <> 'sold'),
        'samples',  count(*) filter (where v.is_sample and v.publication = 'published' and v.status <> 'sold'))
      from public.vehicles v),
    'leads', (
      select jsonb_build_object(
        'open',       count(*) filter (where l.status not in ('won', 'lost')),
        'new',        count(*) filter (where l.status = 'new'),
        'mine',       count(*) filter (where l.status not in ('won', 'lost') and l.assigned_to = (select auth.uid())),
        'unassigned', count(*) filter (where l.status not in ('won', 'lost') and l.assigned_to is null),
        'due',        count(*) filter (where l.status not in ('won', 'lost') and l.next_follow_up_at <= now()),
        'won_30d',    count(*) filter (where l.status = 'won' and l.closed_at > now() - interval '30 days'))
      from public.leads l),
    'viewings', (
      select jsonb_build_object(
        'to_approve', count(*) filter (where a.status in ('requested', 'rescheduled') and a.ends_at > now()),
        'today',      count(*) filter (where a.status in ('requested', 'confirmed', 'rescheduled')
                                         and a.starts_at >= b.today_start and a.starts_at < b.today_start + interval '1 day'),
        'next_7_days', count(*) filter (where a.status in ('requested', 'confirmed', 'rescheduled')
                                         and a.starts_at >= now() and a.starts_at < now() + interval '7 days'))
      from public.appointments a, bounds b),
    'team', (
      select jsonb_build_object('active', coalesce(sum(r.n), 0), 'by_role', coalesce(jsonb_object_agg(r.role, r.n), '{}'::jsonb))
      from (select p.role, count(*) as n from public.profiles p where p.active and p.role is not null group by p.role) r),
    'recent', coalesce((
      select jsonb_agg(x order by x.changed_at desc)
      from (
        select h.changed_at, h.from_status, h.to_status, h.from_publication, h.to_publication,
               b2.name || ' ' || v.model as vehicle, v.slug,
               nullif(coalesce(nullif(p.full_name, ''), p.email), '') as changed_by
        from public.vehicle_status_history h
        join public.vehicles v on v.id = h.vehicle_id
        join public.brands b2 on b2.id = v.brand_id
        left join public.profiles p on p.id = h.changed_by
        order by h.changed_at desc
        limit 8
      ) x), '[]'::jsonb)
  );
$$;
revoke all on function public.dashboard_overview() from public, anon;
grant execute on function public.dashboard_overview() to authenticated;
