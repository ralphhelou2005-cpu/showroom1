-- Milcar platform, part 11: keep the new tables in step with the current admin page until it is replaced.
--
-- The live site's admin page (admin.html on main) still edits public.cars. Every change made there now copies
-- itself into the new tables: a new car, an edit (status, price, text, photos, specs) or a deletion. So the new
-- website always shows exactly what the owner set in the current admin, with the change recorded in the vehicle's
-- status history and the audit log as the person who made it.
-- When the new dashboard's inventory editor replaces the old admin (Phase 5), this mirror is switched off:
--   alter table public.cars disable trigger cars_mirror;
-- A car's address never changes here: the old admin keeps a car's id once it is created.
-- A database without the legacy table (a fresh project) gets the functions but no trigger.

-- one legacy car (a public.cars row as JSON) written into the new tables; only what changed is rewritten
create or replace function private.mirror_car(car jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  car_id text := car ->> 'id';
  brand_slug text := trim(both '-' from regexp_replace(lower(car ->> 'make'), '[^a-z0-9]+', '-', 'g'));
  brand uuid;
  vid uuid;
  img record;
  spec record;
  feature uuid;
  parts text[];
begin
  insert into public.brands (slug, name, sort_order) values (brand_slug, car ->> 'make', coalesce((car ->> 'sort_order')::int, 0))
  on conflict (slug) do nothing;
  select b.id into brand from public.brands b where b.slug = brand_slug;

  insert into public.vehicles as v (slug, legacy_id, brand_id, model, body_type, model_year, mileage_km, exterior_color,
                                    previous_owners, price, currency, status, publication, published_at, is_sample,
                                    photo_credit, sort_order, created_at)
  values (car_id, car_id, brand, car ->> 'model',
          case car ->> 'type' when 'Supercars' then 'supercar' when 'Sports cars' then 'sports_car' when 'SUVs' then 'suv' else 'other' end::public.body_type,
          (car ->> 'year')::smallint, (car ->> 'mileage_km')::int, car ->> 'color', (car ->> 'previous_owners')::smallint,
          (car ->> 'price')::numeric, 'USD', (car ->> 'status')::public.vehicle_status, 'published',
          coalesce((car ->> 'created_at')::timestamptz, now()), coalesce((car ->> 'sample')::boolean, false), car ->> 'credit',
          coalesce((car ->> 'sort_order')::int, 0), coalesce((car ->> 'created_at')::timestamptz, now()))
  on conflict (legacy_id) do update set
    brand_id = excluded.brand_id, model = excluded.model, body_type = excluded.body_type, model_year = excluded.model_year,
    mileage_km = excluded.mileage_km, exterior_color = excluded.exterior_color, previous_owners = excluded.previous_owners,
    price = excluded.price, status = excluded.status, is_sample = excluded.is_sample, photo_credit = excluded.photo_credit,
    sort_order = excluded.sort_order
  where (v.brand_id, v.model, v.body_type, v.model_year, v.mileage_km, v.exterior_color, v.previous_owners, v.price,
         v.status, v.is_sample, v.photo_credit, v.sort_order)
        is distinct from
        (excluded.brand_id, excluded.model, excluded.body_type, excluded.model_year, excluded.mileage_km, excluded.exterior_color,
         excluded.previous_owners, excluded.price, excluded.status, excluded.is_sample, excluded.photo_credit, excluded.sort_order);
  select v.id into vid from public.vehicles v where v.legacy_id = car_id;

  insert into public.vehicle_translations as t (vehicle_id, locale, tagline, service_records, import_papers)
  values (vid, 'en', car ->> 'tagline', car ->> 'service_records', car ->> 'import_papers')
  on conflict (vehicle_id, locale) do update set
    tagline = excluded.tagline, service_records = excluded.service_records, import_papers = excluded.import_papers
  where (t.tagline, t.service_records, t.import_papers) is distinct from (excluded.tagline, excluded.service_records, excluded.import_papers);

  -- photos: rewritten only when they changed, in the old admin's order (uploads point into their bucket)
  if (select coalesce(array_agg(coalesce('/storage/v1/object/public/' || m.storage_bucket || '/', '') || m.storage_path order by m.sort_order), '{}')
      from public.vehicle_media m where m.vehicle_id = vid)
     is distinct from
     (select coalesce(array_agg(coalesce((regexp_match(u.path, '(/storage/v1/object/public/[^/]+/.+)$'))[1], u.path) order by u.n), '{}')
      from jsonb_array_elements_text(coalesce(car -> 'images', '[]')) with ordinality as u (path, n)) then
    delete from public.vehicle_media m where m.vehicle_id = vid;
    for img in select u.path, u.n from jsonb_array_elements_text(coalesce(car -> 'images', '[]')) with ordinality as u (path, n) loop
      parts := regexp_match(img.path, '/storage/v1/object/public/([^/]+)/(.+)$');
      insert into public.vehicle_media (vehicle_id, kind, storage_bucket, storage_path, sort_order)
      values (vid, 'image', parts[1], coalesce(parts[2], img.path), img.n * 10)
      on conflict do nothing;
    end loop;
  end if;

  -- specs: the same, leaving out rows without a label or a value
  if (select coalesce(jsonb_agg(jsonb_build_object('label', t.label, 'value', t.value) order by f.sort_order), '[]')
      from public.vehicle_features f join public.vehicle_feature_translations t on t.feature_id = f.id and t.locale = 'en'
      where f.vehicle_id = vid and f.group_key = 'specs')
     is distinct from
     (select coalesce(jsonb_agg(jsonb_build_object('label', left(trim(e.value ->> 'label'), 80), 'value', left(trim(e.value ->> 'value'), 200)) order by e.n), '[]')
      from jsonb_array_elements(coalesce(car -> 'specs', '[]')) with ordinality as e (value, n)
      where coalesce(trim(e.value ->> 'label'), '') <> '' and coalesce(trim(e.value ->> 'value'), '') <> '') then
    delete from public.vehicle_features f where f.vehicle_id = vid and f.group_key = 'specs';
    for spec in select e.value as item, e.n from jsonb_array_elements(coalesce(car -> 'specs', '[]')) with ordinality as e (value, n) loop
      continue when coalesce(trim(spec.item ->> 'label'), '') = '' or coalesce(trim(spec.item ->> 'value'), '') = '';
      insert into public.vehicle_features (vehicle_id, group_key, sort_order) values (vid, 'specs', spec.n * 10)
      returning id into feature;
      insert into public.vehicle_feature_translations (feature_id, locale, label, value)
      values (feature, 'en', left(trim(spec.item ->> 'label'), 80), left(trim(spec.item ->> 'value'), 200));
    end loop;
  end if;
  return vid;
end;
$$;
revoke all on function private.mirror_car(jsonb) from public, anon, authenticated;

create or replace function private.mirror_car_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.vehicles v where v.legacy_id = old.id;
    return null;
  end if;
  perform private.mirror_car(to_jsonb(new));
  return null;
end;
$$;
revoke all on function private.mirror_car_change() from public, anon, authenticated;

-- switch it on, and bring everything in step now: changes made in the old admin since part 9 copied the cars
do $$
begin
  if to_regclass('public.cars') is null then
    return;
  end if;
  create or replace trigger cars_mirror after insert or update or delete on public.cars
    for each row execute function private.mirror_car_change();
  perform private.mirror_car(to_jsonb(c)) from public.cars c order by c.sort_order, c.created_at;
end;
$$;
