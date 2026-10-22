import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const writer = new mongoose.Types.ObjectId();
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
    post('p1', { status: 'published', publishedAt: at('2026-09-01T00:00:00Z'), updatedAt: at('2026-10-05T00:00:00Z'), focusKeyword: 'speed', faqs: [{ q: 'a', a: 'b' }, { q: 'c', a: 'd' }] }),
    post('p2', { status: 'published', publishedAt: at('2026-09-02T00:00:00Z') }),
    post('s-late', { status: 'scheduled', scheduledAt: at('2099-02-01T00:00:00Z') }),
    post('s-soon', { status: 'scheduled', scheduledAt: at('2099-01-01T00:00:00Z') }),
    post('d1', { updatedAt: at('2026-10-09T00:00:00Z') }),
    post('gone', { status: 'published', isDeleted: true, updatedAt: at('2026-10-10T00:00:00Z') }),
    post('mine', { author: writer, updatedAt: at('2026-10-08T00:00:00Z') }),
  ]);
  const recent = new Date(Date.now() - 2 * 86_400_000);
  await mongoose.connection.db!.collection('leads').insertMany([
    { firstName: 'Ann', lastName: 'Lee', email: 'a@x.test', phone: '1', message: 'm', smsConsent: true, service: 'Web Development', forwardStatus: 'sent', createdAt: recent },
    { firstName: 'Bo', lastName: 'Kim', email: 'b@x.test', phone: '1', message: 'm', smsConsent: true, service: '', forwardStatus: 'failed', createdAt: recent },
    { firstName: 'Old', lastName: 'Lead', email: 'o@x.test', phone: '1', message: 'm', smsConsent: true, forwardStatus: 'sent', createdAt: at('2026-01-01T00:00:00Z') },
  ]);
  await mongoose.connection.db!.collection('auditlogs').insertOne({ actorId: writer, action: 'post.update', target: { type: 'post', id: 'x' }, meta: {}, createdAt: recent });
  await mongoose.connection.db!.collection('users').insertOne({ _id: writer, name: 'Wes Writer', email: 'w@x.test' });
  await mongoose.connection.db!.collection('settings').insertOne({ key: 'site', integrations: { googleAdsId: 'AW-18518114785', formspreeFormId: 'mzdwzgjr' } });
});

afterAll(async () => mongo?.stop());

describe('loadDashboard', () => {
  it('counts posts by state, with trashed posts counted only as trashed', async () => {
    const { loadDashboard } = await import('@/lib/admin/dashboard');
    const d = await loadDashboard();
    expect(d.counts).toEqual({ published: 2, scheduled: 2, draft: 2, trashed: 1 });
  });

  it('lists upcoming scheduled posts soonest first and recent edits without trash', async () => {
    const { loadDashboard } = await import('@/lib/admin/dashboard');
    const d = await loadDashboard();
    expect(d.upcoming.map((p) => p.title)).toEqual(['T s-soon', 'T s-late']);
    expect(d.recent[0].title).toBe('T d1');
    expect(d.recent.map((p) => p.title)).not.toContain('T gone');
    expect(d.recent.length).toBeLessThanOrEqual(5);
  });

  it('surfaces what needs attention: recent leads, failed forwards, SEO gaps and my drafts', async () => {
    const { loadDashboard } = await import('@/lib/admin/dashboard');
    const d = await loadDashboard({ userId: String(writer), isAdmin: false });
    expect(d.leads).toMatchObject({ last7Days: 2, failed: 1 });
    expect(d.leads.recent.map((l) => l.name)).toEqual(expect.arrayContaining(['Ann Lee', 'Bo Kim']));
    expect(d.seoGaps.map((p) => p.title)).toEqual(['T p2']); // published, no focus keyword / FAQs
    expect(d.myDrafts.map((p) => p.title)).toEqual(['T mine']);
    expect(d.activity).toBeUndefined(); // team activity is Admin-only
  });

  it('gives admins team activity and integration status', async () => {
    const { loadDashboard } = await import('@/lib/admin/dashboard');
    const d = await loadDashboard({ userId: String(writer), isAdmin: true });
    expect(d.activity?.[0]).toMatchObject({ actor: 'Wes Writer', action: 'post.update' });
    expect(d.integrations).toEqual(expect.arrayContaining([{ name: 'Google Ads', on: true }, { name: 'Formspree', on: true }, { name: 'GA4', on: false }]));
  });
});
