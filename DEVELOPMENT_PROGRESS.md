# Development progress

The Milcar platform, built on the `platform` branch in ten phases, each tested and reported before the next.
The live website (`main`, GitHub Pages) does not change until Phase 10, and only with the owner's go-ahead.

| # | Phase | Status |
|---|---|---|
| 1 | Audit and plan | ✅ Done 2026-11-04 |
| 2 | Architecture and database | ✅ Done 2026-11-04 |
| 3 | Public website | ✅ Done 2026-11-04 |
| 4 | Logins and dashboard | ✅ Done 2026-11-05 |
| 5 | Inventory CMS | ✅ Done 2026-11-05 |
| 6 | CRM | ✅ Done 2026-11-05 |
| 7 | Booking and WhatsApp | ✅ Done 2026-11-05 (WhatsApp links; the Business API isn't built) |
| 8 | Languages (full French and Arabic, right to left) | ✅ Done 2026-11-05 (a native speaker should read them) |
| 9 | Analytics, SEO and security | ✅ Done 2026-11-05 |
| 10 | Testing, launch and documentation | Tested and documented; the launch waits for the owner's decisions below |

## Phases 6 to 10, together (2026-11-05)

At the owner's request ("do it all in one phase and fast"), the last five phases were built and tested as one.

**Done**
- **Leads** (`/admin/leads`): every inquiry with filters (status, source, who has it, follow-ups due, search) and a
  CSV of what is shown; a lead page with the customer (call and WhatsApp buttons), the car, status, who has it, the
  next follow-up, notes, a history of calls and messages (logging a call moves a new lead to "Contacted"), and its
  viewings, booked from there. Staff add leads from a call or a visit.
- **Viewings** (`/admin/viewings`): a diary (to approve, each day ahead, the last 30 days); confirm (managers and the
  owner), move, done, didn't come, cancel with a reason. The customer is emailed once email is connected.
- **Customers** (`/admin/customers`): the list with a CSV, and each customer's details, leads and viewings.
- **Settings** (`/admin/settings`): the showroom's details (they appear on the website as soon as they are saved;
  nothing shows while they are empty), opening hours, closed days, booking rules, who gets the new-inquiry emails, and
  for the owner what is connected. WhatsApp Business, Google Calendar and error tracking say plainly that they aren't
  built yet.
- **The booking form works**: on the server (trap field, rate limits, Turnstile once connected), saved in one step by
  the database (`submit_inquiry`, part 14), the team emailed, and the visitor told plainly what happens next. Free
  times appear once opening hours are set. The form keeps what was typed after an error. Without the server key it
  says it isn't connected and offers WhatsApp, instead of pretending (the current site's form sends nothing).
- **Email** through Resend once its two settings are set; every email is recorded as sent, failed or not sent.
- **French and Arabic**: every word of the public site in three languages (`src/i18n/words.ts`), `/fr` and `/ar`,
  language links in the footer, the page titles and descriptions per language with their alternates. Arabic right
  to left (`src/styles/rtl.css`) with Amiri and IBM Plex Sans Arabic, downloaded only for Arabic letters; English car
  text, specs and phone numbers read left to right inside it; the usual spec names translate themselves.
- **Analytics** without cookies (`/admin/analytics`, managers and the owner): visitors, pages and cars seen, taps on
  WhatsApp and phone, each day, the most seen cars, where visitors and leads came from.
- **Search engines**: `/sitemap.xml` (every page and car in three languages), `/robots.txt`, the business and each
  car described for search results.
- **Security**: a content security policy in production; the booking form behind the server; `submit_inquiry` for the
  server only.
