# Phase 2 — Public Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every current public page (except the blog, which is Phase 3) is served by the Next.js app from Page documents in MongoDB: brand look preserved, full SEO/AEO/GEO metadata and structured data, accessible, and fast enough for the Lighthouse budgets.

**Architecture:** Pages are an ordered list of typed, Zod-validated blocks stored in a `pages` collection; one React renderer per block type. Every request is rendered dynamically (nonce CSP, owner decision **A**), so every DB read goes through a `'use cache'` function tagged per page/settings and invalidated with `revalidateTag` on publish (Phase 5 calls it). Header, footer, organisation data and the Google Ads tag come from the existing `settings` singleton. Legacy HTML is converted once into reviewable JSON in `content/`, then seeded into the DB.

**Tech Stack:** Next.js 16.4.2 (App Router, `cacheComponents`), React 19, Tailwind CSS 4 (`@theme`), `next/font` (Inter + Manrope), Mongoose 8, Zod 3, `sanitize-html`, `cheerio` (dev, importer only), `@axe-core/playwright`, `@lhci/cli`.

**Spec:** `docs/superpowers/specs/2026-10-21-nextjs-migration-design.md` (sections 2, 3, 6.3, 6.4, 6.6, 6.8, 6.9). Legacy inventory reference: `embtel-final/` (32 HTML pages, `includes/header.js`, `includes/footer.js`).

## Global Constraints

- Owner decision A: nonce CSP on every route stays; root layout keeps `await connection()`. All Mongo reads used by public pages go through `'use cache'` + `cacheTag(...)` + `cacheLife('max')` functions returning plain serialisable objects (`.lean()`, ObjectIds → strings).
- Canonical origin `https://www.embtelsolutions.com` (from `env.SITE_URL`), no trailing slash; home canonical is `https://www.embtelsolutions.com/`.
- Every existing URL keeps its exact path: `/` and `/<slug>` (e.g. `/dental-automation`, `/privacy-policy`). No `.html`, no folders.
- Current look preserved: dark theme only; tokens from legacy `:root` (`--blue #1A6BFF`, `--teal #00C896`, `--orange #FF5C35`, `--ink #09090B`, `--ink2 #111115`, `--s1 #18181C`, `--s2 #26262C`, `--s3 #38383F`, `--m2 #9898A6`, `--m3 #C4C4D1`, `--off #F4F4F8`, radii 8/14/20px, max width 1300px, breakpoint 960px). Exception (spec 6.8): muted text token `--m1` raised from `#6B6B78` to the nearest grey with contrast ≥ 4.5:1 on `--ink`.
- Fonts: Inter (400/500/600/700) body, Manrope (600/700/800) headings/buttons/numbers, via `next/font/google` (self-hosted, no runtime Google request).
- Copy is imported verbatim (team rewrites later). Content strings are plain text; the only inline markup is `*text*` → gradient emphasis. No HTML in any field except the `richText` block, which is sanitised.
- One `<h1>` per page; landmarks (`header`, `nav`, `main#main`, `footer`); skip link; visible `:focus-visible`; all animation disabled under `prefers-reduced-motion: reduce`.
- Only these client components may ship JS on public pages: header menu (mobile + dropdowns), stat counter, third-party script loader. FAQ uses native `<details>`.
- Third-party scripts load via `next/script` with the request nonce (`(await headers()).get('x-nonce')`), `afterInteractive` (ads tag) or `lazyOnload` (Elfsight). Google Ads tag `AW-18518114785` must fire on every public page from launch.
- No secrets anywhere in the repo. IDs like the Ads conversion ID and Elfsight app IDs are public identifiers and live in the `settings` document (seeded), never in code.
- Non-production deployments (`process.env.VERCEL_ENV !== 'production'`) must never be indexable.
- Do not modify `embtel-final/` or `blog-admin/` (the importer only reads them).
- Conventional commits ending with a blank line then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. npm. Node ≥ 22.

## Rulings carried into this plan (owner may override)

- **RSS feed moves to Phase 3** (it needs blog posts). **The static-page importer moves from Phase 6 into Phase 2**, so previews run on real content and option A's speed can be measured early. **The contact form moves to Phase 5** (it needs the Leads pipeline); Phase 2 renders the contact info and a "form arrives in Phase 5" slot, and the legacy site stays live until cutover anyway.
- The legacy Elfsight WhatsApp widget is replaced by a plain `wa.me` floating link (spec 6.6). The Elfsight Google-reviews widget stays, as the `testimonials` block.

## Review Focus

- A preview/local deployment is crawled → `robots.txt` disallows everything and pages carry `noindex` (Task 10 test `robots disallows non-production`).
- A content field containing `<script>`/HTML (typed by Marketing later) → rendered as literal text; `richText` strips scripts, event handlers and `javascript:` links (Task 2 test `renderInline never emits HTML`, Task 7 test `richText sanitises`).
- A draft page, an unknown slug, or a reserved slug (`admin`, `api`, `blog`) → 404 with site chrome, never the draft (Task 8 test).
- One corrupt block in a stored page → the page still renders, the bad block is skipped and logged (Task 5 test `skips invalid blocks`).
- Fresh database with no settings document or no address → header/footer render from defaults, `LocalBusiness` JSON-LD is omitted rather than emitted with empty fields (Task 3 and Task 9 tests).

