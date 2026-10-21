# Embtel Solutions

Next.js (TypeScript) app for the Embtel Solutions site and admin. The legacy static site (`embtel-final/`) and Express admin (`blog-admin/`) are kept untouched while features migrate.

## Setup

Requires Node 22 or newer.

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

## Scripts

| Script              | Purpose                      |
| ------------------- | ---------------------------- |
| `npm run dev`       | Start the dev server         |
| `npm run build`     | Production build             |
| `npm start`         | Serve the production build   |
| `npm run lint`      | ESLint                       |
| `npm run typecheck` | `tsc --noEmit`               |
| `npm test`          | Vitest unit/integration      |
| `npm run e2e`       | Playwright end-to-end tests  |
| `npm run db:migrate -- --cutover` | Apply pending DB migrations at cutover only (see Database migrations) |
| `npm run admin:create` | Interactively create an admin user |

## Secrets

Secrets never go in the repo. `.env.example` holds placeholders only; real values live in `.env.local` (git-ignored) and in Vercel project settings.

## Operator scripts

`npm run db:migrate` and `npm run admin:create` connect to the real database and load `.env.local` (`tsx --env-file=.env.local`). Populate it first, e.g. `vercel env pull .env.local`. To use another file, run `npx tsx --env-file=<file> scripts/migrate-db.ts` directly. `admin:create` prompts for name, email and password (hidden, entered twice, min 12 chars); credentials are never read from arguments, env or files.

## Content

Public pages are stored as page documents (ordered, validated blocks) in the `pages` collection; header, footer,
organisation details and the Google Ads / Elfsight IDs live in the `settings` document.

- `npm run content:import` — one-time conversion of the legacy `embtel-final/` HTML into reviewable JSON in
  `content/pages/` (30 pages) and the legacy blog into `content/blog/` (6 posts, categories, tags with their
  related-service links). Any section it does not recognise stops the import.
- `npm run content:seed` — loads `content/settings.json`, `content/pages/*.json` and `content/blog/` into the database (env from
  `.env.local`). Idempotent: existing pages are never overwritten (admin edits win) unless named with
  `-- --force=home,about`; settings only receive fields that are empty. Refuses to run with `VERCEL_ENV=production`
  unless `-- --yes` is passed. Cached pages refresh on the next deploy (from Phase 5, on publish).

## Lighthouse budgets

`npm run lhci` (run with `VERCEL_ENV=production`) builds the app, seeds the full content into an in-memory DB and
runs Lighthouse (mobile preset, 3 runs, median; Google tag/Elfsight blocked) on eight public templates incl. `/blog` and a post. CI fails on
SEO < 1, accessibility < 0.95, best practices < 0.95 or CLS > 0.1. Performance ≥ 0.9 and LCP ≤ 2.5 s are
**warnings** for now: the lab gap is React start-up JavaScript under Lighthouse's 4× CPU throttling (the page HTML
and first paint arrive early), not server rendering — see docs for the Phase 2 owner decision.

Baseline (2026-10-22, local, Phase 3 — incl. blog):

| Page | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| / | 0.86 | 1 | 1 | 1 | 3.9s | 0.000 | 101ms |
| /web-development | 0.89 | 1 | 1 | 1 | 3.5s | 0.002 | 119ms |
| /law-industry | 0.89 | 1 | 1 | 1 | 3.5s | 0.049 | 108ms |
| /dental-automation | 0.89 | 1 | 1 | 1 | 3.5s | 0.001 | 107ms |
| /about | 0.91 | 1 | 1 | 1 | 3.3s | 0.004 | 79ms |
| /privacy-policy | 0.88 | 1 | 1 | 1 | 3.5s | 0.000 | 145ms |
| /blog | 0.87 | 1 | 1 | 1 | 4.0s | 0.002 | 53ms |
| /blog/website-speed-costing-you-customers | 0.9 | 1 | 1 | 1 | 3.5s | 0.013 | 46ms |

## Database migrations

**Warning: cutover only.** Migration 001 rewrites `editor` to `marketing`, which locks Marketing users out of the legacy blog-admin (it only knows `editor`).

- Never run against the live database while blog-admin serves production. Run on a production copy first.
- `npm run db:migrate -- --cutover` refuses to run without `--cutover`, without an interactive terminal, or unless you type the database name it prints. It prints user counts by role first (counts only).
- Check those counts: any role other than admin/editor/marketing must be resolved by hand before migrating.
- Connecting the new app to the shared DB auto-builds the `slug_1` unique sparse index on `users`.

## CI

`.github/workflows/ci.yml` runs on every push and pull request (Node 22): typecheck, lint, unit tests, build, Playwright e2e (in-memory MongoDB), gitleaks, `npm audit`. Dependabot (`.github/dependabot.yml`) opens weekly npm (root only) and GitHub Actions updates.

- **gitleaks**: `.gitleaks.toml` extends the default rules and allowlists only the `<set-in-vercel>` placeholder in `.env.example`. `gitleaks/gitleaks-action@v2` is free for personal repos; org-owned repos need a `GITLEAKS_LICENSE` repository secret.
- **Known audit exceptions**: the blocking gate is `npm audit --omit=dev --audit-level=high` (shipped dependencies; clean). The full audit runs non-blocking because `braces` (GHSA-vfj7-8cjw-p6xm, high, dev-only via `eslint-config-next` > `fast-glob` > `micromatch`) has no patched release yet. Remove `continue-on-error` and `--omit=dev` once a fix ships.

## Vercel (owner steps)

1. In Vercel, import the GitHub repo as a new project (framework: Next.js, root directory: repo root).
2. Under Settings > Environment Variables, add every variable listed in `.env.example` separately for Production, Preview and Development, with real values for each environment. Every required variable must be set, including the `AWS_*` ones and `ENCRYPTION_KEY` (unused until later phases), or the preview will not boot. Generate secrets with `openssl rand -base64 32` (`ENCRYPTION_KEY`) and `openssl rand -base64 48` (`SESSION_SECRET`).
3. Pull requests get a Preview deployment automatically once the repo is linked. Check the preview serves with `noindex`.

## Known legacy secrets

The legacy `blog-admin/` code (removed in Phase 6) hardcodes a default admin password as a fallback for `SEED_ADMIN_PASSWORD` in `blog-admin/server/config/env.js`. gitleaks' default rules do not flag it, so it is documented here instead. Treat that credential as compromised: rotate it anywhere it was ever used and never deploy the legacy admin with the default. `AWS_SECRET_ACCESS_KEY` there defaults to an empty string (no secret).
