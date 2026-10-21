# Embtel Solutions — Next.js Migration Design

Date: 2026-10-21 · Status: draft for approval

## 1. Intent

Embtel Solutions is a US company selling web, automation and AI services to US small and mid-size businesses. Today the public site is 33 hand-copied static HTML pages (`embtel-final/`) served by a separate Express/EJS/MongoDB blog admin (`blog-admin/`). It works, but it ranks poorly and is expensive to change:

- Search engines get empty or incomplete HTML: the nav/footer are injected by JS, and blog posts (title, description, content, SEO fields) are rendered client-side only.
- 28/33 pages have no meta description, 0 have canonical/OG/structured data, there is no sitemap or robots.txt.
- ~386 KB of CSS is duplicated inline across pages; industry pages are ~90% identical copy.
- Accessibility gaps (unlabelled form fields, no reduced-motion, keyboard-inaccessible dropdowns, low-contrast small text).

**Goal in the owner's words:** rank as high as possible in the US and be found "everywhere on the internet" — Google, Bing and AI answer engines (ChatGPT, Perplexity, Google AI Overviews, Copilot). That means SEO (classic search), AEO (being the direct answer: FAQs, concise answers, schema) and GEO (being cited by generative engines: clear entities, facts, authorship, crawlable content).

## 2. Goals

1. One shared, well-structured Next.js (TypeScript) repository containing the public site **and** the admin panel, one deploy.
2. Every public page is server-rendered/statically generated HTML with complete metadata and structured data.
3. Lighthouse (mobile) on every public template: SEO 100, Accessibility ≥ 95, Best Practices ≥ 95, Performance ≥ 90; Core Web Vitals "good" (LCP < 2.5 s, CLS < 0.1, INP < 200 ms).
4. Zero ranking/ads loss at cutover: every existing URL keeps working (same path, or a 301).
5. Admin panel kept and extended:
   - Role-based access: **Admin** (everything) and **Marketing** (blog + SEO content).
   - SEO/AEO/GEO tooling for every post and page.
   - Keyword/trend suggestions from **Google Search Console** data.
   - **Integrations** screen (GA4, GTM, Search Console, Google Ads tag, GoHighLevel, Tawk.to, WhatsApp Business).
   - Admin can edit page content via **sections/blocks** and create new landing pages from ready-made blocks.
6. Leads from the contact form are stored in our own database and forwarded to GoHighLevel.

## 3. Non-goals (v1)