---

### Task 1: Brand tokens, fonts and accessible base layout

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx` (fonts only; keep `connection()`, `instant = false` and, until Task 9, the global `robots: 'noindex'`)
- Create: `src/app/(site)/layout.tsx` (skip link → `#main`, `<main id="main">`; Header/Footer slots filled in Task 4), `src/lib/design/tokens.ts`, `src/lib/design/contrast.ts`
- Test: `tests/unit/contrast.test.ts`

**Interfaces:**
- Produces: `TOKENS` (const object of the colour tokens above, incl. the adjusted `m1`); `contrastRatio(fg: string, bg: string): number` (WCAG 2.x relative luminance). Tailwind `@theme` exposes `--color-blue|teal|orange|ink|ink2|s1|s2|s3|m1|m2|m3|off`, `--radius-8|14|20`, `--font-sans` (Inter), `--font-display` (Manrope), and a `--ac` accent variable defaulting to `--color-blue`. Utility classes `.text-gradient` (`linear-gradient(90deg, var(--color-teal), var(--ac))`) and `.container-site` (max-width 1300px, padding 0 40px; 0 20px below 960px).

- [ ] **Step 1:** Failing tests: `contrastRatio('#FFFFFF','#000000')` ≈ 21; `contrastRatio(TOKENS.m1, TOKENS.ink) >= 4.5`; `contrastRatio(TOKENS.m2, TOKENS.ink) >= 4.5`; `TOKENS.blue === '#1A6BFF'`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/contrast.test.ts` → FAIL.
- [ ] **Step 3:** Implement; pick `m1` as the darkest grey of the form `#RRGGBB` (R=G, B=G+13 like the legacy hue) passing 4.5:1.
- [ ] **Step 4:** Tests PASS. `globals.css`: reduced-motion rule (`animation: none !important; transition: none !important; scroll-behavior: auto !important`), `:focus-visible { outline: 2px solid var(--color-teal); outline-offset: 2px }`, body `bg-ink text-m3 font-sans`, smooth scroll.
- [ ] **Step 5:** `npm run typecheck && npm run lint && npm test` → pass. Commit `feat: brand tokens, fonts and accessible base layout`.

### Task 2: Inline text and content primitives

**Files:**
- Create: `src/lib/content/inline.tsx`, `src/components/site/Button.tsx`, `src/components/site/SectionHeader.tsx`, `src/components/site/Icon.tsx`
- Test: `tests/unit/inline.test.tsx` (vitest + `@testing-library/react`, `jsdom` environment for this file)

**Interfaces:**
- Produces: `renderInline(text: string): React.ReactNode` — splits on `*…*` into text nodes and `<em className="text-gradient not-italic">`; unmatched `*` stays literal. `Button({ label, href, variant = 'primary' }: { label: string; href: string; variant?: 'primary' | 'ghost' })` — internal hrefs use `next/link`; external `https:` hrefs get `rel="noopener"`; `tel:`/`mailto:` allowed; anything else (e.g. `javascript:`) renders as `#`. `SectionHeader({ eyebrow?, title?, subtitle?, align = 'left', as = 'h2' })`. `Icon({ icon }: { icon: IconValue | null })` with `type IconValue = { kind: 'emoji'; value: string } | { kind: 'image'; src: string; alt: string }`; `null` renders nothing.

- [ ] **Step 1:** Failing tests `renderInline never emits HTML`: input `'Hello *world* <script>x</script>'` → container text equals `Hello world <script>x</script>`, one `em` with text `world`, zero `script` elements; `'a * b'` → no `em`; Button with `href: 'javascript:alert(1)'` renders `href="#"`; external href gets `rel="noopener"`.
- [ ] **Step 2–4:** RED → implement → GREEN.
- [ ] **Step 5:** Commit `feat: inline emphasis markup and content primitives`.

### Task 3: Site settings (nav, footer, organisation, integrations IDs)

**Files:**
- Create: `src/lib/db/models/Settings.ts`, `src/lib/content/settings.ts`, `content/settings.json`
- Test: `tests/unit/settings.test.ts`

**Interfaces:**
- Consumes: `connectDB`, `startMemoryMongo`.
- Produces: Mongoose `Settings` on the existing `settings` collection, singleton `{ key: 'site' }`, keeping all legacy fields and adding:
  `organization { name, legalName, email, phone, phoneDisplay, address { street, city, region, postalCode, country: 'US' }, openingHours: string[], description }`, `headerNav: NavItem[]`, `headerCta: Link`, `footer { description, columns: { title: string; links: Link[] }[], copyright: string, legalLinks: Link[] }`, `social: { network: 'facebook'|'instagram'|'linkedin'|'x'; url: string }[]`, `whatsapp { number: string; message: string }`, `integrations { googleAdsId: string; elfsightReviewsAppId: string }`, `defaultOgImage: string`.
  `type NavItem = { label: string; href: string; children?: { label: string; subtitle?: string; href: string }[] }`; `type Link = { label: string; href: string }`.
  `SiteSettingsSchema` (Zod) for the public shape; `DEFAULT_SETTINGS` (safe defaults: org name "Embtel Solutions", empty nav, empty integrations).
  `getSiteSettings(): Promise<SiteSettings>` — `'use cache'`, `cacheTag(SETTINGS_TAG)` (`SETTINGS_TAG = 'settings'`), merges the stored doc over `DEFAULT_SETTINGS`, validates; on missing doc or invalid fields returns defaults for those fields (logs field paths only).
