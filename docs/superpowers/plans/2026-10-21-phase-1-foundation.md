# Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Next.js TypeScript app at the repo root with safe config, MongoDB access, the User model, Admin/Marketing permissions, working admin login/logout, security headers, an audit log and CI — the base every later phase builds on.

**Architecture:** One Next.js App Router app in `src/`. Legacy `embtel-final/` and `blog-admin/` stay untouched (still serving production) until Phase 6. Sessions are a signed JWT in an httpOnly cookie (same model as legacy), verified in `middleware.ts` for `/admin/*` and re-checked against the DB in server code. Permissions are one static map checked by every server action.

**Tech Stack:** Next.js 16.x (App Router, TS strict), Node ≥ 20.9, Tailwind CSS 4, Mongoose 8, Zod 3, `jose` (JWT, Edge-compatible), `bcryptjs` (compatible with legacy `$2a$12$` hashes), Vitest + `mongodb-memory-server`, Playwright, GitHub Actions, gitleaks.

**Spec:** `docs/superpowers/specs/2026-10-21-nextjs-migration-design.md` (sections 5, 6.1, 6.2, 6.5, 6.9)

## Global Constraints

- **No secret, password, token, key, connection string or default credential anywhere in the repo** — not in env fallbacks, seeds, tests, fixtures, docs or `.env.example` (placeholders like `<set-in-vercel>` only). Tests generate secrets at runtime (`crypto.randomBytes`).
- Missing required env var → process fails at startup naming the variable; values are never logged.
- Roles are exactly `'admin' | 'marketing'`. Legacy `'editor'` maps to `'marketing'`.
- Existing users' bcrypt hashes must verify unchanged; new hashes use cost 12.
- Session cookie: name `session`, `httpOnly`, `Secure` in production, `SameSite=Lax`, 1 day (30 days with "remember me").
- Canonical origin: `https://www.embtelsolutions.com`.
- Do not modify anything under `embtel-final/` or `blog-admin/` in this phase.
- Package manager: npm. Commit messages: conventional commits.

## Review Focus

- A deactivated user, or a token issued before the user's last password change, still holding a valid cookie → must be rejected (Task 6 test `rejects stale sessions`).
- Login `?redirect=` pointing off-site (`https://evil.com`, `//evil.com`, `/\evil.com`) → must fall back to `/admin/dashboard` (Task 7 test `safeRedirect`).
- Legacy DB user whose hash starts with `$2a$12$` → logs in without reset (Task 5 test `verifies legacy bcryptjs hash`).
- Login email typed with capitals/spaces → matches the stored lowercase email (Task 7 test).
- Brute-force login → 10 failed attempts per email+IP in 15 min blocks further attempts with a generic message (Task 7 test `rate limits login`).

---

### Task 1: Repo hygiene and Next.js scaffold

**Files:**
- Create: `.gitignore`, `.editorconfig`, `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx` (temporary placeholder: "Embtel — coming soon", `robots: noindex`), `vitest.config.ts`, `playwright.config.ts`, `.env.example`, `README.md`
- Remove from git index: root `node_modules/` (`git rm -r --cached node_modules`)

- [ ] **Step 1:** Create branch `feat/nextjs-foundation`.
- [ ] **Step 2:** Root `.gitignore` covering `node_modules/`, `.next/`, `.env*` (except `.env.example`), `coverage/`, `playwright-report/`, `test-results/`, `*.log`, `.DS_Store`, `.vercel/`. Run `git rm -r --cached node_modules`. Verify: `git ls-files | grep -c ^node_modules/` → `0`.
- [ ] **Step 3:** Scaffold with `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm` into the root (move legacy-conflicting files aside if the CLI refuses a non-empty dir; legacy folders are untouched). Enable `"strict": true`.
- [ ] **Step 4:** Add Vitest (`npm i -D vitest @vitest/coverage-v8 mongodb-memory-server`) and Playwright (`npm i -D @playwright/test`). Scripts: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `e2e` (`playwright test`).
- [ ] **Step 5:** `.env.example` lists every var from Task 2 with `<set-in-vercel>` placeholders and a one-line comment each. README: setup, scripts, "secrets never go in the repo".
- [ ] **Step 6:** Verify `npm run typecheck && npm run lint && npm run build` all pass.
- [ ] **Step 7:** Commit `chore: scaffold Next.js app and untrack node_modules`.

### Task 2: Validated environment config

**Files:**
- Create: `src/lib/env.ts`
- Test: `tests/unit/env.test.ts`

