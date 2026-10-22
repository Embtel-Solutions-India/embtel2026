# Phase 4 — Admin Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The team runs the blog from the new admin at `/admin`: write, schedule and publish posts in a rich editor, manage categories, tags, media (S3), users and their author profiles, and site settings (incl. nav menus and the US + India offices) — every action permission-checked, audited, and reflected on the public site immediately.

**Architecture:** Admin pages are dynamic Server Components under `src/app/admin/(panel)/` sharing one shell. All writes are server actions that go through one wrapper (`adminAction`): permission check → Zod parse → mutation in a plain `lib/admin/*` service (unit-tested against memory Mongo) → audit → `updateTag` of the affected public cache tags → IndexNow ping when public URLs change. The only client components are the rich-text editor, the media picker and small form helpers.

**Tech Stack:** as Phase 3, plus `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-link` + `@tiptap/extension-image` (editor, spec 6.1), `@aws-sdk/client-s3` (media), `sharp` (re-encode uploads).

**Spec:** `docs/superpowers/specs/2026-10-21-nextjs-migration-design.md` — 6.3 (Blog, AuthorProfile, Settings), 6.5 (permission matrix), 6.9 (security), phase 4 in section 8. Builds on Phases 1–3 (`docs/superpowers/plans/2026-10-2*-phase-*.md`).

## Global Constraints

- All earlier Global Constraints apply (decision A rendering, canonical host, no secrets anywhere — code, seeds, tests, fixtures, docs, `.env.example`; noindex outside production; no edits to `embtel-final/` or `blog-admin/`; conventional commits with the Co-Authored-By trailer).
- Shared legacy collections: **additive schema changes only** until cutover.
- Every server action calls `requirePermission(...)` itself (the proxy does not guard actions). UI hiding is cosmetic. Matrix = spec 6.5 / `src/lib/auth/permissions.ts`; do not widen Marketing.
- Every create/update/publish/delete writes `audit()` with actor, action (`<entity>.<verb>`), target; never secrets or passwords in `meta`.
- All input validated with Zod; ObjectIds validated; queries built from parsed values only.
- Post HTML sanitised on save (`sanitizeRichHtml(html, { images: true })`) and again at render (already done).
- After a write, the public site shows it on the next request: `updateTag` for `posts`, `post:<slug>`, `taxonomy`, `pages`, `settings` as relevant.
- Admin pages: `noindex` (header already set), accessible (labels, focus, keyboard), work at 390 px width.
- Owner decisions 2026-10-22: explicit **scheduled** status with automatic go-live; all tag pages stay indexed; India office shown alongside the US office; S3/CDN host via env; imported posts get real authors when the owner supplies the production DB (Phase 6); performance is a hard budget, not a warning.

## Rulings carried into this plan (owner may override)

- **No self-serve "forgot password" email in Phase 4.** An Admin issues a one-time set-password link from the Users screen (invites use the same mechanism, valid 72 h; resets 30 min). Email delivery arrives with lead notifications in Phase 5 (one mail module for both).
- **Slug of a published post is read-only** (prevents breaking indexed URLs; renames need a redirect, which Phase 6 adds). Drafts' slugs are editable.
- **Scheduled publishing:** `status: 'scheduled'` + `scheduledAt`. A Vercel Cron call (`/api/cron/publish-scheduled`, every 5 min, `Authorization: Bearer $CRON_SECRET`) flips due posts to `published` with `publishedAt = scheduledAt`, refreshes caches and pings IndexNow. A past `scheduledAt` on save publishes immediately.
- **Concurrent edits:** saves carry the `updatedAt` the editor loaded; a mismatch is rejected ("changed by someone else — reload") instead of silently overwriting.
- **Comments:** read-only list (spec 3): no public comments, no moderation actions.
- **Audit log viewer, SEO score panel, Search Console, integrations and leads** are Phase 5.
- **Disabling the legacy seeded admin** and linking imported posts to real authors happen in Phase 6 against the owner's production DB copy.

## Review Focus

