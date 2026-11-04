# Milcar

The website and dealership platform of Milcar, automotive consultancy (Lebanon): a public showroom in
English, French and Arabic, and a staff dashboard for the inventory, customers, leads and private viewings.

This branch (`platform`) is being built in ten phases; [DEVELOPMENT_PROGRESS.md](DEVELOPMENT_PROGRESS.md)
says where it stands. Until the switch, the live website is the current site on `main`, published by GitHub
Pages and described in [SETUP.md](SETUP.md). It is still in this folder and still builds the same way
(`npm run legacy:dev`, `npm run legacy:build`).

## Stack

| | |
|---|---|
| App | Next.js 16 (App Router), React 19, TypeScript 7 |
| Look | `src/styles/site.css`, the site's own stylesheet, plus Tailwind CSS 4 for new screens, built on the same design values (`src/app/globals.css`) |
| Languages | next-intl: English at `/`, French at `/fr`, Arabic at `/ar` (right to left). Words in `messages/*.json` |
| Data, logins, files | Supabase: Postgres with row level security, Auth, Storage |
| Hosting | Vercel (planned) |

## Run it on your computer

Needs Node.js 24.

```bash
npm install
cp .env.example .env.local   # then fill in the values (see the comments in the file)
npm run dev                  # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | The platform, reloading as you edit |
| `npm run build` | Type-check, then build the platform for production |
| `npm start` | Serve that build |
| `npm run test:db` | Every database rule, on an in-memory Postgres (no Supabase project needed) |
| `npm run typecheck` | TypeScript only |
| `npm run legacy:dev` / `legacy:build` / `legacy:preview` | The current live site, unchanged |

## Where things are

| Path | What |
|---|---|
| `src/app/` | Pages and server endpoints (Next.js App Router). `[locale]/` is the public site in each language |
| `src/i18n/` | The languages: routing, loading the words, links that keep the language |
| `src/lib/supabase/` | The ways to reach Supabase: `public` (visitors' view, cacheable), `server` and `browser` (as the logged-in member of staff, so their rules apply), `admin` (the server's own key, server only) |
| `src/lib/env.ts`, `env.server.ts` | Settings, checked at start-up. Secrets are in `env.server.ts`, which browser code cannot import |
| `src/proxy.ts` | Runs before each page: the language, and the dashboard's login check |
| `src/components/`, `src/lib/home.ts`, `src/lib/build.ts`, `src/assets/` | The current site's sections, walk-in and hold-to-build, and pictures, moving into the platform in Phase 3 |
| `supabase/migrations/` | The database, in ten files, applied to the live project on 2026-11-04. See [docs/DATABASE.md](docs/DATABASE.md) |
| `src/types/database.ts` | TypeScript types for every table, generated from the live database (regenerate after each migration) |
| `supabase/tests/` | The database tests |
| `supabase/setup.sql` | The current site's database (kept as it is) |
| `messages/` | The words of the site in each language |

## Security

- The browser only ever gets the Supabase **publishable** key. The **secret** key lives in the server's
  environment only (`SUPABASE_SECRET_KEY`); `src/lib/env.server.ts` cannot be imported by browser code.
- Every table has row level security. Visitors read published cars, brands, opening hours and public settings,
  nothing else. Website forms go through the server (spam check, rate limit), never straight to the database.
- Roles (owner, manager, salesperson, inventory editor) are enforced by the database itself; see
  [docs/DATABASE.md](docs/DATABASE.md).
- `.env.local` and every `.env.*` except `.env.example` are never uploaded.
