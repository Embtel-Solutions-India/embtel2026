import { connectDB } from '@/lib/db/connect';
import { Settings } from '@/lib/db/models/Settings';
import { Blog } from '@/lib/db/models/Blog';
import { Category } from '@/lib/db/models/Category';
import { Tag } from '@/lib/db/models/Tag';
import { SeedCategorySchema, SeedPostSchema, SeedTagSchema, type SeedBlog } from './blog-seed';
import { isValidSettingsField, type SiteSettings } from './settings';

const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isEmpty = (v: unknown) =>
  v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0);

// Idempotent content seeding (site pages ship in the build, not the database). Settings only get fields
// that are empty or invalid in the stored document; existing blog content is never touched.
export async function seedContent(opts: { settings: SiteSettings; blog?: SeedBlog }) {
  const invalid = [
    ...(opts.blog?.posts ?? []).filter((p) => !SeedPostSchema.safeParse(p).success).map((p) => `post:${p.slug}`),
    ...(opts.blog?.categories ?? []).filter((c) => !SeedCategorySchema.safeParse(c).success).map((c) => `category:${c.slug}`),
    ...(opts.blog?.tags ?? []).filter((t) => !SeedTagSchema.safeParse(t).success).map((t) => `tag:${t.slug}`),
  ];
  if (invalid.length) throw new Error(`[seed] invalid content: ${invalid.join(', ')}`);

  await connectDB();
  const now = new Date();

  const stored = ((await Settings.collection.findOne({ key: 'site' })) ?? {}) as Record<string, unknown>;
  const fill: Record<string, unknown> = Object.fromEntries(Object.entries(opts.settings).filter(([k]) => isEmpty(stored[k]) || !isValidSettingsField(k, stored[k])));
  // Sections that already exist (e.g. integrations holding only migrated GA4/Search Console IDs) still get their
  // empty sub-fields filled — otherwise the live Google Ads tag ID would be lost at cutover.
  for (const [k, v] of Object.entries(opts.settings)) {
    const s = stored[k];
    if (k in fill || !isPlainObject(v) || !isPlainObject(s)) continue;
    for (const [sk, sv] of Object.entries(v)) if (isEmpty(s[sk]) && !isEmpty(sv)) fill[`${k}.${sk}`] = sv;
  }
  if (Object.keys(fill).length) await Settings.collection.updateOne({ key: 'site' }, { $set: { ...fill, updatedAt: now } }, { upsert: true });

  const blog = opts.blog ? await seedBlog(opts.blog, now) : { postsInserted: [], postsSkipped: [] };
  return { settingsFieldsFilled: Object.keys(fill), ...blog };
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
