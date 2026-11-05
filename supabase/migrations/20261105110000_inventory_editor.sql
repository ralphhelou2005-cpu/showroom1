-- Milcar platform, part 13: what the dashboard's inventory editor needs from the database.
--   save_vehicle(p)            a car with its text in each language and its specs, saved all or nothing
--   duplicate_vehicle(id)      a draft copy of a car (its text and specs; photos stay with the original)
--   reorder_vehicle_media(...)  a car's photos and videos in a new order
-- All three run as the person using them (security invoker): their role decides, exactly as for the tables.
-- And the home page's three cars become the featured ones, so the dashboard can choose them.


-- ============================================================
-- Saving a car
-- ============================================================
-- p = { id?: uuid,                       -- empty: a new car
--       vehicle: { slug, brand_id, model, variant, body_type, model_year, mileage_km, exterior_color, interior_color,
--                  previous_owners, vin, price, currency, status, publication, is_featured, featured_rank,
--                  is_sample, photo_credit },
--       translations: { en: { title, tagline, description, service_records, import_papers, seo_title, seo_description },
--                       fr: {...}, ar: {...} },
--       specs: [ { en: { label, value }, fr: {...}, ar: {...} }, ... ] }       -- in their order
-- A language whose fields are all empty is removed. Specs are rewritten only when they changed.
-- Returns the car's id. Errors keep the database's codes (vehicle.status_requires_manager, a taken address, …).

