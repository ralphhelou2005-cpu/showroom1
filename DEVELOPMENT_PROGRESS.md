# Development progress

The Milcar platform, built on the `platform` branch in ten phases, each tested and reported before the next.
The live website (`main`, GitHub Pages) does not change until Phase 10, and only with the owner's go-ahead.

| # | Phase | Status |
|---|---|---|
| 1 | Audit and plan | ✅ Done 2026-11-04 |
| 2 | Architecture and database | ✅ Done 2026-11-04 |
| 3 | Public website | Next |
| 4 | Logins and dashboard | |
| 5 | Inventory CMS | |
| 6 | CRM | |
| 7 | Booking and WhatsApp | |
| 8 | Languages (full French and Arabic, right to left) | |
| 9 | Analytics, SEO and security | |
| 10 | Testing, launch and documentation | |

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
- The home page is a temporary "foundation" page; Phase 3 replaces it with the showroom.
- With no staging copy, anything that writes data is tested on the in-memory database, never the live one.
- Arabic typeface, and mirroring of the existing sections for right to left: Phase 8.
- Full Content-Security-Policy, and splitting the seven combined staff read/write rules (Supabase advisor): Phase 9.

## Decisions waiting for the owner

| # | Decision | Needed by |
|---|---|---|
| 1 | Vercel Pro (about $20/month; the free plan forbids commercial use) or a free alternative | Phase 3 |
| 2 | ~~A staging project~~ (owner chose the existing project, 2026-11-04). Supabase Pro (about $25/month) for daily backups before launch | Launch |
| 3 | The domain | Phase 7 |
| 4 | Resend and Cloudflare accounts (free tiers) | Phase 7 / 9 |
| 5 | Business details: address, map, hours, phone, WhatsApp, email, booking rules, staff, brands, About facts | Phase 3 |
| 6 | A native speaker to approve the French and Arabic | Phase 8 |
| 7 | Hide the six sample cars at launch (keep them as drafts)? | Phase 5 |
| 8 | Keep or remove the FAQ promises "Bring your own mechanic" and "the showroom is yours" | Phase 3 |
