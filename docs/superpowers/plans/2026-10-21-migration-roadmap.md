# Embtel Next.js Migration — Roadmap

**Spec:** `docs/superpowers/specs/2026-10-21-nextjs-migration-design.md`

The spec covers six subsystems. Each gets its own plan, written when the previous one is merged, so every plan builds on interfaces that actually exist rather than guessed ones. Each phase ships working, tested software on a Vercel preview; nothing touches production DNS until Phase 6.

| Phase | Plan | Ships | Depends on |
|---|---|---|---|
| 1 | `2026-10-21-phase-1-foundation.md` | Next.js app in repo root, env/secret handling, DB + User model, roles & permissions, admin login/logout, security headers, audit log, CI (typecheck, lint, test, build, gitleaks) | — |
| 2 | `2026-10-22-phase-2-public-site.md` | Brand tokens + components, Page model + block renderers, header/footer/nav from Settings, SEO system (metadata, JSON-LD, sitemap, robots, llms.txt, OG images, IndexNow), Ads tag + Elfsight, a11y rules, **legacy page importer + content seeding** (moved from P6), Lighthouse CI. Rendering: nonce CSP everywhere + `'use cache'` (owner decision A) | 1 |
| 3 | `2026-10-22-phase-3-blog.md` | Blog/Category/Tag/Author models (extended), `/blog`, category/tag/author pages, post page with FAQ/takeaways/sources, related content, static-post import, **RSS feed** (moved from P2), sitemap/llms.txt entries for posts | 1, 2 |
| 4 | phase-4-admin-core | Admin shell, forgot/reset password (hashed single-use tokens, SMTP), ports of dashboard, blogs (Tiptap, schedule, trash, duplicate, pin), categories, tags, media (S3), users, settings, profile, comments (read-only) — all behind the permission map | 1, 3 |
| 5 | phase-5-admin-growth | Page/block editor + locked pages, SEO score panel + SERP preview, Search Console insights + cron, Integrations screen (encrypted secrets, script loader), Leads pipeline (GHL) **incl. the contact form** (moved from P2), audit-log viewer | 2, 4 |
| 6 | phase-6-cutover | DB migration on prod copy, redirects, parity checks (URL inventory, Lighthouse, Ads page visual diff, tag verification), production secret rotation (JWT/session, S3 keys), DNS cutover, rollback, post-launch monitoring, legacy folder removal | 1–5 |

Rough effort (one experienced engineer): P1 3–4 d · P2 6–8 d · P3 3–4 d · P4 6–8 d · P5 8–10 d · P6 3–4 d + 4 weeks monitoring.