- `content/settings.json`: exact legacy values from `embtel-final/includes/header.js` and `footer.js` (nav with both dropdowns and subtitles, header CTA "Get Started" + booking URL, footer columns, social URLs, WhatsApp `15109627900` + legacy message, email `info@embtelsolutions.com`, phone `+15109627900` / "+1 (510) 962-7900", footer description and copyright verbatim), `integrations.googleAdsId: "AW-18518114785"`, `integrations.elfsightReviewsAppId` from `index.html`. Address fields left empty (owner fills in Phase 4).

- [ ] **Step 1:** Failing tests: no doc → `getSiteSettings()` equals defaults; doc with partial fields → merged; doc with invalid `social[0].url` (`javascript:x`) → that field falls back; `content/settings.json` passes `SiteSettingsSchema`. (Test `'use cache'` functions through an exported uncached `loadSiteSettings()` that `getSiteSettings` wraps.)
- [ ] **Step 2–4:** RED → implement → GREEN.
- [ ] **Step 5:** Commit `feat: site settings model with nav, footer and organisation data`.

### Task 4: Header, footer and floating WhatsApp link

**Files:**
- Create: `src/components/site/Header.tsx` (server), `src/components/site/HeaderMenu.tsx` (`'use client'`), `src/components/site/Footer.tsx`, `src/components/site/WhatsAppLink.tsx`, `src/components/site/SocialIcon.tsx`
- Modify: `src/app/(site)/layout.tsx`
- Test: `tests/e2e/site-chrome.spec.ts`

**Interfaces:**
- Consumes: `getSiteSettings()`, `Button`, `TOKENS`.
- Produces: `<Header settings />`, `<Footer settings />`. Behaviour: desktop dropdowns open on hover and on keyboard (button with `aria-expanded`, `aria-controls`; Esc closes and returns focus; Tab moves through items); mobile (< 960px) hamburger `button` with `aria-label="Menu"`, `aria-expanded`, full-height panel, closes on navigation and Esc. Active item: `aria-current="page"` for exact path, parent dropdown highlighted for its children (fixes the legacy automation-page bug). Footer: legal links are real `<a>` elements. WhatsApp: fixed bottom-right `<a>` to `https://wa.me/<number>?text=<encoded message>` with `aria-label="Chat on WhatsApp"`, `rel="noopener"`, `target="_blank"`. Logo via `next/image` with explicit `width`/`height`, `priority` in header.

- [ ] **Step 1:** Failing e2e (server seeds `content/settings.json`; extend `tests/e2e/server.ts` with `seedSettings()`): keyboard — Tab to "Services", Enter opens, `aria-expanded="true"`, first link focusable, Esc closes; mobile viewport 390×844 — hamburger opens panel, link navigates and panel closes; `/dental-automation` marks Services as active; footer "Privacy Policy" is an `<a href="/privacy-policy">`; WhatsApp href starts `https://wa.me/15109627900`.
- [ ] **Step 2–4:** RED → implement → GREEN. Pages for navigation targets may 404 until Task 8 — assert URLs, not content.
- [ ] **Step 5:** Commit `feat: accessible header, footer and WhatsApp link`.

### Task 5: Page model, block schemas and cached page data

**Files:**
- Create: `src/lib/content/blocks.ts`, `src/lib/db/models/Page.ts`, `src/lib/content/pages.ts`
- Test: `tests/unit/blocks.test.ts`, `tests/unit/pages.test.ts`