- Visual redesign. The current dark brand look is kept; it is rebuilt as components, not reinvented.
- Drag-and-drop page builder. Admin composes pages from predefined blocks via a form-based editor.
- AI writing assistant in the admin (owner said no).
- Paid keyword tools (Semrush, Google Ads Keyword Planner API). Search Console only; design leaves a seam to add them later.
- Content rewriting. The Embtel team writes the unique copy; engineering provides the structure and the slots.
- Multi-language / i18n, e-commerce, public user accounts.
- Public blog comments (not shown on the current site). Existing comment data is migrated and kept, moderation screen kept read-only. *(Architect's call.)*

## 4. Anti-goals (would be a failure even if it "works")

- Any existing indexed URL returning 404 after launch, or Google Ads landing pages changing URL or content without the owner's sign-off.
- Marketing scripts (GTM, chat, pixels) degrading Core Web Vitals below goal 3.
- Secrets (GHL token, WhatsApp token) reaching the browser or the repo.
- Existing admin users being locked out (password hashes must keep working).
- A Marketing user being able to change users, integrations, site settings or delete permanently.

## 5. Constraints

- **Hosting:** Vercel (owner agreed). Domain canonical host: `https://www.embtelsolutions.com` (apex 301s to www today — keep that).
- **Domain:** embtelsolutions.com.
- **Data:** existing MongoDB and existing S3 media bucket stay (owner confirmed both exist). The live blog currently reads 6 posts hard-coded in `embtel-final/includes/blog-posts.js`; these are imported into the DB if not already there (matched by slug), so every live `/blog/<slug>` URL keeps working. All current collections (`users`, `blogs`, `categories`, `tags`, `comments`, `media`, `settings`) are reused; schema changes are additive with a one-time migration script.
- **Auth compatibility:** users' bcrypt hashes are reused as-is. Role `editor` is migrated to `marketing`.
- **Market:** US. Copy, currency, phone formats, schema `addressCountry: US`. Company has a US address (entered in admin settings).
- **Legal:** keep the SMS consent checkbox and its text on the contact form (TCPA). Keep privacy/terms pages.
- Current live tag `AW-18518114785` (Google Ads) must keep firing from launch day.

## 6. Architecture

### 6.1 Stack (decided)

| Concern | Choice |
|---|---|
| Framework | Next.js, current stable, App Router, TypeScript strict |
| Styling | Tailwind CSS with the existing brand tokens (`--blue #1A6BFF`, `--teal #00C896`, ink/surface/muted scale, Manrope + Inter) |
| Fonts | `next/font` (self-hosted Inter + Manrope, no render-blocking requests) |
| DB | MongoDB via Mongoose (existing models ported to TS) |
| Media | Existing S3 bucket; `next/image` for delivery (AVIF/WebP, sized, lazy) |
| Auth | Existing JWT-in-httpOnly-cookie approach, ported; bcrypt; Next middleware guards `/admin` |
| Rich text | Tiptap editor (stores HTML, compatible with existing post HTML); server-side HTML sanitisation on save |
| Validation | Zod on every server action / route handler input |
| Rendering | Static generation + on-demand revalidation (publishing a post/page revalidates exactly the affected paths, sitemap and listing) |
| Tests | Vitest (units: permissions, SEO scoring, redirects, encryption), Playwright (smoke + a11y via axe), Lighthouse CI budgets |
| CI | GitHub Actions: typecheck, lint, test, build, Lighthouse CI on preview |

### 6.2 Repository structure

Single app at repo root (no monorepo — one deployable thing):

```
embtel2026/
├── src/
│   ├── app/
│   │   ├── (site)/                  # public site, shared Header/Footer layout
│   │   │   ├── page.tsx             # /
│   │   │   ├── [slug]/page.tsx      # all CMS pages: /about, /services, /dental-automation, ...
│   │   │   ├── blog/page.tsx        # /blog (+ ?page, /blog/category/[slug], /blog/tag/[slug])
│   │   │   ├── blog/[slug]/page.tsx
│   │   │   ├── authors/[slug]/page.tsx
│   │   │   └── contact/             # page + server action for leads
│   │   ├── admin/                   # admin panel (protected)
│   │   │   ├── (auth)/login, forgot-password, reset-password/[token]
│   │   │   ├── dashboard, blogs, pages, categories, tags, media,
│   │   │   ├── seo/                 # Search Console insights & suggestions
│   │   │   ├── leads, comments, users, integrations, settings, profile
│   │   ├── api/                     # route handlers only where server actions don't fit (uploads, cron, revalidate)
│   │   ├── sitemap.ts  robots.ts  manifest.ts
│   │   ├── feed.xml/route.ts  llms.txt/route.ts
│   │   └── opengraph-image.tsx      # default OG; per-page/post variants
│   ├── components/
│   │   ├── site/                    # Header, Footer, Button, Section, Card ...
│   │   ├── blocks/                  # one component per CMS block type
│   │   └── admin/
│   ├── lib/
│   │   ├── db/ (connection, models/)
│   │   ├── auth/ (session, permissions.ts)
│   │   ├── seo/ (metadata builders, jsonld.ts, scoring.ts)
│   │   ├── integrations/ (gsc.ts, ghl.ts, whatsapp.ts, crypto.ts)
│   │   └── validation/
│   └── middleware.ts
├── scripts/
│   ├── migrate-db.ts                # editor→marketing, new fields, defaults
│   ├── import-static-pages.ts       # one-time: current HTML pages → Page documents
│   ├── import-static-posts.ts       # one-time: includes/blog-posts.js → Blog documents
│   └── create-admin.ts              # interactive first-admin CLI (no seeded credentials)
├── redirects.ts                     # legacy URL map (/*.html → clean, /da-ai/* → /, …)
├── tests/  (unit/, e2e/)
├── public/ (favicon, logo.svg, static images)
├── docs/
├── .github/workflows/ci.yml
├── .env.example  .gitignore  .editorconfig  README.md
```

`embtel-final/`, `blog-admin/` and the stray root `node_modules/` are removed from the repo after cutover (git history keeps them). `render.yaml` / `vercel.json` (stale) are deleted.

### 6.3 Content model

**Page** (new collection) — every public non-blog page, including the existing 33:
- `slug` (unique, equals current path, e.g. `dental-automation`; `home` for `/`), `title`, `status` (draft/published), `type` (`standard` | `service` | `industry` | `landing` | `legal`)
- `blocks[]`: ordered `{ type, data }`. v1 block types: `hero`, `stats`, `featureGrid`, `cardGrid`, `beforeAfter`, `processSteps`, `pricing`, `testimonials`, `logoStrip`, `faq`, `cta`, `richText`, `contactForm`, `caseStudyGrid`. Block list is derived from what the current pages actually contain; each has a Zod schema and an admin form.
- `seo` (shared shape, see 6.4), `locked` (boolean; Ads landing pages are locked so only Admin can edit), `updatedBy`, timestamps.

**Blog** (existing, extended): adds `author` profile linkage, `faqs[]`, `keyTakeaways[]`, `focusKeyword`, `secondaryKeywords[]`, `noindex`, `lastReviewedAt`, `sources[]` (title + URL, for GEO citations). Existing `seo.*` fields kept.

**AuthorProfile** (fields on User): `slug`, `bio`, `jobTitle`, `avatar`, `sameAs[]` (LinkedIn etc.), `expertise[]` — powers author pages and `Person` schema (E-E-A-T).

**Lead** (new): name, email, phone, business, service, message, `smsConsent`, source page, UTM params, gclid, `ghlStatus` (pending/sent/failed + error), timestamps.

**Settings** (existing singleton, extended): organisation name, legal name, US address, phone, email, logo, social profiles, opening hours, default OG image, nav menus (header/footer link lists), plus an `integrations` sub-document (6.6).

**GscCache** (new): daily snapshots of Search Console query/page data.

### 6.4 SEO / AEO / GEO system

Generated for every public URL from data, never hand-written per page:
- `<title>`, meta description, canonical (`www`, no trailing slash), robots (respects `noindex`), Open Graph + Twitter cards, dynamic OG image (title on brand background) unless a custom one is set.
- JSON-LD: site-wide `Organization` + `WebSite`; `LocalBusiness`/`ProfessionalService` with the US address on home/contact; `Service` on service pages; `BreadcrumbList` everywhere; `FAQPage` wherever an FAQ block or post FAQs exist; `BlogPosting` + `Person` (author) on posts; optional custom JSON-LD field kept (validated as JSON).
- `sitemap.xml` (pages + posts + categories/tags/authors with `lastmod`), `robots.txt` (allows search and AI crawlers — GPTBot, PerplexityBot, ClaudeBot, Google-Extended, Bingbot — blocks `/admin`, `/api`), RSS feed, `llms.txt` (site summary + key page/post links).
- Semantic HTML: one `<h1>` per page, landmark elements, heading hierarchy enforced by block components.
- Internal linking: related posts by category/tags; "related services" on posts by tag→service mapping set in admin.
- IndexNow ping to Bing/Yandex on publish/update. *(Architect's call — cheap and helps Bing/Copilot freshness.)*

**Admin SEO panel** (on every post and page editor), live, rule-based score with a checklist:
- focus keyword in title, H1, slug, first 100 words, meta description; meta title/description length; image alt texts present; at least N internal links; readability (sentence/paragraph length); FAQ present; key takeaways present (AEO); sources cited (GEO); author bio present; not duplicate title/description across site.
- Google-style SERP preview and social-card preview.
- Score is advisory; it never blocks publishing.

**Search Console insights** (`/admin/seo`), via a Google service account added to the GSC property:
- Daily cron pulls last 28 days vs previous 28 days of query + page data into `GscCache`.
- Views: top queries, **rising queries** (biggest growth), **striking-distance** queries (avg position 8–20 → content to improve), queries per URL, pages losing clicks.
- In the post editor: "queries this post already ranks for" and "related rising queries" as one-click additions to secondary keywords / FAQ questions.
- Designed behind a `KeywordSource` interface so Semrush / Keyword Planner can be added later without touching the UI.

### 6.5 Roles and permissions

Central permission map in `lib/auth/permissions.ts`; every server action checks it (UI hiding is cosmetic only).

| Capability | Marketing | Admin |
|---|:-:|:-:|
| Blogs: create, edit, publish, schedule, duplicate, trash/restore | ✓ | ✓ |
| Blogs: permanent delete | | ✓ |
| Categories, tags: create/edit | ✓ | ✓ |
| Categories, tags: delete | | ✓ |
| Media: upload, rename, delete own | ✓ | ✓ |
| Post/page SEO fields, FAQs, schema | ✓ | ✓ |
| SEO insights (Search Console) | ✓ | ✓ |
| Pages: edit content of unlocked pages, create drafts | ✓ | ✓ |
| Pages: publish, create landing pages, edit locked (Ads) pages, delete | | ✓ |
| Navigation menus, site settings, integrations | | ✓ |
| Users & roles | | ✓ |
| Leads: view | ✓ | ✓ |
| Leads: export / delete | | ✓ |
| Own profile & author bio | ✓ | ✓ |

All create/update/publish/delete actions write an **audit log** entry (who, what, when) visible to Admin.

### 6.6 Integrations

Admin-only screen matching the owner's reference layout: each integration has an enable toggle, its IDs/tokens, and a "last status".

| Integration | Config | Behaviour |
|---|---|---|
| Google Ads tag | Conversion ID (`AW-18518114785`), conversion labels | Loads gtag; fires conversion on lead submit |
| GA4 | Measurement ID | Page views + `generate_lead` event |
| Google Tag Manager | Container ID | Loads GTM container |
| Search Console | Verification token + service-account JSON | Verification meta tag; data for 6.4 |
| GoHighLevel | API token (encrypted), Location ID, optional Pipeline ID + Stage ID | Each Lead is upserted as a GHL **contact** (tagged with service + source page). If pipeline + stage are set, an **opportunity** is also created there. Failures retried and shown in Leads. *(Architect's call.)* |
| Tawk.to | Property ID, Widget ID | Chat widget, loaded only after user interaction or idle |
| WhatsApp Business (Cloud API) | Phone number ID, permanent token (encrypted), approved template name | v1: config screen + floating "chat on WhatsApp" link (wa.me, no API). Business-initiated confirmation messages are **phase 2**: they need a Meta-approved template and a separate WhatsApp consent checkbox (existing SMS consent text is kept verbatim and not reused). *(Architect's call.)* |

- Secrets encrypted at rest with AES-256-GCM (key from env `ENCRYPTION_KEY`), write-only in the UI (shows `••••1234`), decrypted only server-side.
- All third-party scripts load via `next/script` with `afterInteractive` (tags) or `lazyOnload` (chat), so they don't affect LCP.
- When GTM is enabled, the UI warns that GA4/Ads should be configured inside GTM to avoid double counting.
- "Test connection" button per integration updates "last status".

### 6.7 Leads (contact form)

Server action → Zod validation → honeypot + rate limit (per IP) → save `Lead` → push to GoHighLevel (if enabled; non-blocking, retried) → email notification to the settings contact email → GA4/Ads conversion event client-side. Formspree is removed. UTM params and `gclid` captured from the landing URL and stored on the lead.

### 6.8 Performance and accessibility rules

- No client JS on public pages except: header mobile menu/dropdowns, contact form, enabled third-party scripts. No cookie/consent banner in v1 (US-only audience; Consent Mode can be added later if EU traffic matters). *(Architect's call.)* Everything else is Server Components.
- Images via `next/image` with explicit sizes; logo as SVG; hero imagery preloaded.
- `prefers-reduced-motion` respected by all animations; visible `:focus-visible` styles; skip link; `<main>` landmark; keyboard-operable dropdowns with `aria-expanded`; all form fields labelled; text contrast ≥ 4.5:1 (muted text token adjusted).
- Security headers (CSP without `unsafe-inline` for scripts, using nonces), HSTS, admin `noindex`.

### 6.9 Security (owner requirement: never hardcode anything sensitive)

- **No secret, password, token, key, connection string or default credential in the repo — ever.** That includes env-loader fallbacks, seed scripts, tests, fixtures, docs and `.env.example` (placeholders only, e.g. `<set-in-vercel>`). The legacy `blog-admin/server/config/env.js` default admin password and default Mongo URI are not carried over.
- Config loader validates all required env vars with Zod at boot and **fails loudly** if any is missing — no defaults for secrets.
- Secrets live only in Vercel environment variables (per environment) and, for integrations, encrypted in Mongo (6.6). Production secrets are rotated at cutover (JWT/session secrets, S3 keys) since the old ones lived on another host.
- First admin is created by a one-time CLI (`scripts/create-admin.ts`) that prompts for email/password interactively — no seeded credentials.
- CI runs secret scanning (gitleaks) on every push/PR and blocks the merge on a hit; also `npm audit` (high+ blocks) and Dependabot.
- Auth: bcrypt (cost ≥ 12), httpOnly + Secure + SameSite=Lax cookies, short-lived sessions, login rate limit + lockout, password-reset tokens hashed and single-use, CSRF protection on all mutations (server actions' origin check + token for route handlers).
- Server-side authorisation on every action via the permission map; IDs validated; Mongo queries built from validated input only (no operator injection).
- All user/admin HTML (post content, rich text blocks) sanitised server-side on save **and** rendered through a safe renderer; custom JSON-LD validated as JSON and escaped.
- Uploads: type sniffed by content (not extension), size-limited, re-encoded images, SVG uploads rejected or sanitised; S3 bucket private-write, keys scoped to the one bucket.
- Headers: strict CSP with nonces, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, frame-ancestors none for `/admin`.
- Logs never contain secrets, tokens or full lead PII; error responses never leak stack traces.
- Audit log (6.5) for every privileged action.

## 7. Migration and cutover

0. **Confirm live state:** current host and DNS provider for embtelsolutions.com, which pages Google Ads campaigns point to (default assumption: the 4 automation pages — dental, restaurant, real-estate, home-services-automation — locked until owner confirms the list), DB contents (users, posts).
1. **Inventory:** crawl current production; export the URL list from Search Console (pages with impressions) — this is the redirect/coverage checklist.
2. **Blog import:** `import-static-posts.ts` loads the 6 posts from `includes/blog-posts.js` into the Blog collection (idempotent, by slug).
3. **Content import:** `import-static-pages.ts` parses each of the current HTML pages into Page documents/blocks. The automated import is reviewed by a human for each page; copy is preserved verbatim (team rewrites later in the admin).
4. **DB migration:** `migrate-db.ts` (idempotent): `editor` → `marketing`, new fields with defaults, author slugs, settings extension. Run against a copy of production first.
5. **Redirects:** `/x.html` → `/x` (301), `/blog-details?slug=` → `/blog/<slug>`, `/da-ai/*` → `/`, plus any URLs found in step 1. Unit-tested.
6. **Parity check before DNS:** on the Vercel preview: every inventory URL returns 200 or a single 301 hop; Lighthouse budgets pass; Ads landing pages visually diffed against production and signed off by owner; Ads tag + conversion verified with Tag Assistant.
7. **Cutover:** point DNS to Vercel (lower TTL 48 h before); keep the current host running untouched for 2 weeks as rollback (revert DNS).
8. **After launch:** submit sitemap in GSC and Bing Webmaster Tools; monitor coverage, 404s, CWV and Ads conversions daily for 2 weeks, weekly to week 4.

## 8. Delivery phases

1. Foundation — repo restructure, Next app, tokens/components, DB layer, auth + permissions, CI.
2. Public site — blocks, page rendering from Page documents, header/footer/nav from settings, SEO system (metadata, JSON-LD, sitemap, robots, feeds, OG).
3. Blog — listing/category/tag/author pages, post page, related content.
4. Admin core — port existing screens (dashboard, blogs, categories, tags, media, users, settings, profile, comments) to the new app with the permission map.
5. Admin new — page/block editor, SEO panel, Search Console insights, integrations, leads, audit log.
6. Migration & cutover — import, DB migration, redirects, parity check, launch, monitoring.

## 9. Left to the builder

- Exact Tailwind config, component APIs, file names inside the structure above.
- Choice of rate-limit store (e.g. Upstash/Vercel KV vs Mongo TTL collection), cron mechanism (Vercel Cron).
- Exact SEO-score weights and thresholds (follow common Yoast/RankMath conventions).
- Block field shapes, as long as every current page can be represented without losing content.
- Test granularity beyond: permission matrix, redirects, encryption, SEO score, lead pipeline, e2e smoke of every public template + admin login/publish flow.

## 10. Owner-provided items needed before launch (not blocking build)

- US address, phone, opening hours, legal name (entered in Settings).
- Search Console: add the service account as a user on the property.
- GoHighLevel token + location ID; WhatsApp Cloud API credentials (when they enable them).
- Ads conversion labels for lead submissions.
- Author bios/photos for each Marketing user.
- Confirmation of current host/DNS provider and the list of Google Ads landing pages (section 7 step 0).
