-- Milcar platform, part 9 of 9: copy the legacy site's cars into the new tables.
--
-- Reads public.cars and never changes it, so the current website keeps running on it until the switch.
-- Each car keeps its address (vehicles.slug = cars.id, so /car/f8-tributo still works) and its id is kept in
-- vehicles.legacy_id. The English text becomes the 'en' translation; specs keep their order; photos keep their
-- order. Cars are copied as they are today, sample flag included. Running it again copies only new cars.
-- A database without the legacy table (a fresh staging project) skips this part.

do $$
declare
  car record;
  new_id uuid;
  img record;
  spec record;
  feature uuid;
  parts text[];
begin
  if to_regclass('public.cars') is null then
    return;
  end if;

  -- one brand per make, in the order the cars were shown
  insert into public.brands (slug, name, sort_order)
  select trim(both '-' from regexp_replace(lower(c.make), '[^a-z0-9]+', '-', 'g')), min(c.make), min(c.sort_order)
  from public.cars c
  group by 1
  on conflict (slug) do nothing;

  for car in select * from public.cars c
             where not exists (select 1 from public.vehicles v where v.legacy_id = c.id or v.slug = c.id)
             order by c.sort_order, c.created_at
  loop
    insert into public.vehicles (slug, legacy_id, brand_id, model, body_type, model_year, mileage_km, exterior_color,
                                 previous_owners, price, currency, status, publication, published_at, is_sample,
                                 photo_credit, sort_order, created_at)
    values (car.id, car.id,
            (select b.id from public.brands b where b.slug = trim(both '-' from regexp_replace(lower(car.make), '[^a-z0-9]+', '-', 'g'))),
            car.model,
            case car.type when 'Supercars' then 'supercar' when 'Sports cars' then 'sports_car' when 'SUVs' then 'suv' else 'other' end::public.body_type,
            car.year, car.mileage_km, car.color, car.previous_owners, car.price, 'USD',
            car.status::public.vehicle_status, 'published', car.created_at, car.sample,
            car.credit, car.sort_order, car.created_at)
    returning id into new_id;

    insert into public.vehicle_translations (vehicle_id, locale, tagline, service_records, import_papers)
    values (new_id, 'en', car.tagline, car.service_records, car.import_papers);

    for img in select u.path, u.n from unnest(car.images) with ordinality as u (path, n) loop
      parts := regexp_match(img.path, '/storage/v1/object/public/([^/]+)/(.+)$');
      insert into public.vehicle_media (vehicle_id, kind, storage_bucket, storage_path, sort_order)
      values (new_id, 'image', parts[1], coalesce(parts[2], img.path), img.n * 10)
      on conflict do nothing;
    end loop;

    for spec in select e.value as item, e.n from jsonb_array_elements(car.specs) with ordinality as e (value, n) loop
      continue when coalesce(trim(spec.item ->> 'label'), '') = '' or coalesce(trim(spec.item ->> 'value'), '') = '';
      insert into public.vehicle_features (vehicle_id, group_key, sort_order) values (new_id, 'specs', spec.n * 10)
      returning id into feature;
      insert into public.vehicle_feature_translations (feature_id, locale, label, value)
      values (feature, 'en', left(trim(spec.item ->> 'label'), 80), left(trim(spec.item ->> 'value'), 200));
    end loop;
  end loop;
end;
$$;
