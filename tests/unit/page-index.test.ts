import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const pages = () => mongoose.connection.db!.collection('pages');

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
});
afterAll(async () => {
  vi.useRealTimers();
  await mongo?.stop();
});

describe('isPublishedSlug', () => {
  it('sees a newly published page within seconds, not after the full TTL', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { isPublishedSlug } = await import('@/lib/content/page-index');
    await pages().insertOne({ slug: 'about', status: 'published' });
    expect(await isPublishedSlug('about')).toBe(true);
    await pages().insertOne({ slug: 'new-page', status: 'published' });
    expect(await isPublishedSlug('new-page')).toBe(false); // cache is fresh: no DB hit
    vi.setSystemTime(Date.now() + 6_000); // > negative-refresh window, < 30 s TTL
    expect(await isPublishedSlug('new-page')).toBe(true);
  });
});
