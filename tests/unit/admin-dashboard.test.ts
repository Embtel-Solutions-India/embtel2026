import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const at = (iso: string) => new Date(iso);
const post = (slug: string, over: Record<string, unknown>) => ({
  title: `T ${slug}`, slug, shortDescription: 's', content: '<p>x</p>', status: 'draft', isDeleted: false, tags: [],
  updatedAt: at('2026-10-01T00:00:00Z'), ...over,
});

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
  await mongoose.connection.db!.collection('blogs').insertMany([
    post('p1', { status: 'published', publishedAt: at('2026-09-01T00:00:00Z'), updatedAt: at('2026-10-05T00:00:00Z') }),
    post('p2', { status: 'published', publishedAt: at('2026-09-02T00:00:00Z') }),
    post('s-late', { status: 'scheduled', scheduledAt: at('2099-02-01T00:00:00Z') }),
    post('s-soon', { status: 'scheduled', scheduledAt: at('2099-01-01T00:00:00Z') }),
    post('d1', { updatedAt: at('2026-10-09T00:00:00Z') }),
    post('gone', { status: 'published', isDeleted: true, updatedAt: at('2026-10-10T00:00:00Z') }),
  ]);
});

afterAll(async () => mongo?.stop());

describe('loadDashboard', () => {
  it('counts posts by state, with trashed posts counted only as trashed', async () => {
    const { loadDashboard } = await import('@/lib/admin/dashboard');
    const d = await loadDashboard();
    expect(d.counts).toEqual({ published: 2, scheduled: 2, draft: 1, trashed: 1 });
  });

  it('lists upcoming scheduled posts soonest first and recent edits without trash', async () => {
    const { loadDashboard } = await import('@/lib/admin/dashboard');
    const d = await loadDashboard();
    expect(d.upcoming.map((p) => p.title)).toEqual(['T s-soon', 'T s-late']);
    expect(d.recent[0].title).toBe('T d1');
    expect(d.recent.map((p) => p.title)).not.toContain('T gone');
    expect(d.recent.length).toBeLessThanOrEqual(5);
  });
});
