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
organisation details, offices and the integration IDs (Google Ads, GA4, GTM, Formspree, Tawk.to, Elfsight, Search Console verification) live in the `settings` document. Admins edit them in `/admin/settings` and `/admin/integrations`; page titles, search snippets, top sections and FAQs are edited in `/admin/pages` (no block editor).

- `npm run content:import` — one-time conversion of the legacy `embtel-final/` HTML into reviewable JSON in
  `content/pages/` (30 pages) and the legacy blog into `content/blog/` (6 posts, categories, tags with their
  related-service links). Any section it does not recognise stops the import.
- `npm run content:seed` — loads `content/settings.json`, `content/pages/*.json` and `content/blog/` into the database (env from
  `.env.local`). Idempotent: existing pages are never overwritten (admin edits win) unless named with
  `-- --force=home,about`; settings only receive fields that are empty. Refuses to run with `VERCEL_ENV=production`
  unless `-- --yes` is passed. Admin saves refresh the affected cached pages immediately.

## Leads and integrations

The contact form saves every lead in the `leads` collection and forwards it to Formspree (form ID in
`/admin/integrations`), which emails the team. If Formspree fails, the lead is kept as `failed` and can be re-sent
from `/admin/leads`; Admins can export CSV. e2e tests blank the Formspree ID so test leads are never sent.

Search Console insights (`/admin/seo`): create a Google Cloud service account, enable the Search Console API, add
the account to the property with Restricted access, then set `GSC_SERVICE_ACCOUNT_JSON` (the key file contents) and
`GSC_SITE_URL` in Vercel. A daily cron (`vercel.json`) refreshes the data; "Update now" refreshes it on demand.

## Lighthouse budgets

`npm run lhci` (run with `VERCEL_ENV=production`) builds the app, seeds the full content into an in-memory DB and
runs Lighthouse (mobile preset, 5 runs, median; Google tag/Elfsight blocked) on eight public templates incl. `/blog` and a post.
Every budget is a hard failure (owner decisions, 2026-10-22 and 2026-10-23): performance < 0.90, SEO < 1, accessibility < 1,
best practices < 1, CLS > 0.1 or TBT > 200 ms. Lab LCP has no separate check (it is part of the performance score):
Lighthouse's simulation counts every script, font and stylesheet that downloads before the first paint, which puts lab LCP
near 3 s for any Next.js page on a simulated slow 4G phone. Real-visitor Core Web Vitals (Search Console) are what Google ranks on.

Results (2026-10-22, local, Phase 4 — median of 5):

| Page | Perf | LCP | TBT |
|---|---|---|---|
| / | 0.89–0.90 | 3.7s | 70ms |
| /web-development | 0.91 | 3.3s | 67ms |
| /law-industry | 0.91 | 3.3s | 80ms |
| /dental-automation | 0.91 | 3.4s | 100ms |
| /about | 0.94 | 3.1s | 59ms |
| /privacy-policy | 0.91 | 3.4s | 82ms |
| /blog | 0.90 | 3.6s | 38ms |
| /blog/website-speed-costing-you-customers | 0.92 | 3.2s | 49ms |

SEO, accessibility and best practices are 1 on every page. `/` and `/blog` sit at the 0.90 line; a slow CI machine can
tip `/` under it (its single runs range 0.89–0.94).

## Cutover

Follow [`docs/cutover-runbook.md`](docs/cutover-runbook.md). Nothing in it touches production without the owner's go
for that step. Tools: `npm run cutover:parity -- <baseUrl> [--inventory pages.csv] [--expect-indexable]` (URL parity,
read-only), `npm run cutover:accounts -- --cutover` and `npm run cutover:authors -- --cutover` (interactive, ask for the
database name). Legacy URLs (`/x.html`, `/blog-details?slug=`, `/da-ai/*`) 301 to their new address (`redirects.ts`).

## Database migrations

**Warning: cutover only.** Migration 001 rewrites `editor` to `marketing`, which locks Marketing users out of the legacy blog-admin (it only knows `editor`). Migration 002 copies the legacy GA4 ID and Search Console code into the new integrations (only where empty).

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
2. Under Settings > Environment Variables, add every variable listed in `.env.example` separately for Production, Preview and Development, with real values for each environment. Every required variable must be set, including the `AWS_*` ones and `ENCRYPTION_KEY`, or the preview will not boot. Optional: `CRON_SECRET` (32+ chars; enables scheduled publishing every 5 min — needs Vercel Pro — and the daily Search Console sync), `GSC_SERVICE_ACCOUNT_JSON` + `GSC_SITE_URL` (SEO insights), `INDEXNOW_KEY`. Generate secrets with `openssl rand -base64 32` (`ENCRYPTION_KEY`) and `openssl rand -base64 48` (`SESSION_SECRET`).
3. Pull requests get a Preview deployment automatically once the repo is linked. Check the preview serves with `noindex`.

## Known legacy secrets

The legacy `blog-admin/` code (removed in Phase 6) hardcodes a default admin password as a fallback for `SEED_ADMIN_PASSWORD` in `blog-admin/server/config/env.js`. gitleaks' default rules do not flag it, so it is documented here instead. Treat that credential as compromised: rotate it anywhere it was ever used and never deploy the legacy admin with the default. `AWS_SECRET_ACCESS_KEY` there defaults to an empty string (no secret).