**Interfaces:**
- Produces:
  - Shared Zod parts: `Inline` (string ≤ 2000), `LinkSchema {label, href}` (href: relative `/…`, `https://`, `tel:`, `mailto:` only), `ButtonSchema` (+ `variant`), `IconSchema` (nullable), `HeaderSchema {eyebrow?, title?, subtitle?, align?}`.
  - `BlockSchema = z.discriminatedUnion('type', [...])`, `type Block = z.infer<…>`. Block types and fields (all with optional `header: HeaderSchema` where a section heading exists):
    - `hero` — `variant: 'home'|'page'|'simple'`, `badge?`, `breadcrumb?: Link[]`, `heading` (Inline, becomes the page `<h1>`), `lead?`, `buttons?: Button[]`, `stats?: {value, suffix?, label}[]`, `floatingCards?: {label, sub?, stat?}[]`, `meta?` (e.g. "Last updated …")
    - `marquee` — `items: string[]`
    - `stats` — `variant: 'bar'|'counters'`, `animate: boolean`, `items: {icon?, value: string, suffix?, label}[]`
    - `cardGrid` — `variant: 'service'|'feature'|'why'|'industry'|'industryLink'|'related'|'pain'|'trust'|'audit'`, `columns: 2|3|4`, `items: {icon?, num?, title, body, href?, linkLabel?, tags?: string[]}[]`, `button?`
    - `steps` — `variant: 'process'|'compact'|'flow'`, `items: {num?, week?, title, body}[]`
    - `pills` — `items: {icon?, label}[]`
    - `beforeAfter` — `rows: {before: {title, steps: string[]}, after: {title, steps: string[], saving?}}[]`
    - `comparisonTable` — `columns: string[]` (first is Embtel), `highlight: number`, `rows: {label, cells: {status: 'check'|'cross'|'partial', text?}[]}[]`, `button?`
    - `faq` — `variant: 'accordion'|'static'`, `items: {q, a}[]`
    - `cta` — `heading` (Inline), `body?`, `buttons: Button[]`
    - `testimonials` — `provider: 'elfsight'` (app ID comes from settings)
    - `contactInfo` — `items: {icon?, label, value, href?}[]`, `formSlot: boolean`
    - `workGrid` — `items: {title, body, url?, logo?: {src, alt}, fallbackEmoji?, theme: 'c1'|'c2'|'c3'|'c4', tags: {label, tone: 'b'|'t'|'o'}[], metrics: {n, l}[]}[]`
    - `timeline` — `rows: {period, era, focus}[]`
    - `split` — `image: {src, alt, width, height}`, `heading`, `paragraphs: string[]`
    - `phases` — `items: {number, title, desc, cards: {name, desc}[]}[]`
    - `roi` — `math: Inline`, `assumptions?`, `disclaimer?`
    - `richText` — `html: string` (≤ 200 kB), `toc: boolean`
  - `PageSchema {slug, title, status: 'draft'|'published', type: 'standard'|'service'|'industry'|'landing'|'legal', theme: {accent: /^#[0-9a-fA-F]{6}$/}, blocks: Block[], seo: {metaTitle?, metaDescription?, ogImage?, noindex: boolean}, locked: boolean, publishedAt?}`; `RESERVED_SLUGS = ['admin','api','blog','authors','_next','sitemap.xml','robots.txt','llms.txt','manifest.webmanifest']`; slug regex `^[a-z0-9]+(-[a-z0-9]+)*$` (`home` = `/`).
  - Mongoose `Page` (collection `pages`, unique `slug`, `blocks` Mixed, timestamps, `updatedBy` ref User).
  - `getPublishedPage(slug: string): Promise<PublishedPage | null>` — `'use cache'`, `cacheTag(pageTag(slug))`; returns null for draft/missing/reserved/invalid slug; parses each block with `BlockSchema.safeParse`, skipping invalid ones and logging `[page] skipped invalid block <slug>#<index>`. `listPublishedPages(): Promise<{slug, title, type, updatedAt}[]>` tagged `PAGES_TAG = 'pages'`. `pageTag(slug) = 'page:' + slug`. Uncached `loadPublishedPage` / `loadPublishedPages` exported for tests.

- [ ] **Step 1:** Failing tests: each block type parses a minimal valid example; `theme.accent: 'red;background:url(x)'` rejected; button href `javascript:x` rejected; reserved slug `admin` → `getPublishedPage` null; draft → null; `skips invalid blocks` (stored page with one block `{type:'hero'}` missing heading and one valid `cta` → returns 1 block, logs once).
- [ ] **Step 2–4:** RED → implement → GREEN.
- [ ] **Step 5:** Commit `feat: page model, block schemas and cached page reads`.

### Task 6: Block renderers — common sections

**Files:**
- Create: `src/components/blocks/BlockRenderer.tsx` (switch on `type`; exhaustive `never` check), `Hero.tsx`, `Marquee.tsx`, `Stats.tsx`, `Counter.tsx` (`'use client'`), `CardGrid.tsx`, `Steps.tsx`, `Pills.tsx`, `Faq.tsx`, `Cta.tsx` under `src/components/blocks/`
- Test: `tests/unit/blocks-render.test.tsx` (jsdom)

**Interfaces:**
- Consumes: Task 2 primitives, `Block` types.
- Produces: `BlockRenderer({ blocks, settings }: { blocks: Block[]; settings: SiteSettings })` (settings needed by `testimonials`). Rules: exactly one `<h1>` — the first `hero.heading`; section headers are `<h2>`, item titles `<h3>`; `Counter` renders the final value in server HTML (SEO) and animates from 0 only when `IntersectionObserver` fires and reduced motion is off, `en-US` locale; `Faq` accordion = `<details><summary>`, static = `<h3>`+`<p>`; `Marquee` duplicates items with the duplicate `aria-hidden="true"`, pauses on hover, static under reduced motion; card grid `href` items render as a single `<a>` per card; `pain` cards render the title as a quote. Visual styling matches the legacy classes noted in the inventory (`.hero`, `.svc-hero`, `.sc`, `.fc`, `.why-card`, `.ind-card`, `.ic`, `.rc`, `.pain-card`, `.trust-card`, `.acard`, `.proc-card`, `.pc`, `.flow-step`, `.cta-band`) using Tailwind and the `--ac` accent.

- [ ] **Step 1:** Failing tests: a page of [hero, cardGrid, faq, cta] renders exactly one `h1`; FAQ accordion uses `details`/`summary`; counter HTML contains the final value `50`; marquee duplicate is `aria-hidden`; unknown block type is a TypeScript error (`// @ts-expect-error` case).
- [ ] **Step 2–4:** RED → implement → GREEN.
- [ ] **Step 5:** Commit `feat: renderers for common page sections`.

