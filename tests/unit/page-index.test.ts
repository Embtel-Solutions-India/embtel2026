import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const db = () => mongoose.connection.db!;
const pages = () => db().collection('pages');
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
  await pages().insertMany([{ slug: 'about', status: 'published' }, { slug: 'home', status: 'published' }]);
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

  it('sees a newly published page within seconds, not after the full TTL', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { isKnownPath } = await import('@/lib/content/page-index');
    expect(await isKnownPath('/about')).toBe(true);
    await pages().insertOne({ slug: 'new-page', status: 'published' });
    expect(await isKnownPath('/new-page')).toBe(false); // cache is fresh: no DB hit
    vi.setSystemTime(Date.now() + 6_000); // > negative-refresh window, < 30 s TTL
    expect(await isKnownPath('/new-page')).toBe(true);
  });
});