- A Marketing user (or a forged POST) invoking an admin-only action — permanent delete, user/role change, settings write, taxonomy delete → refused, nothing changes, nothing audited as success (Task 1 test `forged admin action is refused`; per-task permission tests).
- Two people editing the same post; the second save is based on stale data → rejected with a clear message, first save kept (Task 3 test `stale save is rejected`).
- An upload that lies about its type (HTML/SVG named `.png`), is empty, or exceeds 5 MB → rejected before S3; a real JPEG/PNG/WebP/GIF/AVIF is re-encoded to WebP (Task 7 tests).
- The last active Admin demoting or deactivating themselves, or an Admin deactivating themselves → refused (Task 8 test `last admin is protected`).
- A scheduled time given in the editor's local time zone → stored as the correct UTC instant; a past time publishes now; the cron is idempotent and refuses without the secret (Task 3 and Task 5 tests).

---

### Task 1: Admin shell, action wrapper and cache refresh

**Files:**
- Create: `src/app/admin/(panel)/layout.tsx`, `src/components/admin/AdminNav.tsx`, `src/components/admin/admin.css`, `src/components/admin/Forbidden.tsx`, `src/app/admin/(panel)/forbidden.tsx`, `src/lib/admin/action.ts`, `src/lib/admin/revalidate.ts`
- Move: `src/app/admin/dashboard/*` → `src/app/admin/(panel)/dashboard/*`
- Modify: `next.config.ts` (`experimental.authInterrupts: true`, `serverActions.bodySizeLimit: '6mb'`), `src/lib/auth/session.ts` (`requirePermission` calls `forbidden()` for page renders; actions get `ForbiddenError`)
- Test: `tests/unit/admin-action.test.ts`, `tests/unit/revalidate.test.ts`, `tests/unit/admin-nav.test.tsx`

**Interfaces:**
- Produces:
  - `type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string; fieldErrors?: Record<string, string> }`
  - `adminAction<S extends z.ZodTypeAny, T>(permission: Permission, schema: S, run: (input: z.infer<S>, user: UserDoc) => Promise<T>): (input: unknown) => Promise<ActionResult<T>>` — `ForbiddenError` → `{ ok: false, error: 'You do not have permission to do that.' }`; Zod errors → `fieldErrors` keyed by dotted path; any other error → logged by message only, `{ ok: false, error: 'Something went wrong. Please try again.' }` (known `UserFacingError` messages pass through).
  - `class UserFacingError extends Error` (in `action.ts`).
  - `refreshContent(change: { posts?: string[]; taxonomy?: boolean; pages?: string[]; settings?: boolean }): void` — calls `updateTag` for `POSTS_TAG` + `postTag(slug)` per post, `TAXONOMY_TAG`, `PAGES_TAG` + `pageTag(slug)`, `SETTINGS_TAG`.
  - `AdminNav` items filtered by `can(role, …)`: Dashboard, Posts, Categories, Tags, Media, Comments, Users (users.manage), Settings (settings.write), Profile.
- Shell: skip link, `<nav aria-label="Admin">`, `<main id="main">`, signed-in user + role + logout (existing `logoutAction`), collapses to a menu button under 768 px.

- [ ] **Step 1: Write failing tests** — `adminAction`: allowed role runs and returns `{ ok: true, data }`; `forged admin action is refused` (marketing user, `users.manage`) → error result, `run` never called; invalid input → `fieldErrors['title']`; thrown `Error('boom')` → generic message, `console.error` called without the input. `refreshContent({ posts: ['a'], taxonomy: true })` calls mocked `updateTag` with `'posts'`, `'post:a'`, `'taxonomy'`. `AdminNav` for marketing has no "Users"/"Settings" links; for admin has both.
- [ ] **Step 2: Run** `npx vitest run tests/unit/admin-action.test.ts tests/unit/revalidate.test.ts tests/unit/admin-nav.test.tsx` — Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** the files above; page-level guards use `requirePermission` → `forbidden()`; `forbidden.tsx` renders "You don't have access to this page" with a link to the dashboard (HTTP 403).
- [ ] **Step 4: Run** the same tests + `npx vitest run` + `npm run typecheck` — Expected: PASS; existing login/logout tests still pass.
- [ ] **Step 5: Commit** `feat(admin): panel shell, action wrapper, cache refresh`

### Task 2: Dashboard

**Files:** Modify `src/app/admin/(panel)/dashboard/page.tsx`; Create `src/lib/admin/dashboard.ts`; Test `tests/unit/admin-dashboard.test.ts`