**Interfaces:**
- Produces: `parseEnv(source: Record<string, string | undefined>): Env` and `env: Env` (lazy, parses `process.env` on first access). `Env = { NODE_ENV: 'development'|'test'|'production'; SITE_URL: string; MONGODB_URI: string; SESSION_SECRET: string; ENCRYPTION_KEY: string; AWS_S3_BUCKET: string; AWS_REGION: string; AWS_ACCESS_KEY_ID: string; AWS_SECRET_ACCESS_KEY: string; AWS_S3_PUBLIC_URL_BASE?: string; SMTP_HOST?: string; SMTP_PORT: number; SMTP_USER?: string; SMTP_PASS?: string; SMTP_FROM?: string }`.

- [ ] **Step 1: Write failing tests**

```ts
it('throws naming every missing required var, without values', () => {
  expect(() => parseEnv({ MONGODB_URI: 'mongodb://secret-host/x' }))
    .toThrowError(/SESSION_SECRET[\s\S]*ENCRYPTION_KEY/);
  try { parseEnv({ MONGODB_URI: 'mongodb://secret-host/x' }); } catch (e) {
    expect(String(e)).not.toContain('secret-host');
  }
});
it('rejects SESSION_SECRET shorter than 32 chars', () => { /* expect throw /SESSION_SECRET/ */ });
it('rejects ENCRYPTION_KEY that is not 32 bytes base64', () => { /* expect throw /ENCRYPTION_KEY/ */ });
it('defaults SMTP_PORT to 587 and SITE_URL has no trailing slash', () => { /* valid input → env.SMTP_PORT === 587 */ });
```

- [ ] **Step 2:** Run `npx vitest run tests/unit/env.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement with a Zod schema; on failure throw `Error('Invalid environment: ' + issues.map(i => i.path.join('.')).join(', '))` — paths only. No default for any secret.
- [ ] **Step 4:** Run tests → PASS.
- [ ] **Step 5:** Commit `feat: validated env config with no secret defaults`.

### Task 3: Database connection

**Files:**
- Create: `src/lib/db/connect.ts`
- Test: `tests/unit/db-connect.test.ts`, `tests/helpers/mongo.ts`

**Interfaces:**
- Produces: `connectDB(): Promise<typeof mongoose>` — caches the connection promise on `globalThis.__mongoose` so serverless invocations and hot reload reuse it; `strictQuery: true`. Test helper `startMemoryMongo(): Promise<{ uri: string; stop(): Promise<void> }>`.

- [ ] **Step 1:** Test `returns the same connection on repeated calls` (call twice against memory server → same object, `mongoose.connection.readyState === 1`).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: cached MongoDB connection`.

### Task 4: Permissions map

**Files:**
- Create: `src/lib/auth/permissions.ts`
- Test: `tests/unit/permissions.test.ts`

**Interfaces:**
- Produces: `type Role = 'admin' | 'marketing'`; `type Permission = 'blog.write' | 'blog.publish' | 'blog.deletePermanent' | 'taxonomy.write' | 'taxonomy.delete' | 'media.write' | 'seo.write' | 'seo.insights' | 'page.editContent' | 'page.publish' | 'page.editLocked' | 'page.create' | 'page.delete' | 'nav.write' | 'settings.write' | 'integrations.write' | 'users.manage' | 'leads.view' | 'leads.export' | 'leads.delete' | 'audit.view' | 'profile.self'`; `can(role: Role, permission: Permission): boolean`; `normalizeRole(raw: string): Role` (`'editor'` → `'marketing'`, unknown → throws).

- [ ] **Step 1:** Table-driven test of the full matrix from spec 6.5. Marketing **true** for: `blog.write, blog.publish, taxonomy.write, media.write, seo.write, seo.insights, page.editContent, leads.view, profile.self`. Marketing **false** for all others. Admin **true** for every permission. Plus `normalizeRole('editor') === 'marketing'` and `normalizeRole('root')` throws.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement as a `Record<Role, ReadonlySet<Permission>>`. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: role permission map`.

### Task 5: User model

**Files:**
- Create: `src/lib/db/models/User.ts`
- Test: `tests/unit/user-model.test.ts`

**Interfaces:**
- Consumes: `connectDB` (Task 3), `Role` (Task 4).
- Produces: Mongoose model `User` on the existing `users` collection with legacy fields (`name, email (unique, lowercase, trimmed), password (select:false), role, avatar, active, lastLoginAt, passwordChangedAt, passwordResetToken, passwordResetExpires`) plus author fields (`slug` unique sparse, `bio`, `jobTitle`, `sameAs: string[]`, `expertise: string[]`). `role` enum `['admin','marketing']`. Methods: `comparePassword(candidate: string): Promise<boolean>`, `changedPasswordAfter(jwtIatSeconds: number): boolean`, `createPasswordResetToken(): string` (stores sha256, 30-min expiry), `toSafeJSON()`. Pre-save hashes with bcryptjs cost 12 and sets `passwordChangedAt` on change.

- [ ] **Step 1: Failing tests:** `hashes on save with cost 12` (`password` starts `$2a$12$` or `$2b$12$`); `verifies legacy bcryptjs hash` (insert raw doc with a hash generated in-test via `bcryptjs.hashSync(pw, 12)` using `collection.insertOne` to bypass hooks → `comparePassword(pw)` true); `toSafeJSON omits password and reset fields`; `changedPasswordAfter` true only when change is later than iat; `reset token stored hashed`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: User model compatible with legacy collection`.