- **Backups**: a nightly encrypted copy of the database by GitHub Actions, once its two secrets are set (README).
- Database part 14 with 8 tests (117 in all). Phone numbers show as people write them (+961 1 234 567).
- **Fixed on the way**: once three languages were routed, the nav's underline for the page you're on went missing
  from the built English pages (they are built at `/en/…` and the nav didn't recognise that address); caught by the
  picture comparison.
- **Docs**: README (dashboard, booking, languages, analytics, search engines, backups, security, going live),
  docs/DATABASE.md part 14, `.env.example` (only settings the code reads).

**Checked**
- 41 new end-to-end checks (`e2e/crm.e2e.ts`): the booking form without and with opening hours (a phone without its
  country code refused, the lead and customer saved with the car, the team's email recorded as not sent, a robot
  thanked and nothing saved, a time chosen and requested), settings, the contact page and footer showing the
  details, approving a viewing, leads (notes, history, assigning, follow-ups, status), customers, both CSV files, a
  salesperson's limits, analytics, the French and Arabic pages (phone width, no sideways scrolling) and the sitemap.
- The 60 checks of Phase 4 and the 50 of Phase 5 still pass; 117 database tests; production build.
- The English site against the current one: all 48 picture comparisons identical, the walk-in handover and the
  platform smoke test pass, and of the 26 interactions only the booking form differs, on purpose (it now really
  sends, and says so when it can't). The French, Arabic and dashboard pages load under the production security
  policy without errors.

**Not done yet / carried forward**
- Database part 14 isn't applied to the live project (it waits for the owner's go-ahead, with the switch).
- Not built: automatic WhatsApp messages (WhatsApp Business API, which also needs Meta to approve a template), copying
  viewings to Google Calendar, reminder emails before a viewing, error tracking. Settings says so; WhatsApp links and
  buttons work everywhere.
- Splitting the seven staff "write" rules that also cover reading (docs/DATABASE.md, advisors): a later migration run
  from the SQL editor.
- Equipment lists and history lines in the car editor (from Phase 5).
- The launch itself: the decisions below, then README → Going live.

## Phase 5: inventory CMS (2026-11-05)

**Done**
- **Inventory** (`/admin/inventory`): every car whatever its state, in the website's order, with search, "Shown" and
  "Status" filters, and arrows to move a car in the order. Each line shows the main photo, year, price, number of
  photos and videos, and tags (on the website, draft, archived, reserved, sold, featured and its position, sample).
- **The car editor**: brand (a new brand can be added on the spot), model, version, body type, year, mileage,
  colours, previous owners, VIN (never shown publicly), price or "Price on request", currency, photo credit, and the
  address on the website (made from brand, model and year). The words in English, French and Arabic (Arabic written
  right to left; anything left empty shows the English): name, tagline, description, service records, import papers,
  search-engine title and description, each with its length limit. Specs in each language, added, ordered and
  removed. "On the website": draft, on the website or archived; available, reserved or sold; featured on the home
  page at a position; sample listing. Saving is all or nothing; leaving with unsaved changes asks first; on a phone
  a save bar appears with unsaved changes.
- **Photos and videos**: chosen or dropped, prepared in the browser (photos become a 1500 px WebP and an 800 px copy,
  the website's own sizes; a video gets a still and its length) and uploaded straight to the media bucket as the
  person. A description per photo in each language, the order (the first photo is the main picture), "Make main",
  and removal (with its files). Files that aren't photos or videos, too large, or too small are refused with the
  reason.
- **Duplicate** a car as a draft (text and specs; not its photos or VIN), **archive** it, or **delete** it with its
  files (managers and the owner).
- **Brands** (`/admin/brands`): add, rename, the words on the brand's page in three languages, show or hide, order;
  a manager or the owner deletes a brand without cars.
- **Roles**: an inventory editor adds, edits, publishes and duplicates, but can't reserve, sell or delete; a
  salesperson sees every car and its details without changing anything; managers and the owner do everything.
- **The website follows at once**: every change rebuilds the public pages on their next visit. The home page's three
  cars are now the featured ones (by position, then the next cars on show); the car page's gallery plays videos
  with their controls. A car without videos, and the home page with its three cars, look exactly as before.
- Cars from the current admin page carry a note: until the switch, changes made there replace these. The mirror
  stays on until the new dashboard is in use (docs/DATABASE.md).
- Database part 13: `save_vehicle()`, `duplicate_vehicle()`, `reorder_vehicle_media()`, and the three featured cars
  (with their photos' descriptions). 13 new database tests.
- The local stand-in for Supabase now also answers nested reads like the public pages make, and file storage
  (uploads with the bucket's rules and limits, public addresses, deletes), so the whole path is tested.

**Checked**
- 50 new end-to-end checks (`e2e/inventory.e2e.ts`): a new car from draft to its public page with text in English
  and Arabic, specs, two photos and a video (sizes, 800 px copies, still, length), the main picture, descriptions,
  publishing, featuring (it leads the home page with its photo's description), reserving (the website's tag), the
  history and the overview; an inventory editor (can't reserve, sell or delete; duplicates; a taken address and a
  wrong VIN refused; adds a brand); a salesperson (sees, changes nothing); removing a video, deleting cars and their
  files, brands, the note on cars from the current admin page; no sideways scrolling on a phone; no browser errors.
- The 60 checks of Phase 4 still pass; 109 database tests; production build.
- The public site against the current one, rebuilt after part 13 went live: all 48 picture comparisons identical
  (the home page's three cars included; a first run right after starting the servers caught the nav underline still
  animating, as before), 26 interactions identical, 36 end-to-end checks on a computer and a phone, the walk-in
  handover. Before part 13, only the home page's three cars differed, as expected.

**Applied to the live project (2026-11-05)**, with the owner's go-ahead: database part 13. Checked afterwards: the
three home page cars featured 1 to 3 with their photos' descriptions; 7 cars, 13 photos and 9 history lines as
before; visitors can't call the three functions; a login without a role was refused a duplicate. Types regenerated:
unchanged from the ones written by hand.

**Not done yet / carried forward**
- Equipment lists and history lines (the database has room for them beside the specs) aren't in the editor yet: the
  car page shows specs only.
- The mirror is switched off at the switch (Phase 10).

## Phase 4: logins and dashboard (2026-11-05)

**Done**
- **The doors** (`/admin/login`, `/admin/forgot`): sign in with email and password; a forgotten password by email.
  Wrong details, too many attempts and switched-off logins each get a plain answer, and none reveals whether an
  email has a login. Signed-in staff skip the login page; others are sent to it and brought back where they were.
- **Invitations** (Team, owner only): a name, an email, a role and optionally a mobile. The server creates the
  login, the owner's own login gives the role (so the audit log records who), and the owner gets a one-time link
  to copy or send by WhatsApp (opened straight to that person when the mobile is given). The link opens a page with
  a Continue button, and only the button uses it up: WhatsApp's link preview opens the link first and would
  otherwise spend it. The person then chooses their password and lands on their overview.
- **Roles and access** (Team, owner only): change a role, switch someone off or on (switched off, they lose
  access at once and can't sign in again), make a new sign-in link for someone who forgot their password. The
  owner has no controls on their own line, and the database keeps at least one owner. Everyone else sees the team
  and what each role can do, read-only.
- **The overview**: a greeting, then the day's figures, each under the person's own rules: cars on sale (with
  reserved, drafts, sold), open leads (a salesperson's own), follow-ups due, viewings in the next seven days and
  requests to approve, the team by role, and the latest changes to the cars with who made them. Managers are told
  how many sample cars the website shows. An inventory editor sees the cars only. Empty figures say so plainly.
- **Your account**: name, mobile, language for messages; change password (the current one is checked first).
- Logins without a role see "No access yet"; switched-off people see that their access is off. The menu lists only
  the pages that exist.
- Database part 12 (two read-only functions, `team_members()` and `dashboard_overview()`), with 11 tests.
- A local stand-in for Supabase (`e2e/fake-supabase.ts`): Auth and the data API on the in-memory database with
  every migration, so logins, invitations and role changes are tested without touching the live project.

**Checked**
- 60 end-to-end checks in Chrome at 1440 px and 375 px (`npm run test:e2e`): every door, wrong and missing
  details, the invitation from form to first sign-in on a phone, the link working once and surviving a preview,
  roles changing what people see, switching off and on, new sign-in links, the forgotten-password email, account
  changes, a login without a role, sign-out, no sideways scrolling on a phone, no browser errors.
- 96 database tests (11 new). Production build passes.
- The public site is unchanged: 48 picture comparisons with the current site identical on reruns (one walk-in
  moment differed once from timing, as before; the home page's code is untouched), 26 interactions, 36 end-to-end
  checks on a computer and a phone.
- Found and fixed during testing: the site's own `.grid` class (the car grid) clashed with Tailwind's `grid`
  (new screens write `[display:grid]`, noted in `globals.css`); forms emptied themselves after an error (they now
  keep what was typed, except passwords).

**Applied to the live project (2026-11-05)**, with the owner's go-ahead: database part 12, checked read-only as
the owner and as a login without a profile (docs/DATABASE.md). Types regenerated: unchanged from the ones written
by hand.

**Not done yet / carried forward**
- The dashboard isn't online: it needs hosting (decision 1) and `SUPABASE_SECRET_KEY` in the server's settings.
- Supabase settings to make once (README, "Supabase settings the dashboard needs"): the redirect address, sign-ups
  off, the reset-password email link.
- Password emails reach staff only once an email service is connected (decision 4); until then the owner sends a
  new sign-in link from Team.
- The dashboard is in English; its French and Arabic come with Phase 8.
- Two-step sign-in (an authenticator app) is possible with Supabase and can be added in Phase 9 if wanted.

## Phase 3: public website (2026-11-04)

**Done**
- The showroom moved into Next.js with its look unchanged: the home page (walk-in, featured windows, the promise,
  hold-to-build, the inventory teaser, the three steps, the questions, the booking form), the inventory, every car
  page, the featured page and the not-found pages. Every page is built ahead of time and refreshed in the background
  at most every five minutes; a car added since opens on its first visit. The cars come from the new tables.
- New pages: **Brands** (the makers with cars on show), a page per brand, **About** (in the site's own words: the
  promise and the three steps), **Contact** (shows only the details the owner has entered, then the booking form),
  **Private viewing**.
- Inventory filters: body type (as before), brand and order, kept in the address so a filtered list can be shared.
- The footer's placeholder text ("Address and opening hours go here.") is gone: it shows the details entered in the
  settings, and links to the pages meanwhile.
- The current site's addresses keep working (`car.html?id=…`, `inventory.html`, `featured.html`, `index.html`).
  A sold or unknown car shows "We couldn’t find that car" with a real 404.
- **The mirror** (database part 11): the current admin page keeps working, and every change made there appears in
  the new tables at once. Needed straight away: the Range Rover had been reserved and the Porsche sold since the
  copy. Applied with the owner's go-ahead.
- The walk-in starts from its own small script (`public/engine/home.js`, built from `src/lib/home.ts`) as soon as
  the page's HTML is in, instead of waiting for all of Next.js; React adopts it when it takes over the page.
- The translation library stays out of the browser's script (words are prepared on the server); `src/i18n/link.tsx`
  keeps links in the visitor's language.
- Pictures stay in `src/assets` (a generated list finds them by their plain path); videos in `public/assets`.
- On this branch, the current site's Vite-only files and its GitHub Pages workflow are gone (they stay on `main`,
  which keeps publishing the live site); a merge would no longer publish anything until Vercel takes over.

**Checked**
- 48 pixel comparisons against the current site (built from `main` and served locally, so both load equally fast)
  at 375, 768 and 1440 px: the walk-in at six moments, every home section, the inventory, a car page and the
  featured page. All 48 identical (the footer and the new filter row, changed on purpose, hidden on both).
- 26 interactions run on both sites with identical results, on a computer and a phone (hold-to-build and the
  colour picker, the window labels, the questions, the booking form, the filters, the photos, the specs).
- 36 end-to-end checks on the platform, on a computer and a phone: every page and its title, refreshes, the new
  filters and their addresses, Back keeping the place, the brands, the about page's reveals, the contact page
  showing nothing invented, old addresses, 404s, the car page's booking link, no console errors.
- 12 checks of the walk-in's early start: started once, adopted by React, stopped on leaving, restarted on return.
- 85 database tests, the mirror's included.
- Speed at the owner's connection (3.6 Mbps): on a phone the walk-in's engine now starts earlier than on the
  current site (about 1.0 s against 1.0–1.65 s) and the walk-in is ready at the same time (2.5–2.7 s against
  2.4–3.0 s); on a computer it is ready about 0.2 s later (2.02 s against 1.78 s, median of nine): the share of
  Next.js's own router code. The first picture appears sooner on the platform, since pages arrive drawn.
- Lighthouse mobile (median of three, both sites served locally): home 92 (current 97), inventory **88**
  (current 99), car 94 (94), featured 95 (94), brands 93, about 94, contact 96, private viewing 96; accessibility,
  best practices and SEO 100 everywhere. The inventory's "render delay" is explained below (speed follow-up).

**Speed follow-up (2026-11-05)**
- Fixed: every link back to the home page fetched it ahead, and with it the walk-in's film and first picture
  (about 680 KB on a phone): every other page downloaded them in the background, taking the connection from its
  own photos (about 1.5 s of the owner's 3.6 Mbps line). Links to the home page now load it on the click
  (`src/i18n/link.tsx`), as on the current site; the walk-in starts as before.
- Found: the late paint in Lighthouse is not the animation or our code. Chrome 155 holds the first paint while
  preloaded web fonts load (its "render-blocking fonts" rule), and in Lighthouse's freshly started browser that
  hold often lasts until 1.2–2.2 s on the platform's pages. With the rule switched off, the inventory paints at
  0.2–0.4 s and scores 93. Removing the font preloads or Next.js's stand-in fonts does not stop it, so no font
  setting on our side controls it. In an open browser loading the page fresh, which is how visitors arrive,
  both sites paint in 0.1–0.3 s; in freshly started browsers outside Lighthouse both paint at about 0.6 s, with
  occasional slow loads on both.
- The rest of the gap is the size of Next.js's own code (about 145 KB, against 93 KB for the current site):
  without any script the inventory scores 98. Lighthouse counts it because the page's first paint follows it.
- Scores on this computer swing by 5–10 points between runs and between sessions (on 2026-11-05 the current
  site's inventory scored 93–99 and the platform's 75–91). The reliable number comes from PageSpeed Insights on
  the hosted preview (Phase 4), which runs on Google's servers.
- Rerun after the fix: 48 pixel comparisons (one walk-in moment differed in the first pass and matched in the
  rerun: a timing difference), 26 interactions, 36 end-to-end checks on a computer and a phone, the walk-in
  handover, 8 new checks that the home links open the home page and download its film only on the click, 85
  database tests. Walk-in at 3.6 Mbps: computer ready at 1.65–2.01 s (current site 1.94–2.24 s); phone engine
  started at 1.0 s and the walk-in ready at 2.65–2.75 s (current site 1.0–1.7 s and 2.5 s).

**Not done yet / carried forward**
- The booking form still says plainly that nothing was sent: the booking system connects it in Phase 7.
- French and Arabic open in Phase 8 (`/fr` and `/ar` are 404s until then).
- Contact details and opening hours are empty until the owner provides them (decision 5); they then appear in the
  footer and on the contact page by themselves.
- The featured windows and the home teaser still name the cars painted in their pictures.
- Uploaded photos get their 800 px copies from the inventory editor in Phase 5.
- The old github.io addresses forward to the new domain at the switch (Phase 10).

## Phase 2: architecture and database (2026-11-04)

**Done**
- Database in nine migrations (`supabase/migrations/`), described in [docs/DATABASE.md](docs/DATABASE.md):
  all sixteen tables asked for, plus opening hours, closures, analytics events and rate limits; UUID keys,
  foreign keys, indexes, checks; the four roles with row level security on every table; automatic histories
  (status changes, lead activity, audit log); booking rules enforced by the database (opening hours, closures,
  notice, capacity, no double bookings) and a free-times function for the booking page; the `media` bucket.
- Copy of the 7 current cars into the new tables, leaving the current `cars` table untouched.
- 75 database tests (`npm run test:db`), on today's live data and on an empty project, all passing. They found
  and fixed three real problems before any database saw the SQL: the server could not reach the role checks
  (bookings from the website would have failed), a booking ending before it started gave a confusing error,
  and the rate limiter crashed on a zero-length window.
- Next.js 16 foundation: English / French / Arabic routing with right-to-left Arabic, Supabase connections
  (visitor, staff, server-only), settings checked at start-up, secrets kept server-only, security headers,
  the dashboard's login door (`/admin` without a login goes to `/admin/login`), Tailwind on the site's own
  design values without its reset, the site icon.
- The current site still builds byte-for-byte identically (all 105 files), and its GitHub Pages workflow now
  calls `npm run legacy:build`, so nothing changes for the live site even if this branch were merged early.
- README.md, .env.example, docs/DATABASE.md.

**Checked**: 32 browser checks at 375 and 1440 px (languages, direction, fonts, spacing, redirects, headers,
dashboard door, no errors).

**Applied to the live Supabase project (2026-11-04)**, at the owner's choice instead of a staging project:
backup snapshot first, the nine files one at a time, then a tenth (indexes on the remaining foreign keys, from
Supabase's performance advisor). Checked afterwards: the current site's 7 cars byte-for-byte unchanged and its
rules intact; the owner's login is OWNER; 7 vehicles, 6 brands, 13 photos, 42 spec lines, all matching the
originals; row level security on all 20 tables; 18 checks through the public API as a visitor (public data
readable, everything private refused, no free viewing times until hours are entered); the live website's full
test on computer and phone. Database types generated into `src/types/database.ts` and used by all four
Supabase connections. Advisor notes in docs/DATABASE.md.

**Not done yet / carried forward**
- ~~The home page is a temporary "foundation" page~~ (replaced in Phase 3).
- With no staging copy, anything that writes data is tested on the in-memory database, never the live one.
- Arabic typeface, and mirroring of the existing sections for right to left: Phase 8.
- Full Content-Security-Policy, and splitting the seven combined staff read/write rules (Supabase advisor): Phase 9.

## Decisions waiting for the owner

| # | Decision | Needed by |
|---|---|---|
| 1 | Vercel Pro (about $20/month; the free plan forbids commercial use) or a free alternative | Launch (a preview link to try it first) |
| 2 | ~~A staging project~~ (owner chose the existing project, 2026-11-04). Supabase Pro (about $25/month) for daily backups, or the nightly GitHub backup alone | Launch |
| 3 | The domain | Launch |
| 4 | Resend (emails) and Cloudflare Turnstile (spam check) accounts, free tiers; both optional | Launch |
| 5 | Business details: address, map, hours, phone, WhatsApp, email, booking rules, staff, brands, About facts | Any time (they appear by themselves) |
| 6 | A native speaker to approve the French and Arabic | Before launch |
| 7 | Hide the six sample cars at launch (keep them as drafts)? Each one is now a click in the car editor ("Draft"), once the dashboard is online | Launch |
| 8 | Keep or remove the FAQ promises "Bring your own mechanic" and "the showroom is yours" (kept as they are for now) | Before launch |
