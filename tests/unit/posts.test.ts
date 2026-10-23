import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {} }));

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const db = () => mongoose.connection.db!;
const id = () => new mongoose.Types.ObjectId();
const day = (n: number) => new Date(Date.UTC(2026, 8, n, 9));

const cat = { auto: id(), sec: id() };
const tag = { a: id(), b: id(), c: id() };
const author = id();

const post = (slug: string, over: Record<string, unknown> = {}) => ({
  title: `Title ${slug}`,
  slug,
  shortDescription: `About ${slug}`,
  content: `<p>Body of ${slug} dashboards</p>`,
  featuredImage: 'https://images.unsplash.com/photo-1',
  imageAltText: 'alt',
  category: cat.auto,
  tags: [tag.a],
  status: 'published',
  publishedAt: day(1),
  readingTime: 4,
  pinned: false,
  isDeleted: false,
  authorName: 'Embtel Team',
  seo: { metaTitle: '', metaDescription: '', keywords: [], canonicalUrl: '', ogImage: '', noindex: false },
  updatedAt: day(2),
  ...over,
});

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
  const { Blog } = await import('@/lib/db/models/Blog');
  await Blog.init(); // text index for search
  await db().collection('categories').insertMany([
    { _id: cat.auto, name: 'Automation', slug: 'automation', description: 'Automate things' },
    { _id: cat.sec, name: 'Cybersecurity', slug: 'cybersecurity', description: '' },
  ]);
  await db().collection('tags').insertMany([
    { _id: tag.a, name: 'Workflows', slug: 'workflows', serviceSlug: 'business-automation' },
    { _id: tag.b, name: 'SMB', slug: 'smb', serviceSlug: '' },
    { _id: tag.c, name: 'Unused', slug: 'unused', serviceSlug: '' },
  ]);
  await db().collection('users').insertOne({
    _id: author, name: 'Ritu Writer', email: 'ritu@example.com', password: 'hash-not-a-secret', role: 'marketing',
    slug: 'ritu-writer', bio: 'Writes about automation.', jobTitle: 'Content Lead', avatar: '', sameAs: ['https://www.linkedin.com/in/x'], expertise: ['Automation'], active: true,
  });
  await db().collection('blogs').insertMany([
    post('one', { publishedAt: day(1) }),
    post('two', { publishedAt: day(2), tags: [tag.a, tag.b] }),
    post('three', { publishedAt: day(3), category: cat.sec, tags: [tag.a, tag.b] }),
    post('four', { publishedAt: day(4), category: cat.sec, tags: [tag.b] }),
    post('pinned', { publishedAt: day(0), pinned: true, author, authorName: '' }),
    post('draft', { status: 'draft' }),
    post('future', { publishedAt: new Date(Date.now() + 86_400_000) }),
    post('deleted', { isDeleted: true }),
    post('no-extras', { category: null, tags: [], featuredImage: 'http://insecure/x.png', authorName: '' }),
  ]);
});

afterAll(async () => mongo?.stop());

describe('visibility rules', () => {
  it('only published, due, non-deleted posts are public', async () => {
    const { loadPost, loadPosts } = await import('@/lib/content/posts');
    for (const slug of ['draft', 'future', 'deleted']) expect(await loadPost(slug), slug).toBeNull();
    expect(await loadPost('one')).not.toBeNull();
    const all = await loadPosts({ perPage: 50 });
    expect(all.items.map((p) => p.slug)).not.toEqual(expect.arrayContaining(['draft']));
    expect(all.total).toBe(6);
    expect(all.items.map((p) => p.slug)).not.toContain('future');
    expect(all.items.map((p) => p.slug)).not.toContain('deleted');
  });

  it('taxonomy counts and lookups ignore hidden posts', async () => {
    const { loadTaxonomy, loadCategory, loadTag } = await import('@/lib/content/posts');
    const t = await loadTaxonomy();
    expect(t.categories.find((c) => c.slug === 'automation')?.count).toBe(3); // one, two, pinned
    expect(t.tags.map((x) => x.slug)).not.toContain('unused');
    expect(await loadTag('unused')).toBeNull();
    expect(await loadCategory('automation')).toMatchObject({ name: 'Automation', description: 'Automate things' });
    expect(await loadCategory('nope')).toBeNull();
  });
});

