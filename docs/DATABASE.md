# The Milcar database

Supabase Postgres. The schema lives in `supabase/migrations/`, fourteen files applied once each, in name order.
They only add things: the current website's `public.cars`, `private.admins` and `car-photos` bucket are left
untouched until the new platform replaces the site. Every rule below is tested in `supabase/tests/`
(`npm run test:db`), on an in-memory Postgres set up like a Supabase project.

**Applied to the live project (`nlhjnihjvlhimmigofbx`) on 2026-11-04**, at the owner's request (no separate
staging project), part 11 later the same day, parts 12 and 13 on 2026-11-05 (`platform_12_dashboard`,
`platform_13_inventory_editor`), each with the owner's go-ahead. Part 14 isn't applied yet. The Supabase connector recorded them as `platform_01_foundation` … `platform_13_inventory_editor`
with its own version numbers, so the history differs from the file names: if the Supabase CLI is used later, run
`supabase migration repair` once to line them up. TypeScript types for every table are in `src/types/database.ts`;
regenerate them after each migration. Because there is no staging copy, anything that writes data is tested on
the in-memory database, never on the live one.

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

## The mirror (part 11): the current admin page keeps working

Until the new dashboard's inventory editor replaces it (Phase 5), the owner keeps editing the cars in the current
site's admin page, which writes to `public.cars`. A trigger copies every change into the new tables at once: a new
car, an edit (status, price, year, mileage, colour, text, photos, specs, sample flag) or a deletion. It runs as
the person who made the change, so the vehicle's status history and the audit log show who did it. It rewrites
photos and specs only when they changed. The new dashboard's inventory editor (Phase 5) shows a note on these cars: until the
switch, a change in the current admin page replaces the same details edited in the new one. Cars added in the new
editor are never touched by the mirror. On the day the new dashboard takes over (the switch, Phase 10):
`alter table public.cars disable trigger cars_mirror;`

It was needed on day one: between the copy (part 9) and Phase 3, the Range Rover was reserved and the Porsche sold
in the current admin, and the new pages still showed them as available. Applied 2026-11-04 with the owner's
go-ahead; the new tables then matched the current admin exactly.

## What the dashboard reads (part 12)

Two read-only functions; no table or data changes.

- `team_members()`: the team page. Each profile, plus two facts kept with the login that the API cannot read:
  whether the person has chosen a password yet (an invitation not yet accepted) and when they last signed in.
  Staff see everyone with a role; the owner also sees logins without one. Visitors can't call it.
- `dashboard_overview()`: the overview page in one request: cars on sale, reserved, sold, drafts, featured and
  samples; open, new, unassigned and overdue leads and recent sales; viewings to approve, today and in the next
  seven days (in the showroom's time zone); the team by role; the last eight changes to the cars and who made them.
  It runs as the person asking, so every number follows their rules: a salesperson counts their own and unassigned
  leads, an inventory editor sees no leads or viewings.

Checked on the live project after applying (read-only, as the owner and as a login without a profile, then rolled
back): visitors can't call either function; the owner's overview shows 5 cars on sale, 1 reserved, 1 sold, and the
Porsche's sale and the Range Rover's reservation among the latest changes; a login without a profile sees no team
and no history; the cars and their history unchanged. Supabase's security advisor lists `team_members()` as a
privileged function staff can call: intended, since it checks that the caller is staff and returns only whether
each person has joined and when they last signed in.

## The inventory editor (part 13)

Three functions the dashboard's inventory editor calls, each running as the person using it, so the inventory
rules and the vehicle guard decide (an inventory editor publishes but can't reserve or sell; a salesperson changes
nothing):

- `save_vehicle(p)`: a car, its text in each language and its specs, saved all or nothing. A language whose fields
  are all empty is removed; specs are rewritten only when they changed. A car featured at a position another
  featured car has takes that place, and the cars from there on move down one.
- `duplicate_vehicle(id)`: a draft copy (`-copy`, `-copy-2`, …) with the text and specs. Photos and videos stay
  with the original (their files belong to it), and the VIN isn't copied.
- `reorder_vehicle_media(vehicle, ids)`: a car's photos and videos in a new order; the first photo is the main
  picture everywhere.

And one data change, made once: the home page's inventory teaser now shows the featured cars, so the three cars
it has always shown (F8 Tributo, Huracán EVO, G 63) become featured 1 to 3, and their main photos get the
descriptions the page has always given them. Only while no car is featured, so running it again never undoes a
choice made in the dashboard. Nothing else changes.

Photos and videos are uploaded by the browser straight to the `media` bucket, as the person (the bucket's rules
decide), under `vehicles/<car id>/`: each photo as a 1500 px WebP with an 800 px copy beside it (`-800`), each video
as it is with a still (`-poster.webp`). Deleting a photo, a video or a car removes its files too.

## Inquiries and analytics (part 14)

Two functions; no table or data changes. **Not applied to the live project yet** (it goes with the switch, with the
owner's go-ahead).

- `submit_inquiry(p)`: a request from the website's booking form, saved all or nothing: the customer (found again
  by phone, then email, or added), their lead (source "website form", or "viewing request" with a time, and the car
  when the form came from a car page) and, when they chose a time, the viewing, requested or confirmed straight away
  depending on the booking rules. The time goes through the same checks as any booking (opening hours, closures,
  notice, how many at once), and their `booking.*` errors tell the form what to say. Only the server can call it
  (`service_role`), after its trap field, rate limits and spam check; visitors and staff can't.
- `analytics_summary(days)`: the Analytics page for the last 7, 30 or 90 days: visitors, pages, cars seen, taps on
  WhatsApp and phone, each day (in the showroom's time zone), the most seen cars, where visitors came from, their
  devices, new and won leads and where leads came from. It runs as the person asking, and only managers and the owner
  may read the website's events, so others get zeros.

The events themselves (`analytics_events`, from part 3) are written by the server only, with an anonymous code per
visitor and day (README, Analytics).

## Copying the current cars

`20261104100800_copy_legacy_cars.sql` copies `public.cars` into the new tables without changing it: same
addresses (`vehicles.slug` = the old id), English text, photo order and spec order. Run again, it only copies
cars added since. On today's data it creates six brands from the makes, including "GT3 RS" (the Porsche's make
and model are swapped in the current data: correct it in the dashboard after the switch).

## Adding a migration later

Never to the live project without a backup and the owner's go-ahead.

1. Write the next file in `supabase/migrations/` (never edit one that has been applied).
2. `npm run test:db` until every test passes, with new tests for the new rules.
3. Snapshot what the change touches, apply it (Supabase connector, `supabase db push`, or the SQL editor),
   then check the data, the API as a visitor, Supabase's advisors and the live site.
4. Regenerate `src/types/database.ts`.

## Supabase advisors after part 10 (2026-11-04)

- Security, intended: `private.admins` and `private.rate_limits` have no rules because nothing outside the
  database may reach them; `available_slots` is open to visitors on purpose (it lists free times only);
  `mark_notifications_read` only touches the caller's own messages.
- Security, the owner's setting: leaked-password protection is off (Supabase > Authentication > settings).
- Performance: seven tables give staff two read rules where one would do (the inventory, settings, hours and
  closures "write" rules also cover reading). Harmless at this size. Splitting them into separate insert / update /
  delete rules means dropping the old ones, which the Supabase connector refuses, so it is a later migration run
  from the SQL editor. "Unused index" notes are normal for a new database.
