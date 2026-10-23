import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import type { Page } from '@/lib/content/blocks';
import { DEFAULT_SETTINGS } from '@/lib/content/settings';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const db = () => mongoose.connection.db!;

const page = (slug: string, heading = 'Hello'): Page => ({
  slug,
  title: slug,
  status: 'published',
  type: 'standard',
  theme: { accent: '#1A6BFF' },
  blocks: [{ type: 'hero', variant: 'simple', heading }],
  seo: { noindex: false },
  locked: false,
});
const PAGES = [page('home'), page('about'), page('contact')];
const SETTINGS = { ...DEFAULT_SETTINGS, organization: { ...DEFAULT_SETTINGS.organization, phone: '+15109627900', email: 'info@embtelsolutions.com' } };

beforeAll(async () => {
  mongo = await startMemoryMongo();
  Object.assign(process.env, {
    NODE_ENV: 'test',
    SITE_URL: 'https://www.embtelsolutions.com',
    MONGODB_URI: mongo.uri,
    SESSION_SECRET: randomBytes(32).toString('hex'),
    ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    AWS_S3_BUCKET: 'test-bucket',
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: randomBytes(8).toString('hex'),
    AWS_SECRET_ACCESS_KEY: randomBytes(16).toString('hex'),
  });
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB();
});

beforeEach(async () => {
  await db().collection('pages').deleteMany({});
  await db().collection('settings').deleteMany({});
});

afterAll(async () => {
  await mongo?.stop();
});

describe('seedContent', () => {
  it('inserts every page into an empty database, then nothing on a second run', async () => {
    const { seedContent } = await import('@/lib/content/seed');
    const first = await seedContent({ pages: PAGES, settings: SETTINGS });
    expect(first.inserted.sort()).toEqual(['about', 'contact', 'home']);
    expect(await db().collection('pages').countDocuments()).toBe(3);
    const second = await seedContent({ pages: PAGES, settings: SETTINGS });
    expect(second.inserted).toEqual([]);
    expect(second.skipped.sort()).toEqual(['about', 'contact', 'home']);
  });

  it('never overwrites a page edited in the admin', async () => {
    const { seedContent } = await import('@/lib/content/seed');
    await seedContent({ pages: PAGES, settings: SETTINGS });
    await db().collection('pages').updateOne({ slug: 'about' }, { $set: { title: 'Edited by Marketing' } });
    await seedContent({ pages: [page('about', 'Imported again')], settings: SETTINGS });
    expect((await db().collection('pages').findOne({ slug: 'about' }))?.title).toBe('Edited by Marketing');
  });

  it('force replaces only the named slugs', async () => {
    const { seedContent } = await import('@/lib/content/seed');
    await seedContent({ pages: PAGES, settings: SETTINGS });
    await db().collection('pages').updateMany({}, { $set: { title: 'Edited' } });
    const r = await seedContent({ pages: PAGES, settings: SETTINGS, force: ['home'] });
    expect(r.inserted).toEqual(['home']);
    const titles = Object.fromEntries((await db().collection('pages').find().toArray()).map((d) => [d.slug, d.title]));
    expect(titles).toEqual({ home: 'home', about: 'Edited', contact: 'Edited' });
  });

  it('settings: fills only empty fields and keeps what is already set', async () => {
    const { seedContent } = await import('@/lib/content/seed');
    await db().collection('settings').insertOne({ key: 'site', siteName: 'Legacy', organization: { name: 'Embtel Solutions', phone: '+19999999999' }, headerNav: [] });
    const r = await seedContent({ pages: [], settings: SETTINGS });
    const doc = await db().collection('settings').findOne({ key: 'site' });
    expect(doc?.organization.phone).toBe('+19999999999');
    expect(doc?.siteName).toBe('Legacy');
    expect(r.settingsFieldsFilled).toContain('logo');
    expect(r.settingsFieldsFilled).toContain('headerNav'); // stored [] counts as empty
    expect(r.settingsFieldsFilled).not.toContain('organization');
  });

  it('rejects an invalid page instead of writing it', async () => {
    const { seedContent } = await import('@/lib/content/seed');
    const bad = { ...page('bad'), theme: { accent: 'red;x:y' } } as Page;
    await expect(seedContent({ pages: [bad], settings: SETTINGS })).rejects.toThrow(/bad/);
    expect(await db().collection('pages').countDocuments()).toBe(0);
  });
});

describe('seedContent settings validation', () => {
  it('replaces a stored field that fails the public schema (e.g. legacy external logo)', async () => {
    const { seedContent } = await import('@/lib/content/seed');
    await db().collection('settings').insertOne({ key: 'site', logo: 'https://legacy-bucket.s3.amazonaws.com/logo.png' });
    const r = await seedContent({ pages: [], settings: SETTINGS });
    expect(r.settingsFieldsFilled).toContain('logo');
    expect((await db().collection('settings').findOne({ key: 'site' }))?.logo).toBe('/images/logo.png');
  });
});

describe('seedContent blog', () => {
  const blog = {
    categories: [{ name: 'Automation', slug: 'automation', description: '' }],
    tags: [{ name: 'Workflows', slug: 'workflows', serviceSlug: 'business-automation' }],
    posts: [{
      slug: 'p1', title: 'Post one', shortDescription: 'S', content: '<p>x</p>', featuredImage: '', imageAltText: '', authorName: 'Embtel Team',
      publishedAt: '2026-09-01T09:00:00.000Z', readingTime: 3, status: 'published' as const, category: 'automation', tags: ['workflows'],
      seo: { metaTitle: '', metaDescription: '' }, faqs: [], keyTakeaways: [], sources: [],
    }],
  };

  it('inserts posts with resolved category/tag ids, once', async () => {
    const { seedContent } = await import('@/lib/content/seed');
    await db().collection('blogs').deleteMany({});
    await db().collection('categories').deleteMany({});
    await db().collection('tags').deleteMany({});
    const r1 = await seedContent({ pages: [], settings: SETTINGS, blog });
    expect(r1.postsInserted).toEqual(['p1']);
    const post = await db().collection('blogs').findOne({ slug: 'p1' });
    const cat = await db().collection('categories').findOne({ slug: 'automation' });
    const tag = await db().collection('tags').findOne({ slug: 'workflows' });
    expect(String(post?.category)).toBe(String(cat?._id));
    expect(post?.tags.map(String)).toEqual([String(tag?._id)]);
    expect(post?.publishedAt).toBeInstanceOf(Date);
    const r2 = await seedContent({ pages: [], settings: SETTINGS, blog });
    expect(r2.postsInserted).toEqual([]);
    expect(r2.postsSkipped).toEqual(['p1']);
  });

  it('never overwrites an edited post, category or tag', async () => {
    const { seedContent } = await import('@/lib/content/seed');
    await db().collection('blogs').updateOne({ slug: 'p1' }, { $set: { title: 'Edited' } });
    await db().collection('tags').updateOne({ slug: 'workflows' }, { $set: { serviceSlug: 'web-development' } });
    await seedContent({ pages: [], settings: SETTINGS, blog });
    expect((await db().collection('blogs').findOne({ slug: 'p1' }))?.title).toBe('Edited');
    expect((await db().collection('tags').findOne({ slug: 'workflows' }))?.serviceSlug).toBe('web-development');
  });
});