**Interfaces:**
- Consumes: Task 1 shell; `PUBLIC_FILTER`.
- Produces: `loadDashboard(): Promise<{ counts: { published: number; scheduled: number; draft: number; trashed: number }; upcoming: { id: string; title: string; scheduledAt: string }[]; recent: { id: string; title: string; status: string; updatedAt: string }[] }>` (upcoming = next 5 scheduled; recent = last 5 updated, not trashed).

- [ ] **Step 1: Failing test** with memory Mongo: 2 published, 1 scheduled, 1 draft, 1 trashed → exact counts; `upcoming` ordered by `scheduledAt` asc; `recent` excludes trashed.
- [ ] **Step 2: Run** `npx vitest run tests/unit/admin-dashboard.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** loader + page: four count tiles (links to filtered post list), "Scheduled next", "Recently edited", "New post" button (shown with `blog.write`).
- [ ] **Step 4: Run** test — Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): dashboard`

### Task 3: Post service

**Files:** Create `src/lib/admin/posts.ts`, `src/lib/admin/post-schema.ts`; Test `tests/unit/admin-posts.test.ts`

**Interfaces:**
- Consumes: Blog/Category/Tag/User models, `sanitizeRichHtml`, `isAllowedImageUrl`, `toSlug`, `refreshContent`, `pingIndexNow`, `audit`.
- Produces:
  - `PostInputSchema` (Zod): `title` 1–200, `slug` optional (`/^[a-z0-9]+(-[a-z0-9]+)*$/`, ≤ 100), `shortDescription` ≤ 300, `content` HTML ≤ 200 000 chars, `featuredImage` (''/allowed image URL), `imageAltText` ≤ 200, `category` ObjectId|null, `tags` ObjectId[] ≤ 20, `authorId` ObjectId|null, `authorName` ≤ 100, `status` `draft|published|scheduled`, `scheduledAt` ISO string with offset (required when scheduled), `pinned`, `faqs` [{q ≤ 300, a ≤ 2000}] ≤ 20, `keyTakeaways` string ≤ 300 ×10, `sources` [{title, url https}] ≤ 20, `focusKeyword` ≤ 100, `secondaryKeywords` ≤ 20, `seo` {metaTitle ≤ 70, metaDescription ≤ 170, keywords, canonicalUrl (''/https), ogImage (''/allowed), noindex}, `lastReviewedAt` date|null, `expectedUpdatedAt` ISO|null (null = create).
  - `savePost(input, user): Promise<{ id: string; slug: string }>` — create or update; sanitised content; reading time = ceil(words/225), min 1; slug from title when empty, unique (suffix `-2`, `-3`…); slug change refused (`UserFacingError`) once `publishedAt` is set; first publish sets `publishedAt = now`; `scheduled` with past `scheduledAt` → published now; Marketing may only set `authorId` to themselves or null; stale `expectedUpdatedAt` → `UserFacingError('This post was changed by someone else. Reload to see the latest version.')`; refreshes `posts`/`post:<slug>`/`taxonomy`; pings IndexNow with the post URL when it is or was public.
  - `trashPost(id, user)`, `restorePost(id, user)`, `duplicatePost(id, user): Promise<{ id }>` (draft copy, title `"<title> (copy)"`, new slug, no `publishedAt`), `deletePostPermanently(id, user)` (only trashed posts).
  - `listAdminPosts({ status?: 'published'|'scheduled'|'draft'|'trash'; q?: string; category?: string; authorId?: string; page?: number }): Promise<{ items: AdminPostRow[]; page: number; pages: number; total: number }>` — 20 per page, newest `updatedAt` first; trash shows only `isDeleted`. Note the Blog soft-delete pre-find hook: trash queries must opt out of it the same way the model allows.
  - `getAdminPost(id): Promise<AdminPost | null>` (includes trashed; `updatedAt` ISO for the concurrency check).

