import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

const refreshed: unknown[] = [];
const pinged: string[][] = [];
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {} }));
vi.mock('@/lib/admin/revalidate', () => ({ refreshContent: (c: unknown) => refreshed.push(c) }));
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), connection: async () => {} }));
vi.mock('@/lib/seo/indexnow', () => ({ pingIndexNowPaths: async (p: string[]) => void pinged.push(p) }));

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const blogs = () => mongoose.connection.db!.collection('blogs');
const post = (slug: string, scheduledAt: Date) => ({
  title: slug, slug, shortDescription: 's', content: '<p>x</p>', status: 'scheduled', scheduledAt, isDeleted: false, tags: [], updatedAt: new Date(),
});

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
});
afterAll(async () => mongo?.stop());
beforeEach(() => {
  refreshed.length = 0;
  pinged.length = 0;
});

describe('publishDuePosts', () => {
  it('publishes due posts with publishedAt = scheduledAt, leaves future ones, and is idempotent', async () => {
    const due = new Date('2026-10-20T14:00:00Z');
    await blogs().insertMany([post('due-one', due), post('later', new Date('2099-01-01T00:00:00Z'))]);
    const { publishDuePosts } = await import('@/lib/admin/posts');
    expect(await publishDuePosts(new Date('2026-10-22T00:00:00Z'))).toEqual(['due-one']);
    const d = await blogs().findOne({ slug: 'due-one' });
    expect(d?.status).toBe('published');
    expect(d?.publishedAt?.toISOString()).toBe(due.toISOString());
    expect((await blogs().findOne({ slug: 'later' }))?.status).toBe('scheduled');
    expect(refreshed).toEqual([{ posts: ['due-one'], taxonomy: true }]);
    expect(pinged).toEqual([['/blog/due-one']]);

    refreshed.length = 0;
    expect(await publishDuePosts(new Date('2026-10-22T00:00:00Z'))).toEqual([]);
    expect(refreshed).toEqual([]);
  });

  it('skips trashed scheduled posts', async () => {
    await blogs().insertOne({ ...post('trashed-due', new Date('2026-10-01T00:00:00Z')), isDeleted: true });
    const { publishDuePosts } = await import('@/lib/admin/posts');
    expect(await publishDuePosts(new Date('2026-10-22T00:00:00Z'))).not.toContain('trashed-due');
  });
});

describe('cron route', () => {
  const call = async (auth?: string) => {
    const { GET } = await import('@/app/api/cron/publish-scheduled/route');
    return GET(new Request('https://www.embtelsolutions.com/api/cron/publish-scheduled', auth ? { headers: { authorization: auth } } : {}));
  };
  afterEach(() => vi.unstubAllEnvs());

  it('is disabled (503) without CRON_SECRET', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect((await call('Bearer anything')).status).toBe(503);
  });

  it('rejects a missing or wrong token (401) and runs with the right one', async () => {
    const secret = crypto.randomUUID() + crypto.randomUUID();
    vi.stubEnv('CRON_SECRET', secret);
    expect((await call()).status).toBe(401);
    expect((await call(`Bearer ${secret}x`)).status).toBe(401);
    const ok = await call(`Bearer ${secret}`);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toHaveProperty('published');
  });
});
