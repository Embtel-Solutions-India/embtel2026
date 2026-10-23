# Phase 5 — Admin Growth Implementation Plan (short form)

> Executed natively (superpowers:executing-plans), fast mode: TDD per task, full suites after Tasks 3, 6 and 8, one Lighthouse run and one final review at the end.

**Goal:** Leads from the contact form (saved + forwarded to Formspree), page editing through plain fields, integrations screen, SEO score panel, Search Console insights, audit-log viewer — and every doc updated to the owner's 2026-10-22 decisions.

**Spec:** `docs/superpowers/specs/2026-10-21-nextjs-migration-design.md` (updated in Task 8). Builds on Phase 4.

## Owner decisions (2026-10-22)
- Contact-form leads go to **Formspree** (live form `mzdwzgjr`), not GoHighLevel. GHL, encrypted integration secrets and WhatsApp Cloud API are out of scope.
- **No page block editor.** Pages are edited through plain fields; the block structure stays as imported.
- Docs (spec, roadmap, README, `.env.example`) must describe what is actually built.
- Work fast: short plan, no approval stop.

## Global constraints
All earlier constraints (no secrets anywhere, Zod at every boundary, `adminAction`/`requirePagePermission`, audit every write, `refreshContent` after writes, hard Lighthouse ≥ 0.90 on public pages, conventional commits + trailer, legacy collections additive-only).

## Rulings carried in
- Formspree is the notification channel (it emails the owner), so no SMTP mail in Phase 5. Leads are **also** stored in our DB so nothing is lost if Formspree is down; failed forwards are retried from the Leads screen.
- The Formspree form ID is public (it is in the legacy HTML), so it lives in settings (`integrations.formspreeFormId`), seeded from content/settings.json — not an env secret.
- Search Console data uses a service account: env `GSC_SERVICE_ACCOUNT_JSON` (secret) + `GSC_SITE_URL` (property, e.g. `sc-domain:embtelsolutions.com`). Token minted with `jose` (RS256), no Google SDK.
- Page "fields": title, SEO (meta title/description, OG image, noindex), hero texts (badge, heading, lead, button labels/links), and FAQ items — for whichever of those blocks a page has. Marketing edits unlocked pages; locked pages and publish/unpublish are Admin-only (spec 6.5).

## Tasks
1. **Lead model + form action.** `src/lib/db/models/Lead.ts`, `src/lib/leads/submit.ts` (`submitLead(input, meta)`: Zod — firstName, lastName, email, phone `^[0-9+\-\s()]{7,20}$`, businessName, service (legacy option list), message ≤ 5000, smsConsent must be true; honeypot field; rate limit 5/10 min per IP; save Lead with source page, UTM, gclid; forward to Formspree, `forwardStatus` sent/failed + error). Tests: valid lead saved + forwarded (fetch mocked); honeypot → silently accepted, not saved; consent missing → field error; rate limit; Formspree 500 → saved with `failed`.
2. **Contact form UI.** Client `LeadForm` in the `contactInfo` form slot (legacy fields, labels, SMS consent text verbatim), captures UTM/gclid from the URL, success message, fires `gtag('event','conversion',{send_to: '<adsId>/<label>'})` and GA4 `generate_lead` when configured. e2e: submit on `/contact` (Formspree stubbed by env-less config → status `failed`, lead still saved and success shown), axe clean.
3. **Integrations screen + script loader.** Settings `integrations`: googleAdsId, googleAdsConversionLabel, ga4Id, gtmId, gscVerification, formspreeFormId, tawkPropertyId, tawkWidgetId, elfsightReviewsAppId (Zod-validated formats). Admin screen `/admin/integrations` (`integrations.write`), GTM warning about double counting. Public loader: GA4/GTM `afterInteractive`, Tawk.to on first interaction/idle; GSC verification meta tag; CSP sources for each. Tests: schema formats, CSP contains hosts, loader renders only enabled tags.
4. **Leads screen.** `/admin/leads` (leads.view): list/filter/detail; Admin: CSV export (leads.export, CSV-injection safe), delete (leads.delete), retry forward. Tests: permissions, CSV escaping, retry.
5. **Page editing through fields.** `/admin/pages` list + `/admin/pages/[id]` form; `src/lib/admin/pages.ts` `savePageFields` (concurrency via `$where updatedAt`, locked → admin only, publish toggle admin only, block edits validated by the existing block Zod schema), refresh `pages`/`page:<slug>` + IndexNow. Tests: marketing vs locked page, invalid href refused, hero/FAQ edits render publicly.
6. **SEO score panel.** `src/lib/seo/score.ts` `scorePost(input, ctx)` rule checklist (focus keyword in title/H1-slug/first 100 words/meta description, title 30–60, description 70–160, alt texts, ≥ 2 internal links, readability, FAQ, takeaways, sources, author bio, duplicate title/description). Panel + SERP and social preview in the post editor (advisory, never blocks). Tests per rule.
7. **Search Console insights.** `src/lib/integrations/gsc.ts` (token, `searchAnalytics.query`), `GscCache` model, cron `/api/cron/gsc-sync` daily (same Bearer secret), `/admin/seo` (seo.insights): top queries, rising, striking distance (pos 8–20), pages losing clicks; post editor "queries this post ranks for" with one-click add to secondary keywords / FAQ. `KeywordSource` interface. Tests with mocked fetch; "not configured" state.
8. **Audit-log viewer + docs.** `/admin/audit` (audit.view, filters). Update spec, roadmap, README, `.env.example`, plan statuses to the owner decisions. Full suites + Lighthouse + final review.
