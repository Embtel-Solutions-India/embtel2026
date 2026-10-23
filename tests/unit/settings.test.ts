import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;

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
});

afterEach(async () => {
  await mongoose.connection.db?.collection('settings').deleteMany({});
  vi.restoreAllMocks();
});

afterAll(async () => {
  await mongo?.stop();
});

describe('loadSiteSettings', () => {
  it('returns defaults when no settings document exists', async () => {
    const { loadSiteSettings, DEFAULT_SETTINGS } = await import('@/lib/content/settings');
    expect(await loadSiteSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('merges stored fields over defaults', async () => {
    const { loadSiteSettings } = await import('@/lib/content/settings');
    await mongoose.connection.db!.collection('settings').insertOne({
      key: 'site',
      siteName: 'Legacy blog', // legacy field, must be ignored by the public shape
      organization: { name: 'Embtel Solutions', phone: '+15109627900' },
      integrations: { googleAdsId: 'AW-18518114785' },
    });
    const s = await loadSiteSettings();
    expect(s.organization.phone).toBe('+15109627900');
    expect(s.integrations.googleAdsId).toBe('AW-18518114785');
    expect(s.headerNav).toEqual([]);
  });

  it('falls back per field when a stored field is invalid, logging only the path', async () => {
    const { loadSiteSettings, DEFAULT_SETTINGS } = await import('@/lib/content/settings');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await mongoose.connection.db!.collection('settings').insertOne({
      key: 'site',
      social: [{ network: 'x', url: 'javascript:alert(1)' }],
      whatsapp: { number: '15109627900', message: 'Hi' },
    });
    const s = await loadSiteSettings();
    expect(s.social).toEqual(DEFAULT_SETTINGS.social);
    expect(s.whatsapp?.number).toBe('15109627900');
    expect(log).toHaveBeenCalledWith('[settings] invalid field, using default:', 'social');
  });
});

describe('content/settings.json', () => {
  it('passes the public settings schema', async () => {
    const { SiteSettingsSchema } = await import('@/lib/content/settings');
    const seed = JSON.parse(readFileSync('content/settings.json', 'utf8'));
    const parsed = SiteSettingsSchema.parse(seed);
    expect(parsed.integrations.googleAdsId).toBe('AW-18518114785');
    expect(parsed.headerNav.map((n) => n.label)).toEqual([
      'Home', 'About', 'Services', 'Industries', 'Work', 'Process', 'Blog', 'Contact',
    ]);
    expect(parsed.headerNav.find((n) => n.label === 'Services')?.children).toHaveLength(12);
    expect(parsed.headerNav.find((n) => n.label === 'Industries')?.children).toHaveLength(9);
  });
});
