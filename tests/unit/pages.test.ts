import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const pages = () => mongoose.connection.db!.collection('pages');

const doc = (over: Record<string, unknown> = {}) => ({
  slug: 'law-industry',
  title: 'Law Industry',
  status: 'published',
  type: 'industry',
  theme: { accent: '#1A6BFF' },
  blocks: [{ type: 'cta', heading: 'Ready?', buttons: [{ label: 'Go', href: '/contact' }] }],
  seo: { noindex: false },
  locked: false,
  updatedAt: new Date('2026-10-01T00:00:00Z'),
  ...over,
});

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

afterEach(async () => {
  await pages().deleteMany({});
  vi.restoreAllMocks();
});

afterAll(async () => {
  await mongo?.stop();
});

describe('loadPublishedPage', () => {
  it('returns a published page as a plain object', async () => {
    const { loadPublishedPage } = await import('@/lib/content/pages');
    await pages().insertOne(doc());
    const p = await loadPublishedPage('law-industry');
    expect(p?.title).toBe('Law Industry');
    expect(p?.blocks).toHaveLength(1);
    expect(typeof p?.id).toBe('string');
    expect(p?.updatedAt).toBe('2026-10-01T00:00:00.000Z');
  });

  it('returns null for a draft', async () => {
    const { loadPublishedPage } = await import('@/lib/content/pages');
    await pages().insertOne(doc({ status: 'draft' }));
    expect(await loadPublishedPage('law-industry')).toBeNull();
  });

  it('returns null for a missing, reserved or malformed slug', async () => {
    const { loadPublishedPage } = await import('@/lib/content/pages');
    await pages().insertOne(doc({ slug: 'admin' }));
    expect(await loadPublishedPage('nope')).toBeNull();
    expect(await loadPublishedPage('admin')).toBeNull();
    expect(await loadPublishedPage('../etc')).toBeNull();
  });

  it('skips invalid blocks', async () => {
    const { loadPublishedPage } = await import('@/lib/content/pages');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await pages().insertOne(doc({ blocks: [{ type: 'hero', variant: 'page' }, doc().blocks[0]] }));
    const p = await loadPublishedPage('law-industry');
    expect(p?.blocks.map((b) => b.type)).toEqual(['cta']);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('[page] skipped invalid block law-industry#0');
  });

  it('returns null when the stored accent is unsafe', async () => {
    const { loadPublishedPage } = await import('@/lib/content/pages');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await pages().insertOne(doc({ theme: { accent: 'red;x:url(y)' } }));
    expect(await loadPublishedPage('law-industry')).toBeNull();
  });
});

describe('loadPublishedPages', () => {
  it('lists only published pages with their dates', async () => {
    const { loadPublishedPages } = await import('@/lib/content/pages');
    await pages().insertMany([doc(), doc({ slug: 'secret', status: 'draft' }), doc({ slug: 'home', type: 'standard' })]);
    const list = await loadPublishedPages();
    expect(list.map((p) => p.slug).sort()).toEqual(['home', 'law-industry']);
    expect(list[0]).toHaveProperty('updatedAt');
  });
});
