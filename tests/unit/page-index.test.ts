import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const db = () => mongoose.connection.db!;
const id = () => new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
  const cat = id();
  const tag = id();
  const unusedCat = id();
  const author = id();
  await db().collection('categories').insertMany([{ _id: cat, name: 'Automation', slug: 'automation' }, { _id: unusedCat, name: 'Empty', slug: 'empty' }]);
  await db().collection('tags').insertOne({ _id: tag, name: 'Workflows', slug: 'workflows' });
  await db().collection('users').insertOne({ _id: author, name: 'A', email: 'a@example.com', slug: 'a-writer' });
  const base = { category: cat, tags: [tag], isDeleted: false, publishedAt: new Date('2026-09-01T09:00:00Z') };
  await db().collection('blogs').insertMany([
    { ...base, slug: 'public-post', status: 'published', author },
    { ...base, slug: 'draft-post', status: 'draft' },
    { ...base, slug: 'future-post', status: 'published', publishedAt: new Date(Date.now() + 86_400_000) },
  ]);
});
afterAll(async () => {
  vi.useRealTimers();
  await mongo?.stop();
});

describe('isKnownPath', () => {
  it('knows public pages, posts, taxonomy and authors — nothing hidden', async () => {
    const { isKnownPath } = await import('@/lib/content/page-index');
    for (const p of ['/about', '/blog/public-post', '/blog/category/automation', '/blog/tag/workflows', '/authors/a-writer']) {
      expect(await isKnownPath(p), p).toBe(true);
    }
    for (const p of ['/home', '/nope', '/blog/draft-post', '/blog/future-post', '/blog/category/empty', '/blog/tag/nope', '/authors/nope']) {
      expect(await isKnownPath(p), p).toBe(false);
    }
  });

  it('answers site page URLs (and bot probes) from the build, never the database', async () => {
    const { isKnownPath } = await import('@/lib/content/page-index');
    const { Blog } = await import('@/lib/db/models/Blog');
    const distinct = vi.spyOn(Blog, 'distinct');
    const exists = vi.spyOn(Blog, 'exists');
    expect(await isKnownPath('/about')).toBe(true);
    expect(await isKnownPath('/wp-login')).toBe(false);
    expect(await isKnownPath('/home')).toBe(false);
    expect(distinct).not.toHaveBeenCalled();
    expect(exists).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('knows a post published a moment ago, even while the cached index is fresh', async () => {
    const { isKnownPath } = await import('@/lib/content/page-index');
    expect(await isKnownPath('/blog/public-post')).toBe(true); // index just loaded
    await db().collection('blogs').insertOne({ slug: 'new-post', status: 'published', isDeleted: false, publishedAt: new Date(Date.now() - 1000), tags: [] });
    expect(await isKnownPath('/blog/new-post')).toBe(true);
    expect(await isKnownPath('/still-unknown')).toBe(false);
    expect(await isKnownPath('/blog/draft-post')).toBe(false);
  });
});
