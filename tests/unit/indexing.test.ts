import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {} }));
vi.mock('next/server', () => ({ connection: async () => {} }));

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const KEY = randomBytes(16).toString('hex');

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
  const base = { status: 'published', theme: { accent: '#1A6BFF' }, locked: false, updatedAt: new Date('2026-10-01T00:00:00Z') };
  const hero = (lead: string) => [{ type: 'hero', variant: 'page', heading: 'H', lead }];
  await mongoose.connection.db!.collection('pages').insertMany([
    { ...base, slug: 'home', title: 'Embtel Solutions', type: 'standard', seo: { noindex: false }, blocks: hero('Home lead.') },
    { ...base, slug: 'web-development', title: 'Web Development', type: 'service', seo: { noindex: false }, blocks: hero('Websites built right.') },
    { ...base, slug: 'law-industry', title: 'Law Industry', type: 'industry', seo: { noindex: false }, blocks: hero('Law firms.') },
    { ...base, slug: 'hidden', title: 'Hidden', type: 'standard', seo: { noindex: true }, blocks: hero('x') },
    { ...base, slug: 'draft', title: 'Draft', type: 'standard', status: 'draft', seo: { noindex: false }, blocks: hero('x') },
  ]);
});

afterEach(() => {
  delete process.env.VERCEL_ENV;
  delete process.env.INDEXNOW_KEY;
  vi.restoreAllMocks();
});

afterAll(async () => {
  await mongo?.stop();
});

describe('robots disallows non-production', () => {
  it('blocks everything when not production', async () => {
    const robots = (await import('@/app/robots')).default;
    expect(robots().rules).toEqual([{ userAgent: '*', disallow: '/' }]);
  });

  it('allows search and AI crawlers in production, never /admin or /api', async () => {
    process.env.VERCEL_ENV = 'production';
    const robots = (await import('@/app/robots')).default;
    const r = robots();
    const rules = r.rules as { userAgent: string | string[]; allow?: string; disallow?: string[] }[];
    const agents = rules.flatMap((x) => x.userAgent);
    for (const bot of ['*', 'GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended', 'Bingbot']) expect(agents).toContain(bot);
    for (const rule of rules) expect(rule.disallow).toEqual(['/admin', '/api']);
    expect(r.sitemap).toBe('https://www.embtelsolutions.com/sitemap.xml');
  });
});

describe('sitemap', () => {
  it('lists published, indexable pages with home first', async () => {
    const sitemap = (await import('@/app/sitemap')).default;
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls[0]).toBe('https://www.embtelsolutions.com/');
    expect(urls).toContain('https://www.embtelsolutions.com/web-development');
    expect(urls).not.toContain('https://www.embtelsolutions.com/hidden');
    expect(urls).not.toContain('https://www.embtelsolutions.com/draft');
  });
});

describe('llms.txt', () => {
  it('summarises the site with grouped page links', async () => {
    const { GET } = await import('@/app/llms.txt/route');
    const text = await (await GET()).text();
    expect(text).toMatch(/^# Embtel Solutions\n/);
    expect(text).toContain('## Services\n- [Web Development](https://www.embtelsolutions.com/web-development): Websites built right.');
    expect(text).toContain('## Industries\n- [Law Industry](https://www.embtelsolutions.com/law-industry): Law firms.');
    expect(text).not.toContain('Hidden');
  });
});

describe('pingIndexNow', () => {
  it('does nothing without a key or outside production', async () => {
    const { pingIndexNow } = await import('@/lib/seo/indexnow');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(await pingIndexNow(['https://www.embtelsolutions.com/'])).toEqual({ ok: false });
    process.env.INDEXNOW_KEY = KEY;
    expect(await pingIndexNow(['https://www.embtelsolutions.com/'])).toEqual({ ok: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('posts the exact IndexNow body in production', async () => {
    const { pingIndexNow } = await import('@/lib/seo/indexnow');
    process.env.INDEXNOW_KEY = KEY;
    process.env.VERCEL_ENV = 'production';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    expect(await pingIndexNow(['https://www.embtelsolutions.com/law-industry'])).toEqual({ ok: true });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.indexnow.org/indexnow');
    expect(JSON.parse(String(init?.body))).toEqual({
      host: 'www.embtelsolutions.com',
      key: KEY,
      keyLocation: 'https://www.embtelsolutions.com/indexnow-key.txt',
      urlList: ['https://www.embtelsolutions.com/law-industry'],
    });
  });

  it('never throws on network errors', async () => {
    const { pingIndexNow } = await import('@/lib/seo/indexnow');
    process.env.INDEXNOW_KEY = KEY;
    process.env.VERCEL_ENV = 'production';
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await pingIndexNow(['https://www.embtelsolutions.com/'])).toEqual({ ok: false });
  });
});