### Task 7: Block renderers — specialised sections

**Files:**
- Create in `src/components/blocks/`: `BeforeAfter.tsx`, `ComparisonTable.tsx`, `WorkGrid.tsx`, `Timeline.tsx`, `Split.tsx`, `Phases.tsx`, `Roi.tsx`, `RichText.tsx`, `ContactInfo.tsx`, `Testimonials.tsx`; `src/lib/content/sanitize.ts`
- Modify: `BlockRenderer.tsx`
- Test: `tests/unit/sanitize.test.ts`, extend `tests/unit/blocks-render.test.tsx`

**Interfaces:**
- Produces: `sanitizeRichHtml(html: string): { html: string; headings: {id: string; text: string}[] }` (server-only; `sanitize-html` allow-list: `h2 h3 h4 p ul ol li a strong em b i blockquote dl dt dd table thead tbody tr th td br hr`; attributes: `a[href]` (http, https, mailto, tel, relative only), `h2[id] h3[id]`, `class` only from `legal-callout|legal-gov|bullets|contact-table`; every `h2` without an id gets a slug id; external links get `rel="noopener"`). `RichText` renders an optional TOC (`<nav aria-label="On this page">`) from `headings`. `ComparisonTable` is a real `<table>` with `<th scope>`; status icons have text alternatives ("Yes"/"No"/"Partly"). `WorkGrid` logo via `next/image` (remote hosts added to `next.config.ts` `images.remotePatterns`: `www.google.com`) with the emoji fallback rendered when `logo` is absent. `Testimonials` renders `<div class="elfsight-app-<id>" data-elfsight-app-lazy>` only when `settings.integrations.elfsightReviewsAppId` is set (script loading is Task 12). `ContactInfo` renders the items and, when `formSlot`, a placeholder region `data-slot="contact-form"`.

- [ ] **Step 1:** Failing tests `richText sanitises`: `<p onclick="x">a</p><script>alert(1)</script><a href="javascript:x">l</a><iframe>` → no `onclick`, no `script`, no `iframe`, link without href; `<h2>Data We Collect</h2>` gets `id="data-we-collect"` and appears in `headings`; comparison table has `th[scope=col]` and cell text alternatives.
- [ ] **Step 2–4:** RED → implement → GREEN.
- [ ] **Step 5:** Commit `feat: renderers for specialised sections and safe rich text`.

### Task 8: Page routes and not-found page

**Files:**
- Create: `src/app/(site)/page.tsx` (slug `home`), `src/app/(site)/[slug]/page.tsx`, `src/app/(site)/not-found.tsx`
- Delete: `src/app/page.tsx` (Phase 1 placeholder; the `(site)` home replaces it — existing security-header e2e on `/` must stay green)
- Test: `tests/e2e/pages.spec.ts`, `tests/helpers/page-fixtures.ts`

**Interfaces:**
- Consumes: `getPublishedPage`, `BlockRenderer`, `getSiteSettings`.
- Produces: page components wrap blocks in `<div style={{ '--ac': page.theme.accent }}>`; unknown/draft/reserved → `notFound()`; `[slug]` does not `generateStaticParams` (dynamic by decision A). `generateMetadata` delegates to Task 9 (`buildPageMetadata`) — until Task 9 lands, return `{ title: page.title }`.

- [ ] **Step 1:** Failing e2e (server seeds fixtures: a published `home`, a published `law-industry`, a draft `secret-draft`): `/` and `/law-industry` return 200 with one `h1` each; `/secret-draft`, `/does-not-exist` return 404 and show the header; `/admin` still redirects to login (unchanged).
- [ ] **Step 2–4:** RED → implement → GREEN.
- [ ] **Step 5:** Commit `feat: public page routes rendered from page documents`.

### Task 9: Metadata and structured data

**Files:**
- Create: `src/lib/seo/metadata.ts`, `src/lib/seo/jsonld.ts`, `src/lib/seo/indexing.ts`, `src/components/seo/JsonLd.tsx`
- Modify: both page routes (`generateMetadata`, render `<JsonLd>`); `src/app/layout.tsx` (remove the global `robots: 'noindex'` — per-page robots now come from `buildPageMetadata`)
- Test: `tests/unit/seo-metadata.test.ts`, `tests/unit/jsonld.test.ts`, extend `tests/e2e/pages.spec.ts`