- [ ] **Step 1: Failing tests** (memory Mongo): create draft → slug from title, reading time, not public; `post html is sanitised on save` (`<script>`, `onerror`, `javascript:` gone); duplicate title → `-2` slug; publish sets `publishedAt` and the post becomes public (`loadPost`); `published slug is locked`; `scheduled in the future stays hidden`, `scheduled in the past publishes now`; `scheduledAt "2026-11-01T09:00:00-05:00"` stored as `2026-11-01T14:00:00Z`; `stale save is rejected`; marketing setting another user as author → refused; trash → hidden + listed in trash; restore; permanent delete only for trashed; duplicate is a draft with a new slug; `refreshContent` and `pingIndexNow` (mocked) called with the slug/URL on publish, IndexNow not called for draft saves.
- [ ] **Step 2: Run** `npx vitest run tests/unit/admin-posts.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** the service (no UI).
- [ ] **Step 4: Run** test + full `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): post service with scheduling and concurrency check`

### Task 4: Post list and editor screens

**Files:** Create `src/app/admin/(panel)/posts/page.tsx`, `posts/new/page.tsx`, `posts/[id]/page.tsx`, `posts/actions.ts`, `src/components/admin/PostForm.tsx` (client), `src/components/admin/RichTextEditor.tsx` (client, Tiptap), `src/components/admin/RepeatableField.tsx` (FAQs/sources/takeaways), `src/components/admin/MediaPicker.tsx` (client; lists Task 7 media — renders a URL field until Task 7 lands); Test `tests/unit/post-actions.test.ts`, `tests/e2e/admin-posts.spec.ts`

**Interfaces:**
- Consumes: Task 3 service, Task 1 `adminAction`.
- Produces actions: `savePostAction` (`blog.write`; `blog.publish` additionally required when status ≠ draft), `trashPostAction`, `restorePostAction`, `duplicatePostAction` (`blog.write`), `deletePostAction` (`blog.deletePermanent`).
- List: status tabs with counts, search, category filter, table (title, status + date, author, category, updated), row actions; trash tab with Restore / Delete permanently (admin only).
- Editor: title, slug (read-only once published), Tiptap (headings H2–H4, bold, italic, lists, blockquote, links, images from media/URL, code), short description, featured image + alt, category, tags (multi-select), author, status (Draft / Publish now / Schedule + `datetime-local` — the form sends the browser's UTC offset with it), pinned; "AEO/GEO" section: key takeaways, FAQs, sources, focus + secondary keywords; "SEO" section: meta title/description with character counters, canonical, OG image, noindex, last reviewed. Unsaved-changes warning on navigation. "View post" link when public.

- [ ] **Step 1: Failing tests** — unit: `deletePostAction` as marketing → `{ ok: false }` and post still exists; `savePostAction` as marketing with `status: 'published'` works (marketing has `blog.publish`). e2e (`admin-posts.spec.ts`, signs in as seeded marketing user): create a post with an H2, a link and a FAQ → publish → visible at `/blog/<slug>` with the FAQ and in `/blog` list; edit title → change visible on the public page on reload; trash → public URL 404; axe on list and editor has no serious/critical violations; editor usable at 390 px.
- [ ] **Step 2: Run** `npx vitest run tests/unit/post-actions.test.ts` and `npx playwright test tests/e2e/admin-posts.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** screens and actions; add Tiptap deps (`npm i @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image`). The e2e launcher (`tests/e2e/server.ts`) also writes the marketing user's runtime-random credentials to `.e2e/` (extend `creds.ts`).
- [ ] **Step 4: Run** both + full unit suite — Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): post list and editor`

### Task 5: Scheduled publishing

**Files:** Create `src/app/api/cron/publish-scheduled/route.ts`, `vercel.json` (crons only); Modify `src/lib/env.ts` (`CRON_SECRET` optional, ≥ 32 chars), `src/lib/admin/posts.ts` (`publishDuePosts(now = new Date()): Promise<string[]>`), `src/proxy.ts` (let `/api/cron/*` through without admin gate), `.env.example` (placeholder only); Test `tests/unit/cron-publish.test.ts`

**Interfaces:**
- Produces: `GET /api/cron/publish-scheduled` — 503 when `CRON_SECRET` unset; 401 unless `Authorization: Bearer <CRON_SECRET>` (constant-time compare); else runs `publishDuePosts` and returns `{ published: string[] }`. `vercel.json`: `{ "crons": [{ "path": "/api/cron/publish-scheduled", "schedule": "*/5 * * * *" }] }`.
- `publishDuePosts`: `status: 'scheduled', scheduledAt <= now, isDeleted ≠ true` → `published`, `publishedAt = scheduledAt`; one `refreshContent` + one IndexNow ping with all URLs; audit `post.autopublish` (actor = the post's last editor, or the post's author).

