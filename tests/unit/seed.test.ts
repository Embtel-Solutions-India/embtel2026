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
