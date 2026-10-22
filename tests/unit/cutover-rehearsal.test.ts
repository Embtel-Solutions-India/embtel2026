import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {} }));

// A database shaped like the live legacy blog-admin one, taken through the full cutover sequence:
// migrations → content seed → author assignment. Nothing legacy may be lost or broken.
let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const db = () => mongoose.connection.db!;
const editorPassword = randomBytes(12).toString('hex'); // runtime-random, never a real credential
const ids = { admin: new mongoose.Types.ObjectId(), editor: new mongoose.Types.ObjectId(), cat: new mongoose.Types.ObjectId(), tag: new mongoose.Types.ObjectId(), post: new mongoose.Types.ObjectId() };

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
  const hash = await bcrypt.hash(editorPassword, 12);
  await db().collection('users').insertMany([
    { _id: ids.admin, name: 'Site Admin', email: 'admin@legacy.test', password: await bcrypt.hash(randomBytes(12).toString('hex'), 12), role: 'admin', active: true, createdAt: new Date('2025-01-01') },
    { _id: ids.editor, name: 'Priya Editor', email: 'priya@legacy.test', password: hash, role: 'editor', active: true, createdAt: new Date('2025-02-01') },
  ]);
  await db().collection('categories').insertOne({ _id: ids.cat, name: 'Legacy News', slug: 'legacy-news', description: '' });
  await db().collection('tags').insertOne({ _id: ids.tag, name: 'Updates', slug: 'updates' });
  await db().collection('blogs').insertOne({
    _id: ids.post, title: 'A Legacy Admin Post', slug: 'a-legacy-admin-post', shortDescription: 'Written in the old admin.', content: '<p>Old <strong>content</strong>.</p>',
    category: ids.cat, tags: [ids.tag], author: ids.editor, status: 'published', publishedAt: new Date('2025-06-01'), isDeleted: false, views: 42,
    seo: { metaTitle: '', metaDescription: '', keywords: [], canonicalUrl: '', ogImage: '', schemaJson: '' }, createdAt: new Date('2025-06-01'), updatedAt: new Date('2025-06-02'),
  });
  await db().collection('comments').insertOne({ blog: ids.post, name: 'Reader', email: 'reader@legacy.test', content: 'Nice post', status: 'approved', createdAt: new Date('2025-06-03') });
  await db().collection('media').insertOne({ filename: 'uploads/old.jpg', originalName: 'old.jpg', url: 'https://legacy-bucket.s3.amazonaws.com/uploads/old.jpg', mimeType: 'image/jpeg', size: 1000, uploadedBy: ids.editor, createdAt: new Date('2025-05-01') });
  await db().collection('settings').insertOne({ key: 'site', siteName: 'Embtel', logo: '', contactEmail: 'old@legacy.test', googleAnalyticsId: 'G-LEGACY1234', googleSearchConsoleVerification: 'legacyVerification_123', footerText: 'old footer', socialLinks: { facebook: '' } });

  // The cutover sequence (runbook steps 4–6).
  const { runMigration001 } = await import('@/lib/db/migrations/001-roles-and-authors');
  const { runMigration002 } = await import('@/lib/db/migrations/002-legacy-integrations');
  await runMigration001(mongoose.connection);
  await runMigration002(mongoose.connection);
  const { readContent } = await import('../../scripts/seed-content');
  const { seedContent } = await import('@/lib/content/seed');
  await seedContent(readContent());
});
afterAll(async () => mongo?.stop());

describe('cutover rehearsal on a legacy-shaped database', () => {
  it('legacy users keep their passwords; editor becomes marketing with an author slug', async () => {
    const { User } = await import('@/lib/db/models/User');
    const u = await User.findById(ids.editor).select('+password');
    expect(u).toMatchObject({ role: 'marketing', slug: 'priya-editor' });
    expect(await u!.comparePassword(editorPassword)).toBe(true);
  });

  it('the legacy post, its taxonomy, comments and media all survive and are served', async () => {
    const { loadPost, loadPosts } = await import('@/lib/content/posts');
    const p = await loadPost('a-legacy-admin-post');
    expect(p).toMatchObject({ title: 'A Legacy Admin Post', category: { slug: 'legacy-news' }, author: { name: 'Priya Editor', slug: 'priya-editor' } });
    expect((await loadPosts({ perPage: 50 })).items.map((x) => x.slug)).toEqual(expect.arrayContaining(['a-legacy-admin-post', 'website-speed-costing-you-customers']));
    expect(await db().collection('blogs').findOne({ _id: ids.post })).toMatchObject({ views: 42 });
    const { listComments } = await import('@/lib/admin/comments');
    expect((await listComments({})).items[0]).toMatchObject({ post: 'A Legacy Admin Post', content: 'Nice post' });
    const { listMedia } = await import('@/lib/media/upload');
    expect((await listMedia({})).items.map((m) => m.name)).toContain('old.jpg');
  });

  it('settings keep legacy fields, gain the new ones, and carry over the GA4 / Search Console IDs', async () => {
    const raw = await db().collection('settings').findOne({ key: 'site' });
    expect(raw).toMatchObject({ siteName: 'Embtel', footerText: 'old footer' });
    const { loadSiteSettings } = await import('@/lib/content/settings');
    const s = await loadSiteSettings();
    expect(s.integrations).toMatchObject({ ga4Id: 'G-LEGACY1234', gscVerification: 'legacyVerification_123', googleAdsId: 'AW-18518114785' });
    expect(s.headerNav.length).toBeGreaterThan(0);
  });

  it('pages are seeded and the imported posts are the ones left to assign', async () => {
    const { loadPublishedPage } = await import('@/lib/content/pages');
    expect(await loadPublishedPage('dental-automation')).toMatchObject({ locked: true });
    const { postsWithoutAuthor, assignAuthor } = await import('@/lib/cutover/accounts');
    const unassigned = await postsWithoutAuthor();
    expect(unassigned.map((p) => p.slug)).not.toContain('a-legacy-admin-post');
    expect(unassigned).toHaveLength(6);
    expect(await assignAuthor(unassigned.map((p) => p.slug), String(ids.editor))).toBe(6);
    expect(await postsWithoutAuthor()).toEqual([]);
  });

  it('migrations are safe to re-run', async () => {
    const { runMigration001 } = await import('@/lib/db/migrations/001-roles-and-authors');
    const { runMigration002 } = await import('@/lib/db/migrations/002-legacy-integrations');
    expect(await runMigration001(mongoose.connection)).toEqual({ rolesUpdated: 0, slugsAdded: 0 });
    expect(await runMigration002(mongoose.connection)).toEqual({ copied: 0 });
  });
});
