# The Milcar database

Supabase Postgres. The schema lives in `supabase/migrations/`, nine files applied once each, in name order.
They only add things: the current website's `public.cars`, `private.admins` and `car-photos` bucket are left
untouched until the new platform replaces the site. Every rule below is tested in `supabase/tests/`
(`npm run test:db`), on an in-memory Postgres set up like a Supabase project.

## Tables

| Area | Table | What it holds |
|---|---|---|
| Team | `profiles` | One per login: name, email, phone, **role**, active, language. A login without a role can do nothing. |
| Inventory | `brands` | Name, address name (slug), description in three languages, logo, order. |
| | `vehicles` | Address name (`/car/<slug>`), brand, model, body type, year, mileage, colours, owners, VIN, price and currency, **status** (available / reserved / sold), **publication** (draft / published / archived), featured and its rank, sample flag, photo credit, order, who created and changed it. |
| | `vehicle_translations` | Per language: title, tagline, description, service records, import papers, SEO title and description. |
| | `vehicle_media` | Photos and videos in order (the first is the main picture), alt text in three languages, size, poster for videos. |
| | `vehicle_features`, `vehicle_feature_translations` | Specs and equipment in order, with the label and value in each language. |
| | `vehicle_status_history` | Every status and publication change, with who and when. Written automatically. |
| CRM | `customers` | Name, email, phone (international form), language, preferred contact, marketing consent and its date. One customer per email and per phone. |
| | `leads` | One customer's interest (usually in one car): source, status, assigned salesperson, message, next follow-up, closing date. |
| | `lead_notes` | Notes on a lead, signed by their author. |
| | `lead_activities` | The lead's history: created, status and assignment changes, follow-ups, notes, appointments (all automatic), plus calls and messages staff log. Never edited. |
| Booking | `business_hours` | Opening periods per weekday, in showroom time. **Empty until the owner enters them: nothing can be booked before.** |
| | `closures` | Days or hours the showroom is closed. |
| | `appointments` | Private viewings: customer, lead, car, salesperson, start and end, status (requested / confirmed / rescheduled / cancelled / completed / no-show), notes, who confirmed it. |
| Platform | `site_settings` | Business details (empty until the owner fills them; empty details are not shown), booking rules, integration switches (all off). |
| | `notifications` | Every email or in-app message: queued, sent (only once the provider accepted it), failed or skipped, with the reason. |
| | `audit_logs` | Who changed what, before and after, on every admin table. Owner-only, never editable. |
| | `analytics_events` | Page views, car views, inquiries, WhatsApp and phone clicks, bookings, won leads. No cookies; visitors are an anonymous daily hash. |
| | `private.rate_limits` | Request counts for the public forms. Not reachable from the API. |

Storage: the public `media` bucket (`vehicles/<id>/…`, `brands/<id>/…`), images and videos up to 50 MB each.

## Who can do what

Checked three times: the dashboard hides what a role cannot use, the server checks the role before every
action, and the database rules (row level security) refuse it regardless.

| | Owner | Manager | Salesperson | Inventory editor | Visitor |
|---|---|---|---|---|---|
| Published, unsold cars and brands | ✔ | ✔ | ✔ | ✔ | ✔ |
| Drafts, sold and archived cars | ✔ | ✔ | see | see | – |
| Add and edit listings, photos, specs, text; publish | ✔ | ✔ | – | ✔ | – |
| Reserve or sell a car | ✔ | ✔ | – | – | – |
| Delete a car or brand | ✔ | ✔ | – | – | – |
| Leads and customers | all | all | assigned to them, plus unassigned ones to pick up | – | – |
| Assign a lead to someone else | ✔ | ✔ | – | – | – |
| Notes | all | all | on their leads; edit their own | – | – |
| Appointments | all | all | theirs and their leads' | – | free times only |
| Confirm an appointment | ✔ | ✔ | – (moving a confirmed one sends it back for approval) | – | – |
| Opening hours and closures | ✔ | ✔ | – | – | opening hours |
| Settings | ✔ | – | – | – | public ones |
| Team: roles, access | ✔ | see the team | see the team | see the team | – |
| Analytics | ✔ | ✔ | – | – | – |
| Audit log | ✔ | – | – | – | – |

There is always at least one active owner: the last one cannot be demoted, switched off or deleted.

## What the database enforces by itself

- **Bookings** must fall inside opening hours, outside closures, and (from the website) at least
  `min_notice_hours` ahead and at most `max_days_ahead` ahead. No more than `max_parallel` viewings at once
  (checked one booking at a time, so two visitors can never take the last place together), never two viewings
  of the same car or for the same salesperson at the same time.
  `available_slots(from, to, vehicle)` lists free times for the booking page without revealing any booking.
- **Contact details**: phone numbers in international form (`+9613123456`), valid emails, at least one of them.
- **Text in three languages** only uses the keys `en`, `fr`, `ar`.
- **Histories** (status changes, lead activity, audit log) are written by triggers and cannot be edited.
- **Errors** come back as stable codes the website translates, e.g. `booking.slot_full`,
  `booking.outside_opening_hours`, `vehicle.status_requires_manager`, `profile.last_owner`.

## Copying the current cars

`20261104100800_copy_legacy_cars.sql` copies `public.cars` into the new tables without changing it: same
addresses (`vehicles.slug` = the old id), English text, photo order and spec order. Run again, it only copies
cars added since. On today's data it creates six brands from the makes, including "GT3 RS" (the Porsche's make
and model are swapped in the current data: correct it in the dashboard after the switch).

## Applying the migrations

Never to production without a backup and the owner's go-ahead. Order of use:

1. Local: `npm run test:db` (no setup needed).
2. Staging: a separate free Supabase project. `npx supabase link --project-ref <staging ref>` then
   `npx supabase db push`, or paste each file into the SQL editor in name order.
3. Production, at the switch (Phase 10): back up first, then the same command against the production project.