- [ ] **Step 1: Failing tests:** due post published, future one untouched; second run publishes nothing (idempotent); route 401 with wrong/missing token, 503 without secret, 200 with it.
- [ ] **Step 2: Run** `npx vitest run tests/unit/cron-publish.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** test + full unit suite — Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): automatic go-live for scheduled posts`

### Task 6: Categories and tags

**Files:** Create `src/lib/admin/taxonomy.ts`, `src/app/admin/(panel)/categories/{page.tsx,actions.ts}`, `src/app/admin/(panel)/tags/{page.tsx,actions.ts}`; Test `tests/unit/admin-taxonomy.test.ts`

**Interfaces:**
- Produces: `saveCategory({ id?, name ≤ 80, slug?, description ≤ 300 }, user)`, `deleteCategory(id, user)`, `saveTag({ id?, name ≤ 50, slug?, serviceSlug: '' | <published service/landing page slug> }, user)`, `deleteTag(id, user)`, `listTaxonomyAdmin(kind)` → rows with post counts (all non-trashed posts).
- Rules: names and slugs unique (case-insensitive name; friendly error, not E11000); delete refused while any non-trashed post uses it ("Used by N posts"); deleting removes it from trashed posts' references; Marketing can create/edit (`taxonomy.write`), only Admin deletes (`taxonomy.delete`). Changing a slug that has public posts is allowed (tag/category pages are not ad landing pages) — Phase 6 redirects cover renames recorded in the audit log. Refresh `taxonomy` + `posts`.
- Screens: table with inline edit; tag form has "Related service" select of published service/landing pages.

- [ ] **Step 1: Failing tests:** create/rename/unique conflict message; delete in use refused; delete unused ok; marketing delete refused; serviceSlug must be a published page slug.
- [ ] **Step 2: Run** `npx vitest run tests/unit/admin-taxonomy.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): categories and tags`

### Task 7: Media library on S3

**Files:** Create `src/lib/db/models/Media.ts` (port of legacy `media` collection; adds `alt`), `src/lib/media/storage.ts`, `src/lib/media/upload.ts`, `src/app/admin/(panel)/media/{page.tsx,actions.ts}`; Modify `MediaPicker.tsx` (Task 4) to list/upload; Test `tests/unit/media-upload.test.ts`

**Interfaces:**
- `storage.ts`: `putObject(key: string, body: Buffer, contentType: string): Promise<void>`, `deleteObject(key: string): Promise<void>`, `publicUrl(key: string): string` (`AWS_S3_PUBLIC_URL_BASE` else `https://<bucket>.s3.<region>.amazonaws.com`) — the only module importing `@aws-sdk/client-s3`; credentials from env only.
- `upload.ts`: `processUpload(file: { name: string; bytes: Buffer }, user): Promise<MediaRow>` — sniff magic bytes (JPEG, PNG, WebP, GIF, AVIF only; SVG/HTML/anything else → `UserFacingError('Only JPEG, PNG, WebP, GIF or AVIF images are allowed.')`), empty or > 5 MB refused, `sharp` → WebP (quality 82, longest side ≤ 2400 px, metadata stripped), key `media/<yyyy>/<mm>/<random-16-hex>.webp`, Media doc with width/height/size/uploadedBy.
- Actions: `uploadMediaAction(formData)` (`media.write`), `updateMediaAction({ id, originalName, alt })`, `deleteMediaAction(id)` — Marketing only their own uploads, Admin any; delete removes the S3 object then the doc. Listing: grid, search by name, 40 per page, copy URL.

- [ ] **Step 1: Failing tests** (storage mocked with `vi.mock('@/lib/media/storage')`): real PNG → WebP put with `image/webp`, doc saved with dimensions; `.png` containing `<svg>` / `<html>` refused, nothing put; 6 MB refused; empty refused; marketing deleting another user's media refused; delete calls `deleteObject` with the key.
- [ ] **Step 2: Run** `npx vitest run tests/unit/media-upload.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement**; `npm i @aws-sdk/client-s3 sharp`.
- [ ] **Step 4: Run** test + full unit suite — Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): media library on S3`

