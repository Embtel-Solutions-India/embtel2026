# Embtel Solutions

Next.js (TypeScript) app for the Embtel Solutions site and admin. The legacy static site (`embtel-final/`) and Express admin (`blog-admin/`) are kept untouched while features migrate.

## Setup

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
| `npm run db:migrate` | Apply pending DB migrations (idempotent) |
| `npm run admin:create` | Interactively create an admin user |

## Secrets

Secrets never go in the repo. `.env.example` holds placeholders only; real values live in `.env.local` (git-ignored) and in Vercel project settings.

## Operator scripts

`npm run db:migrate` and `npm run admin:create` connect to the real database and load `.env.local` (`tsx --env-file=.env.local`). Populate it first, e.g. `vercel env pull .env.local`. To use another file, run `npx tsx --env-file=<file> scripts/migrate-db.ts` directly. `admin:create` prompts for name, email and password (hidden, entered twice, min 12 chars); credentials are never read from arguments, env or files.

## CI

`.github/workflows/ci.yml` runs on every push and pull request (Node 20): typecheck, lint, unit tests, build, Playwright e2e (in-memory MongoDB), gitleaks, `npm audit`. Dependabot (`.github/dependabot.yml`) opens weekly npm (root only) and GitHub Actions updates.

- **gitleaks**: `.gitleaks.toml` extends the default rules and allowlists only the `<set-in-vercel>` placeholder in `.env.example`. `gitleaks/gitleaks-action@v2` is free for personal repos; org-owned repos need a `GITLEAKS_LICENSE` repository secret.
- **Known audit exceptions**: the blocking gate is `npm audit --omit=dev --audit-level=high` (shipped dependencies; clean). The full audit runs non-blocking because `braces` (GHSA-vfj7-8cjw-p6xm, high, dev-only via `eslint-config-next` > `fast-glob` > `micromatch`) has no patched release yet. Remove `continue-on-error` and `--omit=dev` once a fix ships.

## Vercel (owner steps)

1. In Vercel, import the GitHub repo as a new project (framework: Next.js, root directory: repo root).
2. Under Settings > Environment Variables, add every variable listed in `.env.example` separately for Production, Preview and Development, with real values for each environment.
3. Pull requests get a Preview deployment automatically once the repo is linked. Check the preview serves with `noindex`.

## Known legacy secrets

The legacy `blog-admin/` code (removed in Phase 6) hardcodes a default admin password as a fallback for `SEED_ADMIN_PASSWORD` in `blog-admin/server/config/env.js`. gitleaks' default rules do not flag it, so it is documented here instead. Treat that credential as compromised: rotate it anywhere it was ever used and never deploy the legacy admin with the default. `AWS_SECRET_ACCESS_KEY` there defaults to an empty string (no secret).
