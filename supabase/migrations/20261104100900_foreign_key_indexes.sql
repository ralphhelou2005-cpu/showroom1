-- Milcar platform, part 10: indexes on the remaining foreign keys (Supabase performance advisor, 2026-11-04).
--
-- Mostly the "who did it" columns. Without them, removing a member of staff or a lead would have to read
-- these tables in full to clear the links; with them it touches only the rows concerned.

create index if not exists analytics_events_lead_idx on public.analytics_events (lead_id) where lead_id is not null;
create index if not exists appointments_confirmed_by_idx on public.appointments (confirmed_by) where confirmed_by is not null;
create index if not exists appointments_created_by_idx on public.appointments (created_by) where created_by is not null;
create index if not exists closures_created_by_idx on public.closures (created_by) where created_by is not null;
create index if not exists customers_created_by_idx on public.customers (created_by) where created_by is not null;
create index if not exists lead_activities_actor_idx on public.lead_activities (actor_id) where actor_id is not null;
create index if not exists lead_notes_author_idx on public.lead_notes (author_id) where author_id is not null;
create index if not exists leads_created_by_idx on public.leads (created_by) where created_by is not null;
create index if not exists notifications_appointment_idx on public.notifications (related_appointment_id) where related_appointment_id is not null;
create index if not exists notifications_lead_idx on public.notifications (related_lead_id) where related_lead_id is not null;
create index if not exists site_settings_updated_by_idx on public.site_settings (updated_by) where updated_by is not null;
create index if not exists vehicle_media_created_by_idx on public.vehicle_media (created_by) where created_by is not null;
create index if not exists vehicle_status_history_changed_by_idx on public.vehicle_status_history (changed_by) where changed_by is not null;
create index if not exists vehicles_created_by_idx on public.vehicles (created_by) where created_by is not null;
create index if not exists vehicles_updated_by_idx on public.vehicles (updated_by) where updated_by is not null;
