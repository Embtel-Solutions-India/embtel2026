# Cutover runbook — embtelsolutions.com → Next.js on Vercel

> **Owner rule:** nothing in this runbook runs until the owner says so. Every step marked **[owner go]** needs the
> owner's explicit approval *for that step*. Steps without it are read-only or run on copies.
> Everything here was rehearsed: legacy-shaped database (`tests/unit/cutover-rehearsal.test.ts`), redirects and the
> full URL inventory against a local production build (81/81 OK).

## 0. What the owner provides (before anything starts)

| Item | Used in |
|---|---|
| Access to the production MongoDB (Atlas) and permission to restore a **copy** to a staging database | §2 |
| The list of Google Ads landing pages (today locked: dental, restaurant, real-estate, home-services automation) | §3 |
| DNS provider login and the current host (legacy static site) | §5 |
| Vercel account/plan (Pro needed for the 5-minute scheduled-publishing cron; Hobby runs it once a day) | §1 |
| Values for the Vercel env vars below; US + India office details; Ads lead conversion label | §1, §4 |
| Search Console service account (optional, for SEO insights) and a "Pages" CSV export from Search Console | §1, §4 |

Vercel environment variables (Production and Preview separately; generate secrets with `openssl rand`):
`SITE_URL`, `MONGODB_URI`, `SESSION_SECRET`, `ENCRYPTION_KEY`, `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, optional `AWS_S3_PUBLIC_URL_BASE`, `CRON_SECRET` (32+ chars), `INDEXNOW_KEY`,
`GSC_SERVICE_ACCOUNT_JSON`, `GSC_SITE_URL`. **Rotate** session/S3 secrets: the old ones lived on another host.

## 1. Preview environment — [owner go: push the branch, create the Vercel project]

1. Push `feat/nextjs-foundation` to GitHub (not `main`). **[owner go]**
2. Import the repo in Vercel; set the **Preview** env vars, with `MONGODB_URI` pointing at the **staging** database (§2). **[owner go]**
3. The preview deployment is `noindex` automatically (only `VERCEL_ENV=production` is indexable).

## 2. Staging database (a copy of production) — [owner go: create the copy]

1. Restore the latest production backup into a new staging database (Atlas "restore to another cluster", or `mongodump` → `mongorestore`). **[owner go]**
2. Point `.env.local` at the staging database (`vercel env pull .env.local` for Preview).
3. Run, in order, in an interactive terminal (each shows the database name and asks you to type it):
   ```
   npm run db:migrate -- --cutover        # 001 editor→marketing + author slugs, 002 legacy GA4/Search Console IDs
   npm run content:seed                   # 30 pages, settings, 6 blog posts (only what is missing)
   npm run cutover:accounts -- --cutover  # keep / deactivate (legacy seeded admin) / one-time set-password links
   npm run cutover:authors -- --cutover   # credit the imported posts to real authors
   npm run admin:create                   # only if no admin you can sign in with remains
   ```
4. Sign in to the preview admin as each kept user. Fill Settings (offices, hours) and Integrations (Ads conversion label, Formspree ID).

## 3. Parity and acceptance on the preview (read-only)

| Check | How | Pass |
|---|---|---|
| Every legacy + indexed URL | `npm run cutover:parity -- https://<preview-url> --inventory search-console-pages.csv` | all OK (200, or one 301/308 to a 200) |
| Speed / SEO / a11y | `VERCEL_ENV=production npm run lhci` (CI runs it too) | hard budgets pass |
| Ads landing pages | Compare each locked page side by side with production; owner signs off | owner OK |
| Google Ads tag | Tag Assistant on the preview: `AW-18518114785` fires on every page; conversion fires after a test lead | both fire |
| Contact form | Send one test lead (owner's choice of address); appears in Admin → Leads and arrives from Formspree | both |
| Admin | Each role signs in; Marketing cannot open Users/Settings/Integrations | as expected |

## 4. Cutover day

1. **48 h before:** lower the DNS TTL for `www` and the apex to 300 s. **[owner go]**
2. **Freeze** content in the legacy admin; take a fresh production backup. **[owner go]**
3. Run §2 step 3 against the **production** database. Note: after migration 001 the legacy admin no longer accepts Marketing users (expected — it is retired). **[owner go]**
4. Merge `feat/nextjs-foundation` into `main`; Vercel builds Production with the Production env vars. **[owner go]**
5. In Vercel, add `www.embtelsolutions.com` (primary) and `embtelsolutions.com` (redirect to www). Point DNS at Vercel. **[owner go]**
6. Verify on the live domain (read-only): `npm run cutover:parity -- https://www.embtelsolutions.com --inventory search-console-pages.csv --expect-indexable`; `/robots.txt` allows crawling; `/sitemap.xml` lists pages and posts; Tag Assistant; one test lead.

## 5. Rollback (any time in the first 2 weeks)

1. Point DNS back to the old host — it stays running, untouched, for 2 weeks. **[owner go]**
2. Only if the legacy admin must be used again: `db.users.updateMany({ role: 'marketing' }, { $set: { role: 'editor' } })` on production. All other database changes are additive and harmless to the legacy site. **[owner go]**

## 6. After launch

- Submit `https://www.embtelsolutions.com/sitemap.xml` in Search Console and Bing Webmaster Tools; set `INDEXNOW_KEY`. **[owner go]**
- **Daily for 2 weeks, weekly to week 4:** Search Console coverage and 404s, Core Web Vitals, Google Ads conversions, leads arriving (Admin → Leads, any `failed`), Vercel error logs.
- After real GA4 / GTM / Tawk.to IDs are set: re-run Lighthouse (they load on every page).
- After 2 stable weeks: remove `embtel-final/` and `blog-admin/` from the repo, then shut down the old host. **[owner go]**