create or replace function public.save_vehicle(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  vid uuid := nullif(p ->> 'id', '')::uuid;
  v jsonb := coalesce(p -> 'vehicle', '{}'::jsonb);
  tr jsonb := coalesce(p -> 'translations', '{}'::jsonb);
  loc public.locale;
  t jsonb;
  fields text[] := array['title', 'tagline', 'description', 'service_records', 'import_papers', 'seo_title', 'seo_description'];
  wanted jsonb;
  existing jsonb;
  spec jsonb;
  n integer := 0;
  fid uuid;
  txt text;
begin
  if vid is null then
    insert into public.vehicles (slug, brand_id, model, variant, body_type, model_year, mileage_km, exterior_color, interior_color,
                                 previous_owners, vin, price, currency, status, publication, is_featured, featured_rank,
                                 is_sample, photo_credit, sort_order)
    values (v ->> 'slug', (v ->> 'brand_id')::uuid, v ->> 'model', nullif(trim(v ->> 'variant'), ''),
            (v ->> 'body_type')::public.body_type, (v ->> 'model_year')::smallint, (v ->> 'mileage_km')::integer,
            nullif(trim(v ->> 'exterior_color'), ''), nullif(trim(v ->> 'interior_color'), ''), (v ->> 'previous_owners')::smallint,
            nullif(upper(trim(v ->> 'vin')), ''), (v ->> 'price')::numeric, coalesce(nullif(v ->> 'currency', ''), 'USD'),
            coalesce(nullif(v ->> 'status', ''), 'available')::public.vehicle_status,
            coalesce(nullif(v ->> 'publication', ''), 'draft')::public.publication_status,
            coalesce((v ->> 'is_featured')::boolean, false), (v ->> 'featured_rank')::smallint,
            coalesce((v ->> 'is_sample')::boolean, false), nullif(trim(v ->> 'photo_credit'), ''),
            (select coalesce(max(x.sort_order), 0) + 10 from public.vehicles x))
    returning id into vid;
  else
    update public.vehicles set
      slug = v ->> 'slug', brand_id = (v ->> 'brand_id')::uuid, model = v ->> 'model', variant = nullif(trim(v ->> 'variant'), ''),
      body_type = (v ->> 'body_type')::public.body_type, model_year = (v ->> 'model_year')::smallint,
      mileage_km = (v ->> 'mileage_km')::integer, exterior_color = nullif(trim(v ->> 'exterior_color'), ''),
      interior_color = nullif(trim(v ->> 'interior_color'), ''), previous_owners = (v ->> 'previous_owners')::smallint,
      vin = nullif(upper(trim(v ->> 'vin')), ''), price = (v ->> 'price')::numeric,
      currency = coalesce(nullif(v ->> 'currency', ''), 'USD'),
      status = coalesce(nullif(v ->> 'status', ''), status::text)::public.vehicle_status,
      publication = coalesce(nullif(v ->> 'publication', ''), publication::text)::public.publication_status,
      is_featured = coalesce((v ->> 'is_featured')::boolean, false), featured_rank = (v ->> 'featured_rank')::smallint,
      is_sample = coalesce((v ->> 'is_sample')::boolean, false), photo_credit = nullif(trim(v ->> 'photo_credit'), '')
    where id = vid;
    if not found then
      raise exception using errcode = 'P0002', message = 'vehicle.not_found';
    end if;
  end if;

  -- featured at a position another featured car already has: it takes that place, and the cars from there on move
  -- down one (saving again at the same place moves nobody)
  if coalesce((v ->> 'is_featured')::boolean, false) and (v ->> 'featured_rank') is not null
     and exists (select 1 from public.vehicles x where x.id <> vid and x.is_featured and x.featured_rank = (v ->> 'featured_rank')::smallint) then
    update public.vehicles x set featured_rank = x.featured_rank + 1
    where x.id <> vid and x.is_featured and x.featured_rank >= (v ->> 'featured_rank')::smallint;
  end if;

  -- the text in each language
  foreach loc in array enum_range(null::public.locale) loop
    t := coalesce(tr -> loc::text, '{}'::jsonb);
    if exists (select 1 from unnest(fields) f where coalesce(trim(t ->> f), '') <> '') then
      insert into public.vehicle_translations as x (vehicle_id, locale, title, tagline, description, service_records, import_papers, seo_title, seo_description)
      values (vid, loc, nullif(trim(t ->> 'title'), ''), nullif(trim(t ->> 'tagline'), ''), nullif(trim(t ->> 'description'), ''),
              nullif(trim(t ->> 'service_records'), ''), nullif(trim(t ->> 'import_papers'), ''),
              nullif(trim(t ->> 'seo_title'), ''), nullif(trim(t ->> 'seo_description'), ''))
      on conflict (vehicle_id, locale) do update set
        title = excluded.title, tagline = excluded.tagline, description = excluded.description, service_records = excluded.service_records,
        import_papers = excluded.import_papers, seo_title = excluded.seo_title, seo_description = excluded.seo_description
      where (x.title, x.tagline, x.description, x.service_records, x.import_papers, x.seo_title, x.seo_description)
            is distinct from (excluded.title, excluded.tagline, excluded.description, excluded.service_records,
                              excluded.import_papers, excluded.seo_title, excluded.seo_description);
    else
      delete from public.vehicle_translations x where x.vehicle_id = vid and x.locale = loc;
    end if;
  end loop;

  -- the specs, in order: each language needs both a label and a value, and a spec needs at least one language
  if p ? 'specs' then
    select coalesce(jsonb_agg(s.item order by s.n), '[]'::jsonb) into wanted
    from (
      select e.n, (select jsonb_object_agg(l.k, jsonb_build_object('label', left(trim(l.v ->> 'label'), 80), 'value', left(trim(l.v ->> 'value'), 200)))
                   from jsonb_each(e.value) l (k, v)
                   where l.k in ('en', 'fr', 'ar') and coalesce(trim(l.v ->> 'label'), '') <> '' and coalesce(trim(l.v ->> 'value'), '') <> '') as item
      from jsonb_array_elements(coalesce(p -> 'specs', '[]'::jsonb)) with ordinality as e (value, n)
    ) s
    where s.item is not null;

    select coalesce(jsonb_agg(f.item order by f.sort_order), '[]'::jsonb) into existing
    from (
      select vf.sort_order, jsonb_object_agg(ft.locale, jsonb_build_object('label', ft.label, 'value', ft.value)) as item
      from public.vehicle_features vf
      join public.vehicle_feature_translations ft on ft.feature_id = vf.id
      where vf.vehicle_id = vid and vf.group_key = 'specs'
      group by vf.id, vf.sort_order
    ) f;

    if wanted is distinct from existing then
      delete from public.vehicle_features vf where vf.vehicle_id = vid and vf.group_key = 'specs';
      for spec in select value from jsonb_array_elements(wanted) loop
        n := n + 1;
        insert into public.vehicle_features (vehicle_id, group_key, sort_order) values (vid, 'specs', n * 10) returning id into fid;
        for txt in select jsonb_object_keys(spec) loop
          insert into public.vehicle_feature_translations (feature_id, locale, label, value)
          values (fid, txt::public.locale, spec -> txt ->> 'label', spec -> txt ->> 'value');
        end loop;
      end loop;
    end if;
  end if;

  return vid;
end;
$$;
revoke all on function public.save_vehicle(jsonb) from public, anon;
grant execute on function public.save_vehicle(jsonb) to authenticated;


-- ============================================================
-- Duplicating a car
-- ============================================================
-- A draft copy, available and not featured, at the end of the showroom order, with its text and specs.
-- Its address is the original's with "-copy" (then "-copy-2", …). Photos and videos aren't copied: the files
-- belong to the original car. The VIN isn't copied either: it identifies one car.

create or replace function public.duplicate_vehicle(p_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  src public.vehicles;
  new_id uuid;
  base text;
  candidate text;
  k integer := 1;
  f record;
  fid uuid;
begin
  select * into src from public.vehicles where id = p_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'vehicle.not_found';
  end if;
  base := left(src.slug, 90) || '-copy';
  candidate := base;
  while exists (select 1 from public.vehicles where slug = candidate) loop
    k := k + 1;
    candidate := base || '-' || k;
  end loop;

  insert into public.vehicles (slug, brand_id, model, variant, body_type, model_year, mileage_km, exterior_color, interior_color,
                               previous_owners, price, currency, status, publication, is_featured, is_sample, photo_credit, sort_order)
  values (candidate, src.brand_id, src.model, src.variant, src.body_type, src.model_year, src.mileage_km, src.exterior_color,
          src.interior_color, src.previous_owners, src.price, src.currency, 'available', 'draft', false, src.is_sample, src.photo_credit,
          (select coalesce(max(x.sort_order), 0) + 10 from public.vehicles x))
  returning id into new_id;

  insert into public.vehicle_translations (vehicle_id, locale, title, tagline, description, service_records, import_papers, seo_title, seo_description)
  select new_id, t.locale, t.title, t.tagline, t.description, t.service_records, t.import_papers, t.seo_title, t.seo_description
  from public.vehicle_translations t where t.vehicle_id = p_id;

  for f in select * from public.vehicle_features where vehicle_id = p_id order by group_key, sort_order loop
    insert into public.vehicle_features (vehicle_id, group_key, sort_order) values (new_id, f.group_key, f.sort_order) returning id into fid;
    insert into public.vehicle_feature_translations (feature_id, locale, label, value)
    select fid, ft.locale, ft.label, ft.value from public.vehicle_feature_translations ft where ft.feature_id = f.id;
  end loop;

  return new_id;
end;
$$;
revoke all on function public.duplicate_vehicle(uuid) from public, anon;
grant execute on function public.duplicate_vehicle(uuid) to authenticated;


-- ============================================================
-- Putting a car's photos and videos in order
-- ============================================================
-- p_ids: every one of the car's media, in the new order (the first is the main picture).

create or replace function public.reorder_vehicle_media(p_vehicle uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select count(*) from public.vehicle_media m where m.vehicle_id = p_vehicle) <> coalesce(cardinality(p_ids), 0)
     or exists (select 1 from unnest(p_ids) i where not exists (select 1 from public.vehicle_media m where m.id = i and m.vehicle_id = p_vehicle)) then
    raise exception using errcode = 'P0001', message = 'media.order_mismatch';
  end if;
  update public.vehicle_media m set sort_order = array_position(p_ids, m.id) * 10
  where m.vehicle_id = p_vehicle and m.sort_order is distinct from array_position(p_ids, m.id) * 10;
end;
$$;
revoke all on function public.reorder_vehicle_media(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_vehicle_media(uuid, uuid[]) to authenticated;


-- ============================================================
-- The featured cars: the three the home page has always shown
-- ============================================================
-- The home page's inventory teaser now shows the featured cars, first by rank. So that it looks exactly as
-- before, its three cars become the featured ones, with the descriptions their pictures have always had.
-- Only while no car is featured yet, so running this again never undoes a choice made in the dashboard.

do $$
begin
  if not exists (select 1 from public.vehicles where is_featured) then
    update public.vehicles v set is_featured = true, featured_rank = f.r
    from (values ('f8-tributo', 1), ('huracan-evo', 2), ('g63', 3)) as f (slug, r)
    where v.slug = f.slug and v.publication = 'published' and v.status <> 'sold';

    update public.vehicle_media m set alt = jsonb_build_object('en', a.alt)
    from public.vehicles v, (values ('f8-tributo', 'Red Ferrari F8 Tributo'), ('huracan-evo', 'Orange Lamborghini Huracán EVO'),
                                    ('g63', 'Black Mercedes-AMG G 63')) as a (slug, alt)
    where m.vehicle_id = v.id and v.slug = a.slug and m.alt = '{}'::jsonb
      and m.sort_order = (select min(m2.sort_order) from public.vehicle_media m2 where m2.vehicle_id = v.id);
  end if;
end;
$$;
