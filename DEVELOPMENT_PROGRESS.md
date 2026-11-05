# Development progress

The Milcar platform, built on the `platform` branch in ten phases, each tested and reported before the next.
The live website (`main`, GitHub Pages) does not change until Phase 10, and only with the owner's go-ahead.

| # | Phase | Status |
|---|---|---|
| 1 | Audit and plan | ✅ Done 2026-11-04 |
| 2 | Architecture and database | ✅ Done 2026-11-04 |
| 3 | Public website | ✅ Done 2026-11-04 |
| 4 | Logins and dashboard | Next |
| 5 | Inventory CMS | |
| 6 | CRM | |
| 7 | Booking and WhatsApp | |
| 8 | Languages (full French and Arabic, right to left) | |
| 9 | Analytics, SEO and security | |
| 10 | Testing, launch and documentation | |

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
| 1 | Vercel Pro (about $20/month; the free plan forbids commercial use) or a free alternative | Phase 4 (a preview link to try it) |
| 2 | ~~A staging project~~ (owner chose the existing project, 2026-11-04). Supabase Pro (about $25/month) for daily backups before launch | Launch |
| 3 | The domain | Phase 7 |
| 4 | Resend and Cloudflare accounts (free tiers) | Phase 7 / 9 |
| 5 | Business details: address, map, hours, phone, WhatsApp, email, booking rules, staff, brands, About facts | Any time (they appear by themselves) |
| 6 | A native speaker to approve the French and Arabic | Phase 8 |
| 7 | Hide the six sample cars at launch (keep them as drafts)? | Phase 5 |
| 8 | Keep or remove the FAQ promises "Bring your own mechanic" and "the showroom is yours" (kept as they are for now) | Before launch |