### Task 8: Users, invites and password links

**Files:** Create `src/lib/admin/users.ts`, `src/app/admin/(panel)/users/{page.tsx,[id]/page.tsx,actions.ts}`, `src/app/admin/(auth)/reset-password/[token]/{page.tsx,actions.ts}`; Modify `src/lib/db/models/User.ts` (`createPasswordResetToken(minutes = RESET_TOKEN_EXPIRES_MINUTES)`); Test `tests/unit/admin-users.test.ts`, `tests/unit/reset-password.test.ts`

**Interfaces:**
- Produces (all `users.manage`): `inviteUser({ name, email, role }, admin): Promise<{ id: string; link: string }>` (creates an inactive-password user — random unguessable password never shown — and a 72 h set-password link `${SITE_URL}/admin/reset-password/<token>`), `issuePasswordLink(id, admin)` (30 min), `updateUser({ id, name, role, active, slug, bio, jobTitle, avatar, sameAs, expertise }, admin)`, `listUsers()`.
- Rules: email unique (friendly error); `last admin is protected` — cannot demote/deactivate the last active admin; an admin cannot deactivate or demote themselves; deactivation ends their sessions on the next request (existing `active` check); author slug unique, `/^[a-z0-9]+(-[a-z0-9]+)*$/`; `sameAs` https only; author changes refresh `posts` (bylines) and the author page.
- `resetPasswordAction({ token, password, confirm })` (public): token sha256-matched, unexpired, single-use (cleared on success); password 12–128 chars, must match confirm; sets `passwordChangedAt` (logs out old sessions); rate-limited per IP with the Phase 1 limiter; same generic error for unknown/expired token. Link shown once in the UI with a copy button; never logged or audited.

