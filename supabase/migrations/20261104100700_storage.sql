-- Milcar platform, part 8 of 9: the media bucket for vehicle photos and videos, and brand logos.
--
-- Public, so the website can show a file by its address. Only inventory editors, managers and the owner upload,
-- replace or delete files. Paths: vehicles/<vehicle id>/<file>, brands/<brand id>/<file>.
-- 50 MB per file, the most Supabase's free plan allows; it can be raised on a paid plan.
-- The legacy car-photos bucket is left as it is.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;

create policy "media: staff list files" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (select private.is_staff()));

create policy "media: inventory staff upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (select private.has_role('OWNER', 'MANAGER', 'INVENTORY_EDITOR'))
              and (storage.foldername(name))[1] in ('vehicles', 'brands'));

create policy "media: inventory staff replace" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (select private.has_role('OWNER', 'MANAGER', 'INVENTORY_EDITOR')))
  with check (bucket_id = 'media' and (select private.has_role('OWNER', 'MANAGER', 'INVENTORY_EDITOR'))
              and (storage.foldername(name))[1] in ('vehicles', 'brands'));

create policy "media: inventory staff delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (select private.has_role('OWNER', 'MANAGER', 'INVENTORY_EDITOR')));