**Interfaces:**
- Produces:
  - `isIndexable(): boolean` in `indexing.ts` (`process.env.VERCEL_ENV === 'production'`).
  - `canonicalUrl(path: string): string`; `buildPageMetadata(page: PublishedPage, settings: SiteSettings): Metadata` — title = `seo.metaTitle` ?? `` `${page.title} — Embtel Solutions` ``; description = `seo.metaDescription` ?? first `hero.lead` truncated to 160 chars at a word boundary; `alternates.canonical`; `openGraph {type: 'website', siteName: 'Embtel Solutions', url, title, description, images: [ogImage ?? '/<slug>/opengraph-image']}`; `twitter.card: 'summary_large_image'`; `robots` noindex when `seo.noindex` or non-production.
  - JSON-LD builders returning plain objects: `organizationLd(settings)`, `websiteLd(settings)`, `localBusinessLd(settings): object | null` (`ProfessionalService`, null unless street, city, region, postalCode present), `serviceLd(page, settings)` (type `service`/`landing`), `breadcrumbLd(page)` (from `hero.breadcrumb`, else Home › Title), `faqPageLd(page): object | null` (all `faq` blocks' items; plain text answers).
  - `pageJsonLd(page, settings): object[]` — Organization + WebSite on every page; LocalBusiness on `home` and `contact`; Service on service/landing pages; Breadcrumb on non-home pages; FAQPage when FAQs exist.
  - `<JsonLd data={object[]} nonce />` → one `<script type="application/ld+json">` with `JSON.stringify` and `<` escaped as `<`.

- [ ] **Step 1:** Failing tests: canonical of `home` is `https://www.embtelsolutions.com/` and of `law-industry` is `https://www.embtelsolutions.com/law-industry`; description fallback truncation ≤ 160; `localBusinessLd` null with empty address; FAQ answers containing `</script>` are escaped in the rendered output; e2e: every fixture page has exactly one canonical link, `og:title`, and JSON-LD that `JSON.parse`s with `@context: https://schema.org`.
- [ ] **Step 2–4:** RED → implement → GREEN.
- [ ] **Step 5:** Commit `feat: page metadata and JSON-LD structured data`.

### Task 10: Sitemap, robots, manifest, llms.txt and IndexNow

**Files:**
- Create: `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/manifest.ts`, `src/app/llms.txt/route.ts`, `src/app/indexnow-key.txt/route.ts`, `src/lib/seo/indexnow.ts`
- Modify: `src/lib/env.ts` (optional `INDEXNOW_KEY`, 8–128 chars `[A-Za-z0-9-]`), `.env.example`
- Test: `tests/unit/robots.test.ts`, `tests/unit/indexnow.test.ts`, extend e2e

**Interfaces:**
- Consumes: `isIndexable()` (Task 9).
- Produces: `robots()` production: `*` allow `/`, disallow `/admin`, `/api`; explicit allow groups for `GPTBot`, `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`, `Bingbot`; `sitemap: <SITE_URL>/sitemap.xml`; non-production: `*` disallow `/`. `sitemap()` from `listPublishedPages()` (excluding `seo.noindex` pages; `lastModified` = `updatedAt`; home first). `llms.txt` (text/plain): `# Embtel Solutions`, `> organization.description`, then `## Services`, `## Industries`, `## Company` sections listing `- [title](canonical): description`. `pingIndexNow(urls: string[]): Promise<{ ok: boolean }>` POSTs to `https://api.indexnow.org/indexnow` `{host, key, keyLocation: <SITE_URL>/indexnow-key.txt, urlList}`; no-op returning `{ok:false}` when key unset or not indexable; never throws. Key route returns the key as text/plain or 404 when unset. Phase 5 calls `pingIndexNow` on publish.

- [ ] **Step 1:** Failing tests `robots disallows non-production`: with `VERCEL_ENV` unset → rules `[{userAgent:'*', disallow:'/'}]`; with `production` → includes `GPTBot` allow and `/admin` disallow; `pingIndexNow` with fetch mocked sends the exact body, returns `{ok:false}` without key, swallows network errors; e2e: `/robots.txt` (non-production server) contains `Disallow: /`; `/sitemap.xml` lists seeded published pages and not the draft; pages carry `<meta name="robots" content="noindex">` in e2e.
- [ ] **Step 2–4:** RED → implement → GREEN.
- [ ] **Step 5:** Commit `feat: sitemap, robots, manifest, llms.txt and IndexNow`.

### Task 11: Open Graph images

**Files:**
- Create: `src/app/opengraph-image.tsx` (default), `src/app/(site)/[slug]/opengraph-image.tsx`, `src/lib/seo/og.tsx`, font files under `src/assets/fonts/` (Manrope 800 TTF, OFL licence file alongside)
- Test: extend `tests/e2e/pages.spec.ts`

**Interfaces:**
- Produces: `renderOgImage({ title, eyebrow }: { title: string; eyebrow?: string }): ImageResponse` 1200×630, ink background, blue→teal glow, title in Manrope 800, "Embtel Solutions" wordmark. Per-page image uses `page.title` and page type as eyebrow; unknown slug → default image (never 500).

- [ ] **Step 1:** Failing e2e: `/law-industry/opengraph-image` → 200 `image/png`; `/nope/opengraph-image` → 200 default image; page `og:image` points to it.
- [ ] **Step 2–4:** RED → implement → GREEN.
- [ ] **Step 5:** Commit `feat: generated Open Graph images`.

### Task 12: Google Ads tag and Elfsight loader

**Files:**
- Create: `src/components/site/ThirdPartyScripts.tsx`
- Modify: `src/app/(site)/layout.tsx`, `src/lib/security/csp.ts` (`img-src`, `connect-src`, `frame-src` hosts only), `tests/unit/csp.test.ts`
- Test: `tests/e2e/third-party.spec.ts`

**Interfaces:**
- Consumes: `getSiteSettings().integrations`, request nonce.
- Produces: when `googleAdsId` is set: `next/script` `src="https://www.googletagmanager.com/gtag/js?id=<id>"` `strategy="afterInteractive"` plus an inline init script (`window.dataLayer…; gtag('js', new Date()); gtag('config', '<id>')`), both with the nonce; id validated `^AW-\d+$` before interpolation. When the page contains a `testimonials` block and `elfsightReviewsAppId` is set: `https://elfsightcdn.com/platform.js` `strategy="lazyOnload"` with the nonce. CSP host additions: img-src `https://www.googletagmanager.com https://www.google.com https://googleads.g.doubleclick.net https://*.elfsightcdn.com https://lh3.googleusercontent.com`; connect-src `https://www.google.com https://www.googletagmanager.com https://googleads.g.doubleclick.net https://*.elfsight.com https://*.elfsightcdn.com`; frame-src `https://*.elfsight.com https://www.googletagmanager.com`. (Verify the minimum set in the browser; drop hosts that are not needed.)

- [ ] **Step 1:** Failing e2e with external requests intercepted by Playwright `page.route` (fulfil with an empty JS body; no real network): with seeded `googleAdsId`, every fixture page loads `gtag/js?id=AW-18518114785` and both scripts carry the page nonce; `window.dataLayer` contains a `config` entry for the id; with `googleAdsId` empty no gtag request; Elfsight script requested only on the page with a `testimonials` block; zero CSP violations in the console. Unit: `buildCsp()` contains the new hosts and still no `'unsafe-inline'` in `script-src`; malformed ads id (`AW-1'); alert(1);//`) renders no script.
- [ ] **Step 2–4:** RED → implement → GREEN.
- [ ] **Step 5:** Commit `feat: nonce-loaded Google Ads tag and Elfsight widget`.

### Task 13: Legacy importer — templated pages

**Files:**
- Create: `scripts/import-legacy/index.ts` (CLI: `npm run content:import`), `scripts/import-legacy/parse-common.ts`, `scripts/import-legacy/templates.ts`, `content/pages/*.json` (generated, committed)
- Test: `tests/unit/import-templates.test.ts`

**Interfaces:**
- Consumes: `PageSchema`, `BlockSchema` (every output validated; importer fails loudly on any invalid page).
- Produces: `parseLegacyPage(html: string, slug: string): Page` dispatching on detected template; shared parsers `parseHeroPage`, `parseFeatureGrid`, `parseProcess`, `parsePills`, `parseRelated`, `parseCta`, `parsePain`, `parseFlow`, `parseRoi`, `parseTrust`, `parseAudit`, `parseFaqStatic`. Templates and slugs:
  - **industry** (`type: 'industry'`, 9 pages `*-industry`): hero(page, breadcrumb, 4 stats) → cardGrid(feature) → steps(compact) → cardGrid(related) → cta
  - **service** (`type: 'service'`, 8 pages: web-development, digital-marketing, business-automation, ai-integrations, analytics-dashboards, seo-geo, cybersecurity, e-commerce): as industry + pills after steps; `theme.accent` from the page's `--ac`
  - **landing** (`type: 'landing'`, `locked: true`, 4 pages `*-automation`): hero(page, 2 buttons, no stats) → cardGrid(pain) → steps(flow) → roi → cardGrid(trust) → cardGrid(audit, button) → faq(static) → cta; `seo.metaDescription` from the legacy meta tag
  - All: `status: 'published'`; `title` from `<title>` minus ` — Embtel Solutions`; `<em>`/`<mark>` → `*…*`; empty icon containers → `null`; emoji kept; text trimmed and whitespace-collapsed; HTML entities decoded.
- Importer writes `content/pages/<slug>.json` (2-space JSON, stable key order) and prints a per-page summary (block counts).

- [ ] **Step 1:** Failing tests reading the real legacy files: `law-industry` → 5 blocks with 4 stats, 6 features, 4 steps, 3 related; `cybersecurity` → hero has 3 stats, accent `#A855F7`, pills present; `analytics-dashboards` first stat value is `"Real-Time"`; `dental-automation` → `locked: true`, 8 blocks, meta description equals the legacy one, buttons include `tel:+15109627900`; every output passes `PageSchema`.
- [ ] **Step 2–4:** RED → implement → GREEN.
- [ ] **Step 5:** Run `npm run content:import -- --templated`; commit code + the 21 JSON files: `feat: import templated legacy pages into page documents`.

### Task 14: Legacy importer — unique pages

**Files:**
- Create: `scripts/import-legacy/unique.ts`, more `content/pages/*.json`
- Modify: `scripts/import-legacy/index.ts`
- Test: `tests/unit/import-unique.test.ts`

**Interfaces:**
- Produces parsers for the 9 unique pages, block sequences per the inventory:
  - `home` (`index.html`): hero(home, badge, buttons, floatingCards) → marquee → stats(bar) → cardGrid(service, 3) → stats(counters, animate) → cardGrid(industry, 6, tags) → beforeAfter(3) → comparisonTable(8 rows) → pills(16) → cardGrid(why, 6) → testimonials → cta
  - `about`: hero(simple) → split → timeline(4) → phases(8) → stats(counters) → faq(accordion, 6) → cta
  - `services`: hero(simple, breadcrumb, button) → cardGrid(service, 9, linked) → stats(counters) → steps(process, 6) → faq(accordion, 6) → cta
  - `industries`: hero(page, no stats) → cardGrid(industryLink, 9) → cta
  - `work`: hero(simple from the inline header) → workGrid(6) → cta
  - `process`: hero(simple) → steps(process, 6, weeks) → cardGrid(why, 6) → cta
  - `contact` (`type: 'standard'`): hero(simple, heading from the contact info `h2`) → contactInfo(5 items, `formSlot: true`)
  - `privacy-policy`, `terms-of-service` (`type: 'legal'`): hero(simple, tag, meta) → richText(`toc: true` for privacy, `false` for terms)
- Pages whose legacy markup has no `<h1>` (contact, process, services, work) get their first heading promoted to `hero.heading`.

- [ ] **Step 1:** Failing tests: `home` has 12 blocks in the listed order, comparison table 8 rows × 3 columns; `about` phases count 8; `privacy-policy` richText yields 15 headings; `contact` contactInfo has 5 items and `formSlot`; every output passes `PageSchema`; running the importer twice produces byte-identical JSON.
- [ ] **Step 2–4:** RED → implement → GREEN.
- [ ] **Step 5:** Run the full import; commit `feat: import unique legacy pages into page documents`.

### Task 15: Content seeding and full-site e2e

**Files:**
- Create: `scripts/seed-content.ts` (`npm run content:seed`), `src/lib/content/seed.ts`
- Modify: `tests/e2e/server.ts` (seed settings + all `content/pages/*.json`), `README.md`
- Test: `tests/unit/seed.test.ts`, `tests/e2e/all-pages.spec.ts`

**Interfaces:**
- Produces: `seedContent(opts: { pages: Page[]; settings: SiteSettings; force?: string[] }): Promise<{ inserted: string[]; skipped: string[]; settingsFieldsFilled: string[] }>` — inserts pages whose slug is missing; skips existing ones (admin edits are never overwritten) unless the slug is in `force`; settings: fills only fields that are empty in the stored doc; idempotent; prints counts only. CLI refuses without `--yes` when `VERCEL_ENV === 'production'`. A standalone script cannot call `revalidateTag`; README documents that cached pages refresh on the next deploy (or, from Phase 5, on publish).
- E2E `all-pages.spec.ts` iterates every seeded slug: HTTP 200; exactly one `h1`; one canonical; JSON-LD parses; `@axe-core/playwright` scan has zero `serious`/`critical` violations; no console errors; at 390px width no horizontal scroll (`scrollWidth <= innerWidth`).

- [ ] **Step 1:** Failing tests: seed into empty DB inserts all; second run inserts none; an existing page edited in DB is untouched; `force: ['home']` replaces only home; settings with a filled `organization.phone` keeps it. E2E as above.
- [ ] **Step 2–4:** RED → implement → GREEN (fix any axe/layout violations found in renderers — they are bugs in Tasks 6–7, fix in place).
- [ ] **Step 5:** Commit `feat: idempotent content seeding and full-site e2e checks`.

### Task 16: Lighthouse budgets in CI

**Files:**
- Create: `lighthouserc.json`, `scripts/lhci-urls.ts` (prints the URL list)
- Modify: `.github/workflows/ci.yml`, `package.json` (`lhci` script), `README.md`
- Test: the CI job itself; local run evidence in the report

**Interfaces:**
- Produces: LHCI runs against the e2e production server (port 3100) on `/`, `/web-development`, `/law-industry`, `/dental-automation`, `/about`, `/privacy-policy`; mobile preset, 3 runs, median; assertions: `categories:seo` = 1 (error), `categories:accessibility` ≥ 0.95 (error), `categories:best-practices` ≥ 0.95 (error), `categories:performance` ≥ 0.9 (error), `largest-contentful-paint` ≤ 2500 (error), `cumulative-layout-shift` ≤ 0.1 (error). Because the e2e server is non-production (noindex), set `VERCEL_ENV=production` for the LHCI server run only so the SEO category measures the real output (robots allowed), and pass a dummy `SITE_URL` of `http://localhost:3100`. Third-party requests blocked (`blockedUrlPatterns`) so scores measure our code; record the third-party cost separately in the report by one run without blocking.

- [ ] **Step 1:** Run LHCI locally; paste the median table in the report. If any budget fails, fix the cause (image sizes, font preload, unused JS, render-blocking CSS) — not the threshold.
- [ ] **Step 2:** Add the CI job after e2e. Commit `ci: Lighthouse budgets for public templates`.

---

## Phase 2 done when

- All 30 legacy non-blog pages exist as JSON in `content/pages/`, seed into the DB, and render at their exact legacy paths with one `h1`, canonical, OG tags, JSON-LD, and zero serious axe violations.
- Header, footer, WhatsApp link and Google Ads tag work; Elfsight reviews load on the home page.
- `robots.txt`, `sitemap.xml`, `llms.txt`, `manifest.webmanifest`, OG images and the IndexNow key route respond correctly, and nothing is indexable outside production.
- Lighthouse budgets pass locally and in CI; typecheck, lint, unit, e2e green.
- Owner reviews a Vercel preview of the 4 Google Ads landing pages against production.
