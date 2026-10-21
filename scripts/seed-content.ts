// Seeds content/settings.json and content/pages/*.json into the database. Idempotent: existing pages
// are never overwritten unless named with --force=<slug>[,<slug>]. Prints counts only.
// Usage: npm run content:seed [-- --force=home,about] [-- --yes]   (--yes required against production)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import mongoose from 'mongoose';
import type { Page } from '../src/lib/content/blocks';
import { seedContent } from '../src/lib/content/seed';
import { SiteSettingsSchema, type SiteSettings } from '../src/lib/content/settings';

export function readContent(dir = 'content'): { pages: Page[]; settings: SiteSettings } {
  const pagesDir = join(dir, 'pages');
  const pages = readdirSync(pagesDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(pagesDir, f), 'utf8')) as Page);
  const settings = SiteSettingsSchema.parse(JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8')));
  return { pages, settings };
}

async function main() {
  const args = process.argv.slice(2);
  if (process.env.VERCEL_ENV === 'production' && !args.includes('--yes')) {
    console.error('Refusing to seed production without --yes.');
    process.exitCode = 1;
    return;
  }
  const force = args.find((a) => a.startsWith('--force='))?.slice('--force='.length).split(',').filter(Boolean) ?? [];
  const r = await seedContent({ ...readContent(), force });
  console.log(`pages inserted: ${r.inserted.length}, skipped (already present): ${r.skipped.length}, settings fields filled: ${r.settingsFieldsFilled.length}`);
  console.log('Cached pages refresh on the next deploy (or, from Phase 5, on publish).');
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/seed-content.ts')) {
  main()
    .catch((e) => {
      console.error(e instanceof Error ? e.message : 'seed failed');
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
