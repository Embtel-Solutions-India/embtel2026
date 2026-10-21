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

`db:migrate` and `admin:create` connect to the real database and need the full environment loaded (for example `vercel env pull .env.local`, then run with that env exported). `admin:create` prompts for name, email and password (hidden, entered twice, min 12 chars); credentials are never read from arguments, env or files.
