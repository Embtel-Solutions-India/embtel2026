# Phase 6 — Cutover Preparation Plan (short form)

> Native execution, fast mode. **Owner rule (2026-10-23): nothing is merged to `main`, pushed, deployed or run against the real database / DNS / live services until the owner says so for that specific step.** This phase builds and rehearses everything locally and ends with a runbook whose live steps are each gated on the owner.

**Goal:** Every legacy URL keeps working, the production database can be migrated safely (rehearsed on a legacy-shaped copy), cutover is a checklist with owner gates and a rollback, and launch monitoring is defined.

**Spec:** `docs/superpowers/specs/2026-10-21-nextjs-migration-design.md` §7 (Migration and cutover), §2 goal 4, §4 anti-goals.

## Rulings carried in
- Legacy URL forms are redirected with **HTTP 301** in one place, `redirects.ts` (repo root, per spec 6.2), applied by `next.config` before the proxy runs.
- Imported posts get real authors through an **interactive operator script** run on the production copy (owner supplies the DB); nothing guesses authors.
- The legacy default admin is handled by an **interactive account review** (keep / deactivate / issue a set-password link) — no email addresses or passwords in code.
- Ads landing pages: the 4 automation pages stay locked (spec §7 default) until the owner confirms the list.
- Legacy folders (`embtel-final/`, `blog-admin/`) are removed only after launch and only on the owner's go.

## Tasks
1. **Legacy redirects** — `redirects.ts`: `/<page>.html` → `/<page>`, `/index.html` → `/`, `/blog.html` → `/blog`, `/blog-details(.html)?slug=<s>` → `/blog/<s>` (no slug → `/blog`), `/da-ai/*` → `/`, `/terms`-style aliases only if found in the inventory. Unit test (table of from → to) + e2e (real 301 + one hop to a 200).
2. **Parity checker** — `scripts/cutover/parity.ts <baseUrl> [--inventory file.csv]`: inventory = every legacy page and `.html` form, blog + post URLs, legacy blog-details URLs, plus an optional Search Console "Pages" CSV export. Each URL must be 200, or one 301/308 to a 200; reports canonical/noindex per URL. Unit-tested core; rehearsed against the local production build.
3. **Accounts + authors (operator scripts)** — `scripts/cutover/accounts.ts` (review every user: keep, deactivate, or print a one-time set-password link; counts only in logs) and `scripts/cutover/assign-authors.ts` (posts without an author user → pick an author per post or one for all). Both: interactive TTY, show the database name and require typing it (existing cutover guard). Unit-tested service functions.
4. **Rehearsal test** — a legacy-shaped database (users with `editor` role, legacy blog/category/tag docs, settings with legacy fields, comments, media) → migration 001 → content seed → assign authors → public loaders and admin login work, nothing legacy lost.
5. **Runbook + CI** — `docs/cutover-runbook.md`: owner inputs, numbered steps each marked **[owner go]** where live, exact commands, Vercel env list, DNS (TTL 48 h before), parity + Lighthouse + Ads tag checks, rollback (revert DNS; old host untouched 2 weeks), post-launch monitoring (daily 2 weeks, weekly to week 4), sitemap submission, legacy folder removal. CI comment fixes (performance is a hard gate now). Final review.