### Task 6: Sessions

**Files:**
- Create: `src/lib/auth/session.ts` (server-only), `src/lib/auth/token.ts` (Edge-safe)
- Test: `tests/unit/session.test.ts`

**Interfaces:**
- Consumes: `env.SESSION_SECRET`, `User`, `can`.
- Produces:
  - `token.ts`: `signSessionToken(userId: string, remember: boolean): Promise<string>` (HS256, `exp` 1 d or 30 d, `iat`); `verifySessionToken(token: string): Promise<{ sub: string; iat: number } | null>`.
  - `session.ts`: `setSessionCookie(userId: string, remember: boolean): Promise<void>`; `clearSessionCookie(): Promise<void>`; `getCurrentUser(): Promise<UserDoc | null>` (verifies token, loads user, rejects inactive or `changedPasswordAfter(iat)`); `requireUser(): Promise<UserDoc>` (redirects to `/admin/login`); `requirePermission(p: Permission): Promise<UserDoc>` (throws `ForbiddenError`).

- [ ] **Step 1: Failing tests:** sign→verify round-trip; tampered token → `null`; expired token → `null`; `rejects stale sessions` — `getCurrentUser` returns `null` for (a) `active:false` user, (b) password changed after `iat`; `requirePermission('users.manage')` throws for marketing, returns user for admin.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement (cookies via `next/headers`; mock it in tests). **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: JWT cookie sessions with stale-session checks`.

### Task 7: Login, logout, admin guard

**Files:**
- Create: `src/app/admin/(auth)/login/page.tsx`, `src/app/admin/(auth)/login/actions.ts`, `src/app/admin/dashboard/page.tsx` (placeholder showing name + role), `src/app/admin/logout/route.ts` (POST), `src/middleware.ts`, `src/lib/auth/redirect.ts`, `src/lib/auth/rate-limit.ts`, `src/lib/db/models/RateLimit.ts`
- Test: `tests/unit/redirect.test.ts`, `tests/unit/rate-limit.test.ts`, `tests/e2e/admin-auth.spec.ts`

**Interfaces:**
- Consumes: Task 6.
- Produces: `safeRedirect(target: string | null, fallback = '/admin/dashboard'): string` (allows only paths starting with `/admin/` and not `//` or `/\`); `hitRateLimit(key: string, max: number, windowSec: number): Promise<{ allowed: boolean }>` backed by a Mongo collection with a TTL index (no extra service); `loginAction(prev, formData)` server action returning `{ error?: string }`.

- [ ] **Step 1: Failing unit tests:** `safeRedirect` cases — `/admin/blogs` kept; `https://evil.com`, `//evil.com`, `/\\evil.com`, `/blog` → fallback. `rate limits login` — 10 hits allowed, 11th `allowed:false`, new window allowed.
- [ ] **Step 2: Failing e2e** (Playwright, memory Mongo, test user created in `globalSetup` with a runtime-random password): wrong password → generic "Incorrect email or password."; `  Admin@Example.com ` with right password → lands on `/admin/dashboard` showing role; unauthenticated `/admin/dashboard` → redirected to `/admin/login?redirect=%2Fadmin%2Fdashboard`; logout → back to login, dashboard blocked again.
- [ ] **Step 3:** Run both → FAIL.
- [ ] **Step 4:** Implement. Middleware: for `/admin/*` except `/admin/login|forgot-password|reset-password/*`, `verifySessionToken` from cookie or redirect; it only checks signature/expiry (Edge), DB checks happen in `requireUser`. Login action: Zod-validate, lowercase/trim email, rate-limit key `login:${email}:${ip}`, generic error on any failure, update `lastLoginAt`, set cookie, `redirect(safeRedirect(...))`. Login page labelled fields, `autocomplete` attributes, `noindex`.
- [ ] **Step 5:** Run unit + e2e → PASS.
- [ ] **Step 6:** Commit `feat: admin login, logout and route guard`.

