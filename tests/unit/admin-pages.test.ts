import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

const refreshed: unknown[] = [];
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {} }));
vi.mock('@/lib/admin/revalidate', () => ({ refreshContent: (c: unknown) => refreshed.push(c) }));
vi.mock('@/lib/seo/indexnow', () => ({ pingIndexNowPaths: async () => ({ ok: true }) }));

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const pages = () => mongoose.connection.db!.collection('pages');
const admin = { _id: new mongoose.Types.ObjectId(), role: 'admin' } as never;
const marketing = { _id: new mongoose.Types.ObjectId(), role: 'marketing' } as never;
const page = (slug: string, over: Record<string, unknown> = {}) => ({
  slug, title: `T ${slug}`, status: 'published', type: 'service', theme: { accent: '#1A6BFF' }, locked: false,
  seo: { noindex: false },
  blocks: [
    { type: 'hero', variant: 'page', badge: 'New', heading: 'Old *heading*', lead: 'Old lead', buttons: [{ label: 'Book', href: '/contact' }], stats: [{ value: '24/7', label: 'Support' }] },
    { type: 'faq', header: { title: 'FAQ' }, variant: 'accordion', items: [{ q: 'Old Q?', a: 'Old A.' }] },
    { type: 'cta', heading: 'Talk to us', buttons: [] },
  ],
  updatedAt: new Date('2026-10-01T00:00:00Z'),
  ...over,
});
let ids: Record<string, string> = {};

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
  const r = await pages().insertMany([page('web-development'), page('dental-automation', { locked: true, type: 'landing' })]);
  ids = { web: String(r.insertedIds[0]), dental: String(r.insertedIds[1]) };
});
afterAll(async () => mongo?.stop());
beforeEach(() => (refreshed.length = 0));

const svc = () => import('@/lib/admin/pages');
const fieldsOf = async (id: string) => (await (await svc()).getPageFields(id))!;

describe('page fields', () => {
  it('exposes title, SEO, hero and FAQ fields', async () => {
    const f = await fieldsOf(ids.web);
    expect(f).toMatchObject({ title: 'T web-development', hero: { heading: 'Old *heading*', lead: 'Old lead', badge: 'New', buttons: [{ label: 'Book', href: '/contact' }] }, faqs: [{ index: 1, items: [{ q: 'Old Q?', a: 'Old A.' }] }] });
  });

  it('marketing edits an unlocked page: hero/FAQ/SEO change, other block data is kept, caches refresh', async () => {
    const { savePageFields } = await svc();
    const f = await fieldsOf(ids.web);
    await savePageFields({ id: ids.web, expectedUpdatedAt: f.updatedAt, title: 'Web Development', seo: { metaTitle: 'Websites that sell', metaDescription: 'Fast sites.', ogImage: '', noindex: false }, hero: { ...f.hero!, heading: 'New *heading*' }, faqs: [{ index: 1, items: [{ q: 'New Q?', a: 'New A.' }] }] }, marketing);
    const d = await pages().findOne({ slug: 'web-development' });
    expect(d?.blocks[0]).toMatchObject({ heading: 'New *heading*', stats: [{ value: '24/7', label: 'Support' }] });
    expect(d?.blocks[1].items).toEqual([{ q: 'New Q?', a: 'New A.' }]);
    expect(d?.seo.metaTitle).toBe('Websites that sell');
    expect(refreshed).toContainEqual(expect.objectContaining({ pages: ['web-development'] }));
  });

  it('locked (Ads) pages and publishing are admin-only', async () => {
    const { savePageFields } = await svc();
    const f = await fieldsOf(ids.dental);
    await expect(savePageFields({ id: ids.dental, expectedUpdatedAt: f.updatedAt, title: 'Changed' }, marketing)).rejects.toThrow(/locked/i);
    const w = await fieldsOf(ids.web);
    await expect(savePageFields({ id: ids.web, expectedUpdatedAt: w.updatedAt, title: w.title, status: 'draft' }, marketing)).rejects.toThrow(/publish/i);
    await savePageFields({ id: ids.dental, expectedUpdatedAt: f.updatedAt, title: 'Dental Automation' }, admin);
    expect((await pages().findOne({ slug: 'dental-automation' }))?.title).toBe('Dental Automation');
  });

  it('refuses unsafe links and stale saves', async () => {
    const { savePageFields } = await svc();
    const f = await fieldsOf(ids.web);
    await expect(savePageFields({ id: ids.web, expectedUpdatedAt: f.updatedAt, title: f.title, hero: { ...f.hero!, buttons: [{ label: 'x', href: 'javascript:alert(1)' }] } }, admin)).rejects.toThrow();
    await savePageFields({ id: ids.web, expectedUpdatedAt: f.updatedAt, title: 'First' }, admin);
    await expect(savePageFields({ id: ids.web, expectedUpdatedAt: f.updatedAt, title: 'Second' }, admin)).rejects.toThrow(/changed by someone else/);
  });
});
