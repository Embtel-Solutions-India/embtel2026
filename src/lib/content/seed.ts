import { connectDB } from '@/lib/db/connect';
import { PageModel } from '@/lib/db/models/Page';
import { Settings } from '@/lib/db/models/Settings';
import { Blog } from '@/lib/db/models/Blog';
import { Category } from '@/lib/db/models/Category';
import { Tag } from '@/lib/db/models/Tag';
import { SeedCategorySchema, SeedPostSchema, SeedTagSchema, type SeedBlog } from './blog-seed';
import { PageSchema, type Page } from './blocks';
import { isValidSettingsField, type SiteSettings } from './settings';

const isEmpty = (v: unknown) =>
  v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0);

// Idempotent content seeding. Existing pages are never touched (admin edits win) unless their
// slug is listed in `force`; settings only get fields that are empty or invalid in the stored document.
export async function seedContent(opts: { pages: Page[]; settings: SiteSettings; force?: string[]; blog?: SeedBlog }) {
  const invalid = [
    ...opts.pages.filter((p) => !PageSchema.safeParse(p).success).map((p) => p.slug),
    ...(opts.blog?.posts ?? []).filter((p) => !SeedPostSchema.safeParse(p).success).map((p) => `post:${p.slug}`),
    ...(opts.blog?.categories ?? []).filter((c) => !SeedCategorySchema.safeParse(c).success).map((c) => `category:${c.slug}`),
    ...(opts.blog?.tags ?? []).filter((t) => !SeedTagSchema.safeParse(t).success).map((t) => `tag:${t.slug}`),
  ];
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
  const fill = Object.fromEntries(Object.entries(opts.settings).filter(([k]) => isEmpty(stored[k]) || !isValidSettingsField(k, stored[k])));
  if (Object.keys(fill).length) await Settings.collection.updateOne({ key: 'site' }, { $set: { ...fill, updatedAt: now } }, { upsert: true });

  const blog = opts.blog ? await seedBlog(opts.blog, now) : { postsInserted: [], postsSkipped: [] };
  return { inserted, skipped, settingsFieldsFilled: Object.keys(fill), ...blog };
}

// Categories/tags/posts are inserted by slug only when missing; existing ones (admin edits) are never touched.
async function seedBlog(blog: SeedBlog, now: Date) {
  const insertMissing = async (coll: typeof Category.collection, docs: { slug: string }[]) => {
    for (const d of docs) await coll.updateOne({ slug: d.slug }, { $setOnInsert: { ...d, createdAt: now, updatedAt: now } }, { upsert: true });
    const all = await coll.find({ slug: { $in: docs.map((d) => d.slug) } }, { projection: { slug: 1 } }).toArray();
    return new Map(all.map((d) => [d.slug as string, d._id]));
  };
  const catIds = await insertMissing(Category.collection, blog.categories);
  const tagIds = await insertMissing(Tag.collection, blog.tags);

  const existing = new Set((await Blog.collection.distinct('slug')) as string[]);
  const postsInserted: string[] = [];
  const postsSkipped: string[] = [];
  for (const p of blog.posts) {
    if (existing.has(p.slug)) {
      postsSkipped.push(p.slug);
      continue;
    }
    const { category, tags, publishedAt, ...rest } = p;
    await Blog.collection.insertOne({
      ...rest,
      category: category ? (catIds.get(category) ?? null) : null,
      tags: tags.map((t) => tagIds.get(t)).filter(Boolean),
      publishedAt: new Date(publishedAt),
      seo: { ...p.seo, keywords: [], canonicalUrl: '', ogImage: '', schemaJson: '', noindex: false },
      imageCaption: '', galleryImages: [], featured: false, pinned: false, views: 0, isDeleted: false,
      focusKeyword: '', secondaryKeywords: [],
      createdAt: now, updatedAt: now,
    });
    postsInserted.push(p.slug);
  }
  return { postsInserted, postsSkipped };
}
