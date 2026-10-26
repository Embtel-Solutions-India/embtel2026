import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { DEFAULT_SETTINGS } from '@/lib/content/settings';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const db = () => mongoose.connection.db!;

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
  await db().collection('settings').deleteMany({});
});

afterAll(async () => {
  await mongo?.stop();
});

describe('seedContent', () => {
  it('settings: fills only empty fields and keeps what is already set', async () => {
    const { seedContent } = await import('@/lib/content/seed');
    await db().collection('settings').insertOne({ key: 'site', siteName: 'Legacy', organization: { name: 'Embtel Solutions', phone: '+19999999999' }, headerNav: [] });
    const r = await seedContent({ settings: SETTINGS });
    const doc = await db().collection('settings').findOne({ key: 'site' });
    expect(doc?.organization.phone).toBe('+19999999999');
    expect(doc?.siteName).toBe('Legacy');
    expect(r.settingsFieldsFilled).toContain('logo');
    expect(r.settingsFieldsFilled).toContain('headerNav'); // stored [] counts as empty
    expect(r.settingsFieldsFilled).not.toContain('organization');
  });

});

describe('seedContent settings validation', () => {
  it('replaces a stored field that fails the public schema (e.g. legacy external logo)', async () => {
    const { seedContent } = await import('@/lib/content/seed');
    await db().collection('settings').insertOne({ key: 'site', logo: 'https://legacy-bucket.s3.amazonaws.com/logo.png' });
    const r = await seedContent({ settings: SETTINGS });
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
    const r1 = await seedContent({ settings: SETTINGS, blog });
    expect(r1.postsInserted).toEqual(['p1']);
    const post = await db().collection('blogs').findOne({ slug: 'p1' });
    const cat = await db().collection('categories').findOne({ slug: 'automation' });
    const tag = await db().collection('tags').findOne({ slug: 'workflows' });
    expect(String(post?.category)).toBe(String(cat?._id));
    expect(post?.tags.map(String)).toEqual([String(tag?._id)]);
    expect(post?.publishedAt).toBeInstanceOf(Date);
    const r2 = await seedContent({ settings: SETTINGS, blog });
    expect(r2.postsInserted).toEqual([]);
    expect(r2.postsSkipped).toEqual(['p1']);
  });

  it('never overwrites an edited post, category or tag', async () => {
    const { seedContent } = await import('@/lib/content/seed');
    await db().collection('blogs').updateOne({ slug: 'p1' }, { $set: { title: 'Edited' } });
    await db().collection('tags').updateOne({ slug: 'workflows' }, { $set: { serviceSlug: 'web-development' } });
    await seedContent({ settings: SETTINGS, blog });
    expect((await db().collection('blogs').findOne({ slug: 'p1' }))?.title).toBe('Edited');
    expect((await db().collection('tags').findOne({ slug: 'workflows' }))?.serviceSlug).toBe('web-development');
  });
});