### Task 8: Admin CLI and DB migration

**Files:**
- Create: `scripts/create-admin.ts`, `scripts/migrate-db.ts`, `src/lib/db/migrations/001-roles-and-authors.ts`
- Test: `tests/unit/migration-001.test.ts`

**Interfaces:**
- Produces: `runMigration001(db: mongoose.Connection): Promise<{ rolesUpdated: number; slugsAdded: number }>` — sets `role:'marketing'` where `'editor'`; adds unique `slug` (slugified name, numeric suffix on collision) where missing; idempotent. `create-admin.ts` prompts (stdin, hidden password, min 12 chars) for name/email/password and creates an `admin` — never reads credentials from args or files.

- [ ] **Step 1: Failing tests:** editor→marketing; two users named "Alex Kim" → `alex-kim`, `alex-kim-2`; running twice → second run returns `{0,0}`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement; `migrate-db.ts` runs pending migrations recorded in a `migrations` collection. **Step 4:** Run → PASS.
- [ ] **Step 5:** Scripts in package.json: `db:migrate`, `admin:create` (via `tsx`).
- [ ] **Step 6:** Commit `feat: first-admin CLI and role/author migration`.

### Task 9: Audit log

**Files:**
- Create: `src/lib/db/models/AuditLog.ts`, `src/lib/audit.ts`
- Test: `tests/unit/audit.test.ts`

**Interfaces:**
- Produces: `audit(entry: { actorId: string; action: string; target: { type: string; id?: string }; meta?: Record<string, unknown> }): Promise<void>` — `action` like `'blog.publish'`; strips keys matching `/password|token|secret|key/i` from `meta` before saving. Model indexed on `createdAt` desc and `actorId`.

- [ ] **Step 1:** Failing tests: entry saved with timestamp; `meta: { apiToken: 'x', title: 'Hi' }` saved as `{ title: 'Hi' }`.
- [ ] **Step 2–4:** FAIL → implement → PASS. Call `audit` from login (`auth.login`) and logout.
- [ ] **Step 5:** Commit `feat: audit log with secret scrubbing`.

### Task 10: Security headers

**Files:**
- Modify: `src/middleware.ts`, `next.config.ts`
- Test: `tests/e2e/security-headers.spec.ts`

**Interfaces:**
- Produces: per-request CSP nonce available via `headers().get('x-nonce')` for later phases' `next/script` tags.

- [ ] **Step 1: Failing e2e:** `/` and `/admin/login` responses include `Content-Security-Policy` with `script-src 'self' 'nonce-…'` and **no** `'unsafe-inline'` in `script-src`; `Strict-Transport-Security` (`max-age=63072000; includeSubDomains; preload`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geolocation off); `/admin/*` also has `X-Robots-Tag: noindex, nofollow` and `frame-ancestors 'none'`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement nonce CSP in middleware (allow-list for later third-party domains lives in one exported constant `CSP_SOURCES` in `src/lib/security/csp.ts`; Phase 5 extends it). **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: strict security headers with CSP nonces`.

### Task 11: CI

**Files:**
- Create: `.github/workflows/ci.yml`, `.gitleaks.toml` (default rules + allowlist only for `.env.example` placeholders)

- [ ] **Step 1:** Workflow on push/PR: Node 20, `npm ci`, `typecheck`, `lint`, `test`, `build`, Playwright e2e (installs browsers, uses memory Mongo), `gitleaks/gitleaks-action`, `npm audit --audit-level=high`. Add `.github/dependabot.yml` (npm + actions, weekly).
- [ ] **Step 2:** Verify gitleaks blocks: on a throwaway branch commit a fake AWS-shaped key → CI red; delete the branch. Then real PR → all green.
- [ ] **Step 3:** Connect repo to Vercel (preview deploys per PR, env vars set in Vercel per environment). Verify preview URL serves the placeholder with `noindex`.
- [ ] **Step 4:** Commit `ci: typecheck, lint, tests, e2e, secret scan, audit`.

---

## Phase 1 done when

- `npm run typecheck && npm run lint && npm test && npm run e2e && npm run build` pass locally and in CI; gitleaks clean.
- A Vercel preview exists; an admin created via `npm run admin:create` against a staging DB can log in, see role, log out.
- `git ls-files` shows no `node_modules`, no `.env`, no secrets; legacy folders unchanged.
