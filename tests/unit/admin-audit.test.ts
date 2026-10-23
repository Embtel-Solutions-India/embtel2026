import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const ann = new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
  const db = mongoose.connection.db!;
  await db.collection('users').insertOne({ _id: ann, name: 'Ann Admin', email: 'ann@example.com' });
  await db.collection('auditlogs').insertMany([
    { actorId: ann, action: 'post.update', target: { type: 'post', id: 'p1' }, meta: { slug: 'hello' }, createdAt: new Date('2026-10-01') },
    { actorId: ann, action: 'user.invite', target: { type: 'user', id: 'u1' }, meta: { email: 'new@example.com' }, createdAt: new Date('2026-10-02') },
    { actorId: new mongoose.Types.ObjectId(), action: 'post.delete', target: { type: 'post', id: 'p2' }, meta: {}, createdAt: new Date('2026-10-03') },
  ]);
});
afterAll(async () => mongo?.stop());

describe('listAudit', () => {
  it('lists newest first with actor names (unknown actors labelled)', async () => {
    const { listAudit } = await import('@/lib/admin/audit');
    const r = await listAudit({});
    expect(r.items.map((e) => e.action)).toEqual(['post.delete', 'user.invite', 'post.update']);
    expect(r.items[1]).toMatchObject({ actor: 'Ann Admin', target: 'user u1', details: 'email: new@example.com' });
    expect(r.items[0].actor).toBe('Deleted user');
  });

  it('filters by area', async () => {
    const { listAudit } = await import('@/lib/admin/audit');
    expect((await listAudit({ area: 'post' })).items.map((e) => e.action)).toEqual(['post.delete', 'post.update']);
    expect((await listAudit({ area: '$where' })).items).toHaveLength(3); // unknown area ignored, not injected
  });
});
