import { afterAll, describe, expect, it } from 'vitest';
import { startMemoryMongo } from '../helpers/mongo';

// No env is set in this file: once a connection is cached, connectDB() must not need MONGODB_URI.
describe('connectDB with a cached connection', () => {
  let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
  afterAll(async () => mongo?.stop());

  it('reuses the cached connection without reading env', async () => {
    for (const k of ['SITE_URL', 'MONGODB_URI', 'SESSION_SECRET', 'ENCRYPTION_KEY']) delete process.env[k];
    mongo = await startMemoryMongo();
    const { connectDB } = await import('@/lib/db/connect');
    const first = await connectDB(mongo.uri);
    await expect(connectDB()).resolves.toBe(first);
  });
});