- [ ] **Step 1: Failing tests:** invite creates user + link whose token works once; expired token refused; short password refused; `last admin is protected`; self-deactivate refused; marketing calling `inviteUser` refused; audit `meta` contains no token/password.
- [ ] **Step 2: Run** `npx vitest run tests/unit/admin-users.test.ts tests/unit/reset-password.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — Expected: PASS; existing `user-model`/`session` tests still pass.
- [ ] **Step 5: Commit** `feat(admin): users, invites and set-password links`

### Task 9: Own profile

**Files:** Create `src/app/admin/(panel)/profile/{page.tsx,actions.ts}`; Test `tests/unit/profile-actions.test.ts`

**Interfaces:**
- Produces: `updateProfileAction({ name, slug, bio ≤ 1000, jobTitle ≤ 100, avatar, sameAs, expertise })` (`profile.self`, always the signed-in user; role/active/email not accepted), `changePasswordAction({ current, password, confirm })` (current must match; 12–128; sets `passwordChangedAt`, re-issues the caller's session cookie so they stay signed in).
- Shows "Your public author page" link when the user has a slug and ≥ 1 public post.

- [ ] **Step 1: Failing tests:** extra `role: 'admin'` in input ignored; wrong current password refused; success changes hash and other sessions become invalid (`changedPasswordAfter`).
- [ ] **Step 2: Run** `npx vitest run tests/unit/profile-actions.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): own profile and password change`

### Task 10: Site settings, navigation menus and offices

**Files:** Create `src/app/admin/(panel)/settings/{page.tsx,actions.ts}`, `src/components/admin/NavEditor.tsx` (client); Modify `src/lib/content/settings.ts` (add `organization.offices`), `src/lib/seo/jsonld.ts`, `src/components/site/Footer.tsx`, the contact page block that shows the address; Test `tests/unit/settings-actions.test.ts`, extend `tests/unit/settings.test.ts` and `tests/unit/seo.test.tsx`

**Interfaces:**
- `organization.offices`: `[{ label ≤ 60, street, city, region, postalCode, country: 'US' | 'IN', phone }]` ≤ 5, default `[]`. The existing `organization.address` stays the primary US address (schema `addressCountry: US`).
- JSON-LD: Organization keeps the US `address`; each office becomes a `location` `Place` with its `PostalAddress` (`addressCountry` `US`/`IN`). Footer and contact show the primary address plus each office under its label.
- `saveSettingsAction(section, value)` (`settings.write`; `headerNav`/`headerCta`/`footer` sections need `nav.write`): validates with the existing per-field schemas (`isValidSettingsField`), writes only that field, refreshes `settings`, audits `settings.update` with the section name.
- Screen sections: Organization (name, legal name, email, phone, address, offices, hours, description), Brand (logo, default OG image via media picker — allowed image hosts only), Social, WhatsApp, Header menu + CTA (NavEditor: add/remove/reorder items and children with up/down buttons, no drag-and-drop), Footer. Integrations stay out (Phase 5).

- [ ] **Step 1: Failing tests:** marketing save refused; invalid href in nav refused with field error; valid nav saved and `loadSiteSettings()` returns it; India office appears in JSON-LD `location` with `addressCountry: 'IN'` and in the footer render.
- [ ] **Step 2: Run** `npx vitest run tests/unit/settings-actions.test.ts tests/unit/settings.test.ts tests/unit/seo.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** + full unit + `npx playwright test tests/e2e/site-chrome.spec.ts` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): site settings, menus and offices`

### Task 11: Comments (read-only)

**Files:** Create `src/lib/db/models/Comment.ts` (port), `src/app/admin/(panel)/comments/page.tsx`; Test `tests/unit/admin-comments.test.ts`

**Interfaces:** `listComments({ status?, page? })` → rows with post title, name, status, date, content (plain text, escaped by React); 30 per page; `blog.write` to view. Email and IP are not shown.

- [ ] **Step 1: Failing test:** list returns post titles and omits `email`/`ipAddress`.
- [ ] **Step 2: Run** `npx vitest run tests/unit/admin-comments.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): read-only comments list`

### Task 12: Admin e2e, accessibility and permission sweep

**Files:** Create `tests/e2e/admin-panel.spec.ts`; Modify `tests/e2e/server.ts` (runtime-random `CRON_SECRET` in the server env and `.e2e/`; the marketing user comes from Task 4)

- [ ] **Step 1: Write e2e:** for admin and marketing, every nav screen loads (200), has one `<h1>`, axe clean (serious/critical), no console errors, no horizontal scroll at 390 px; marketing opening `/admin/users` and `/admin/settings` → 403 page; admin invites a user, opens the link in a fresh context, sets a password, signs in; schedule a post 1 minute ahead, call the cron route with the runtime secret, post becomes public.
- [ ] **Step 2: Run** `npm run e2e` — Expected: new specs FAIL only where screens are missing/buggy; fix in place (bugs, not new scope).
- [ ] **Step 3: Run** `npx vitest run`, `npm run typecheck`, `npm run lint`, `npm run e2e` — Expected: all PASS.
- [ ] **Step 4: Commit** `test(admin): panel e2e and accessibility`

### Task 13: Public performance as a hard budget

**Files:** Modify `lighthouserc.json` (performance and LCP from `warn` to `error`: performance ≥ 0.95 mobile, LCP ≤ 2500 ms, CLS ≤ 0.1, TBT ≤ 200 ms), plus whatever the measurements implicate (expected: CSS size, hero image/fonts preload, third-party script timing for the Ads tag and Elfsight reviews).

- [ ] **Step 1: Change the budgets and run** `npm run lhci` — Expected: FAIL on the templates currently at 0.86–0.91 (this is the failing test).
- [ ] **Step 2: Diagnose** each failing template from the Lighthouse report (largest opportunities first); record findings in the ledger.
- [ ] **Step 3: Fix** one cause at a time, re-running `npm run lhci` after each; never relax a budget or drop a template to pass.
- [ ] **Step 4: Run** `npm run lhci`, `npm run e2e`, `npx vitest run` — Expected: all PASS; README Lighthouse table updated.
- [ ] **Step 5: Commit** `perf: public pages meet the hard Lighthouse budget`

## Phase 4 done when

- Every task's tests pass; full unit + e2e suites, typecheck and lint are green; Lighthouse passes as **errors** (no warnings) on all public templates.
- A Marketing user can write, schedule, publish, trash and restore posts, manage categories/tags and media, and edit their author profile — and is refused everything else.
- An Admin can additionally permanently delete, manage users (invite, roles, deactivate, password links), edit settings, menus and offices.
- Owner-supplied before cutover (not blocking): `CRON_SECRET`, S3 variables, India office details, production DB copy (Phase 6).
