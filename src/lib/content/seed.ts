import { connectDB } from '@/lib/db/connect';
import { PageModel } from '@/lib/db/models/Page';
import { Settings } from '@/lib/db/models/Settings';
import { PageSchema, type Page } from './blocks';
import type { SiteSettings } from './settings';

const isEmpty = (v: unknown) =>
  v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0);

// Idempotent content seeding. Existing pages are never touched (admin edits win) unless their
// slug is listed in `force`; settings only get fields that are empty in the stored document.
export async function seedContent(opts: { pages: Page[]; settings: SiteSettings; force?: string[] }) {
  const invalid = opts.pages.filter((p) => !PageSchema.safeParse(p).success).map((p) => p.slug);
  if (invalid.length) throw new Error(`[seed] invalid page(s): ${invalid.join(', ')}`);

  await connectDB();
  const force = new Set(opts.force ?? []);
  const existing = new Set((await PageModel.distinct('slug')) as string[]);
  const inserted: string[] = [];
  const skipped: string[] = [];
  const now = new Date();
  for (const page of opts.pages) {
    if (existing.has(page.slug) && !force.has(page.slug)) {
      skipped.push(page.slug);
      continue;
    }
    await PageModel.collection.replaceOne(
      { slug: page.slug },
      { ...page, ...(page.status === 'published' && { publishedAt: now }), createdAt: now, updatedAt: now },
      { upsert: true },
    );
    inserted.push(page.slug);
  }

  const stored = ((await Settings.collection.findOne({ key: 'site' })) ?? {}) as Record<string, unknown>;
  const fill = Object.fromEntries(Object.entries(opts.settings).filter(([k]) => isEmpty(stored[k])));
  if (Object.keys(fill).length) await Settings.collection.updateOne({ key: 'site' }, { $set: { ...fill, updatedAt: now } }, { upsert: true });

  return { inserted, skipped, settingsFieldsFilled: Object.keys(fill) };
}