describe('listing', () => {
  it('pins first, then newest; paginates', async () => {
    const { loadPosts } = await import('@/lib/content/posts');
    const p1 = await loadPosts({ perPage: 2 });
    expect(p1.items.map((p) => p.slug)).toEqual(['pinned', 'four']);
    expect(p1.pages).toBe(3);
    const p3 = await loadPosts({ perPage: 2, page: 3 });
    expect(p3.items).toHaveLength(2);
    expect(p3.page).toBe(3);
  });

  it('filters by category, tag and author', async () => {
    const { loadPosts } = await import('@/lib/content/posts');
    expect((await loadPosts({ category: 'cybersecurity' })).items.map((p) => p.slug).sort()).toEqual(['four', 'three']);
    expect((await loadPosts({ tag: 'smb' })).items.map((p) => p.slug).sort()).toEqual(['four', 'three', 'two']);
    expect((await loadPosts({ authorSlug: 'ritu-writer' })).items.map((p) => p.slug)).toEqual(['pinned']);
    expect(await loadPosts({ category: 'nope' })).toEqual({ items: [], page: 1, pages: 0, total: 0 });
  });

  it('search input is inert', async () => {
    const { loadPosts } = await import('@/lib/content/posts');
    for (const q of ['.*', '{"$where":"1"}', '"quoted"', 'a'.repeat(1000)]) {
      await expect(loadPosts({ q })).resolves.toHaveProperty('items');
    }
    expect((await loadPosts({ q: 'dashboards' })).total).toBeGreaterThan(0);
  });
});

describe('post detail', () => {
  it('resolves the author user without leaking private fields', async () => {
    const { loadPost } = await import('@/lib/content/posts');
    const p = await loadPost('pinned');
    expect(p?.author).toMatchObject({ name: 'Ritu Writer', slug: 'ritu-writer', jobTitle: 'Content Lead' });
    const json = JSON.stringify(p);
    expect(json).not.toContain('ritu@example.com');
    expect(json).not.toContain('hash-not-a-secret');
    expect(json).not.toContain('"role"');
  });

  it('falls back to the byline name, then the organization', async () => {
    const { loadPost } = await import('@/lib/content/posts');
    expect((await loadPost('one'))?.author).toMatchObject({ name: 'Embtel Team', slug: null });
    expect((await loadPost('no-extras'))?.author).toMatchObject({ name: 'Embtel Solutions', slug: null });
  });

  it('drops insecure images and handles missing category/tags', async () => {
    const { loadPost } = await import('@/lib/content/posts');
    const p = await loadPost('no-extras');
    expect(p?.featuredImage).toBeNull();
    expect(p?.category).toBeNull();
    expect(p?.tags).toEqual([]);
    expect((await loadPost('one'))?.tags).toEqual([{ name: 'Workflows', slug: 'workflows', serviceSlug: 'business-automation' }]);
  });

  it('related posts: same category first, then shared tags; never itself or hidden', async () => {
    const { loadPost, loadRelated } = await import('@/lib/content/posts');
    const related = await loadRelated((await loadPost('three'))!, 3);
    expect(related[0].slug).toBe('four'); // same category
    expect(related.map((r) => r.slug)).not.toContain('three');
    expect(related.map((r) => r.slug)).toContain('two'); // shares two tags
    expect(related.map((r) => r.slug)).not.toEqual(expect.arrayContaining(['draft', 'future', 'deleted']));
  });

  it('authors resolve only with at least one public post', async () => {
    const { loadAuthor } = await import('@/lib/content/posts');
    expect(await loadAuthor('ritu-writer')).toMatchObject({ name: 'Ritu Writer', bio: 'Writes about automation.' });
    expect(await loadAuthor('nobody')).toBeNull();
  });
});

describe('review fixes: noindex and inactive authors', () => {
  it('noindex posts stay reachable but are left out of feeds and related posts', async () => {
    await db().collection('blogs').insertOne(post('quiet', { publishedAt: day(5), seo: { metaTitle: '', metaDescription: '', keywords: [], canonicalUrl: '', ogImage: '', noindex: true } }));
    const { loadPost, loadPostIndex, loadRelated } = await import('@/lib/content/posts');
    expect(await loadPost('quiet')).not.toBeNull();
    expect((await loadPostIndex()).map((p) => p.slug)).not.toContain('quiet');
    expect((await loadRelated((await loadPost('one'))!, 10)).map((p) => p.slug)).not.toContain('quiet');
  });

  it('a deactivated author is not linked, listed or given a page', async () => {
    const ghost = new mongoose.Types.ObjectId();
    await db().collection('users').insertOne({ _id: ghost, name: 'Gone Writer', email: 'gone@example.com', slug: 'gone-writer', active: false });
    await db().collection('blogs').insertOne(post('by-ghost', { author: ghost, authorName: '' }));
    const { loadPost, loadAuthorSlugs, loadAuthor } = await import('@/lib/content/posts');
    expect((await loadPost('by-ghost'))?.author).toMatchObject({ name: 'Embtel Solutions', slug: null });
    expect(await loadAuthorSlugs()).not.toContain('gone-writer');
    expect(await loadAuthor('gone-writer')).toBeNull();
    const { isKnownPath } = await import('@/lib/content/page-index');
    expect(await isKnownPath('/authors/gone-writer')).toBe(false);
  });
});
