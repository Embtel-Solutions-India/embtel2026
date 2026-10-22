import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
  const db = mongoose.connection.db!;
  const blog = new mongoose.Types.ObjectId();
  await db.collection('blogs').insertOne({ _id: blog, slug: 'speed', title: 'Speed Matters', isDeleted: false });
  await db.collection('comments').insertMany([
    { blog, name: 'Ann', email: 'ann@example.com', content: 'Great <b>post</b>', status: 'approved', ipAddress: '203.0.113.9', createdAt: new Date('2026-09-02') },
    { blog, name: 'Bot', email: 'bot@example.com', content: 'spam', status: 'spam', ipAddress: '198.51.100.1', createdAt: new Date('2026-09-03') },
  ]);
});
afterAll(async () => mongo?.stop());

describe('listComments', () => {
  it('shows post titles and never exposes email or IP', async () => {
    const { listComments } = await import('@/lib/admin/comments');
    const r = await listComments({});
    expect(r.items.map((c) => c.name)).toEqual(['Bot', 'Ann']);
    expect(r.items[1]).toMatchObject({ post: 'Speed Matters', content: 'Great <b>post</b>', status: 'approved' });
    const json = JSON.stringify(r);
    expect(json).not.toContain('ann@example.com');
    expect(json).not.toContain('203.0.113.9');
  });

  it('filters by status', async () => {
    const { listComments } = await import('@/lib/admin/comments');
    expect((await listComments({ status: 'spam' })).items.map((c) => c.name)).toEqual(['Bot']);
  });
});
