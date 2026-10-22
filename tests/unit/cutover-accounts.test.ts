import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const db = () => mongoose.connection.db!;
const ids = { owner: new mongoose.Types.ObjectId(), seeded: new mongoose.Types.ObjectId(), writer: new mongoose.Types.ObjectId() };

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
  await db().collection('users').insertMany([
    { _id: ids.owner, name: 'Owner', email: 'owner@example.com', password: 'x'.repeat(60), role: 'admin', active: true },
    { _id: ids.seeded, name: 'Admin', email: 'seeded@example.com', password: 'x'.repeat(60), role: 'admin', active: true },
    { _id: ids.writer, name: 'Writer', email: 'writer@example.com', password: 'x'.repeat(60), role: 'marketing', active: true },
  ]);
  await db().collection('blogs').insertMany([
    { slug: 'a', title: 'A', authorName: 'Embtel Team', isDeleted: false },
    { slug: 'b', title: 'B', authorName: 'Embtel Team', isDeleted: false },
    { slug: 'c', title: 'C', author: ids.writer, isDeleted: false },
  ]);
});
afterAll(async () => mongo?.stop());

describe('account review', () => {
  it('lists accounts without passwords', async () => {
    const { listAccounts } = await import('@/lib/cutover/accounts');
    const rows = await listAccounts();
    expect(rows.map((r) => r.email)).toEqual(['owner@example.com', 'seeded@example.com', 'writer@example.com']);
    expect(JSON.stringify(rows)).not.toContain('xxxx');
  });

  it('deactivates an account and issues a 72 h set-password link for another', async () => {
    const { applyAccountDecision } = await import('@/lib/cutover/accounts');
    expect(await applyAccountDecision(String(ids.seeded), 'deactivate')).toEqual({ done: 'deactivated' });
    expect((await db().collection('users').findOne({ _id: ids.seeded }))?.active).toBe(false);
    const r = await applyAccountDecision(String(ids.writer), 'link');
    expect(r).toMatchObject({ done: 'link', path: expect.stringMatching(/^\/admin\/reset-password\/[0-9a-f]{64}$/) });
    const u = await db().collection('users').findOne({ _id: ids.writer });
    expect(u?.passwordResetExpires.getTime() - Date.now()).toBeGreaterThan(71 * 3600_000);
  });

  it('refuses to deactivate the last active admin', async () => {
    const { applyAccountDecision } = await import('@/lib/cutover/accounts');
    await expect(applyAccountDecision(String(ids.owner), 'deactivate')).rejects.toThrow(/last active admin/i);
  });
});

describe('author assignment', () => {
  it('lists posts without an author user and assigns one, keeping the byline name', async () => {
    const { postsWithoutAuthor, assignAuthor } = await import('@/lib/cutover/accounts');
    expect((await postsWithoutAuthor()).map((p) => p.slug)).toEqual(['a', 'b']);
    expect(await assignAuthor(['a'], String(ids.writer))).toBe(1);
    const a = await db().collection('blogs').findOne({ slug: 'a' });
    expect(String(a?.author)).toBe(String(ids.writer));
    expect(a?.authorName).toBe('Embtel Team');
    expect((await postsWithoutAuthor()).map((p) => p.slug)).toEqual(['b']);
    await expect(assignAuthor(['b'], String(new mongoose.Types.ObjectId()))).rejects.toThrow(/no such user/i);
  });
});
