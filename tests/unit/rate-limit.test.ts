import crypto from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hitRateLimit } from '@/lib/auth/rate-limit';
import { connectDB } from '@/lib/db/connect';
import { RateLimit } from '@/lib/db/models/RateLimit';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
beforeAll(async () => {
  mongo = await startMemoryMongo();
  await connectDB(mongo.uri);
}, 300_000);
afterAll(async () => {
  await mongo?.stop();
});

const key = () => `login:${crypto.randomBytes(4).toString('hex')}@example.com:1.2.3.4`;

describe('hitRateLimit', () => {
  it('rate limits login: 10 allowed, 11th blocked, new window allowed', async () => {
    const k = key();
    for (let i = 0; i < 10; i++) expect((await hitRateLimit(k, 10, 1)).allowed).toBe(true);
    expect((await hitRateLimit(k, 10, 1)).allowed).toBe(false);
    expect((await hitRateLimit(key(), 10, 1)).allowed).toBe(true); // other keys unaffected
    await new Promise((r) => setTimeout(r, 1100));
    expect((await hitRateLimit(k, 10, 1)).allowed).toBe(true);
  });

  it('counts concurrent hits atomically', async () => {
    const k = key();
    const r = await Promise.all(Array.from({ length: 15 }, () => hitRateLimit(k, 10, 60)));
    expect(r.filter((x) => x.allowed)).toHaveLength(10);
  });

  it('has a TTL index on expiresAt', async () => {
    await RateLimit.init();
    const idx = await RateLimit.collection.indexes();
    expect(idx.find((i) => i.key.expiresAt === 1)?.expireAfterSeconds).toBe(0);
  });
});
