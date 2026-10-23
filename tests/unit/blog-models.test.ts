import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const db = () => mongoose.connection.db!;

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
});
afterAll(async () => mongo?.stop());

// Shape written by the legacy blog-admin (blog-admin/server/models/Blog.js).
const legacyPost = (over: Record<string, unknown> = {}) => ({
  title: 'Legacy post',
  slug: 'legacy-post',
  shortDescription: 'Short',
  content: '<p>Body</p>',
  featuredImage: '',
  imageAltText: '',
  imageCaption: '',
  galleryImages: [],
  category: new mongoose.Types.ObjectId(),
  tags: [],
  author: new mongoose.Types.ObjectId(),
  readingTime: 3,
  featured: false,
  pinned: false,
  status: 'published',
  publishedAt: new Date('2026-09-01T09:00:00Z'),
  seo: { metaTitle: '', metaDescription: '', keywords: [], canonicalUrl: '', ogImage: '', schemaJson: '' },
  views: 7,
  isDeleted: false,
  ...over,
});

describe('Blog model on the legacy collection', () => {
  it('loads a legacy-shaped document and defaults the new fields', async () => {
    const { Blog } = await import('@/lib/db/models/Blog');
    await db().collection('blogs').insertOne(legacyPost());
    const b = await Blog.findOne({ slug: 'legacy-post' }).lean();
    expect(b?.title).toBe('Legacy post');
    const doc = await Blog.findOne({ slug: 'legacy-post' });
    expect(doc?.faqs).toEqual([]);
    expect(doc?.keyTakeaways).toEqual([]);
    expect(doc?.sources).toEqual([]);
    expect(doc?.authorName).toBe('');
    expect(doc?.seo?.noindex).toBe(false);
  });

  it('hides soft-deleted posts from normal finds', async () => {
    const { Blog } = await import('@/lib/db/models/Blog');
    await db().collection('blogs').insertOne(legacyPost({ slug: 'gone', isDeleted: true }));
    expect(await Blog.findOne({ slug: 'gone' })).toBeNull();
  });

  it('allows a post without an author user (imported "Embtel Team" byline)', async () => {
    const { Blog } = await import('@/lib/db/models/Blog');
    const b = await Blog.create({ ...legacyPost({ slug: 'no-author', author: undefined }), authorName: 'Embtel Team' });
    expect(b.authorName).toBe('Embtel Team');
  });

  it('keeps the legacy text index', async () => {
    const { Blog } = await import('@/lib/db/models/Blog');
    await Blog.init();
    const idx = await Blog.collection.indexes();
    expect(idx.some((i) => Object.values(i.key).includes('text'))).toBe(true);
  });
});

describe('Tag model', () => {
  it('stores an optional service link', async () => {
    const { Tag } = await import('@/lib/db/models/Tag');
    const t = await Tag.create({ name: 'Performance', slug: 'performance', serviceSlug: 'web-development' });
    expect(t.serviceSlug).toBe('web-development');
    expect((await Tag.create({ name: 'SMB', slug: 'smb' })).serviceSlug).toBe('');
  });
});

describe('Category model', () => {
  it('reads the legacy shape', async () => {
    const { Category } = await import('@/lib/db/models/Category');
    await db().collection('categories').insertOne({ name: 'Automation', slug: 'automation', description: '', image: '', seo: { metaTitle: '', metaDescription: '' } });
    expect((await Category.findOne({ slug: 'automation' }))?.name).toBe('Automation');
  });
});
