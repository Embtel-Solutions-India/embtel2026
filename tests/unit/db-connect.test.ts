import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectDB } from '@/lib/db/connect';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
beforeAll(async () => {
  mongo = await startMemoryMongo();
}, 300_000);
afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

describe('connectDB', () => {
  it('retries after a failed connection instead of caching the rejection', async () => {
    await expect(connectDB('mongodb://127.0.0.1:1/x?serverSelectionTimeoutMS=300')).rejects.toThrow();
    const m = await connectDB(mongo.uri);
    expect(m.connection.readyState).toBe(1);
  }, 30_000);

  it('returns the same connection on repeated calls', async () => {
    const a = await connectDB(mongo.uri);
    const b = await connectDB(mongo.uri);
    expect(a).toBe(b);
    expect(mongoose.connection.readyState).toBe(1);
  });
});
