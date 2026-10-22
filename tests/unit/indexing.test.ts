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
  // Blog: one public post (with category/tag/author), plus draft, future and deleted posts.
  const db = mongoose.connection.db!;
  const cat = new mongoose.Types.ObjectId();
  const tag = new mongoose.Types.ObjectId();
  const author = new mongoose.Types.ObjectId();
  await db.collection('categories').insertOne({ _id: cat, name: 'Automation', slug: 'automation' });
  await db.collection('tags').insertOne({ _id: tag, name: 'Workflows', slug: 'workflows' });
  await db.collection('users').insertOne({ _id: author, name: 'Ritu', email: 'r@example.com', slug: 'ritu' });
  const post = { category: cat, tags: [tag], isDeleted: false, publishedAt: new Date('2026-09-01T09:00:00Z'), updatedAt: new Date('2026-09-05T00:00:00Z'), shortDescription: 'Save time & money', content: '<p>x</p>' };
  await db.collection('blogs').insertMany([
    { ...post, slug: 'public-post', title: 'Automate <everything> & "win"', status: 'published', author },
    { ...post, slug: 'draft-post', title: 'Draft post', status: 'draft' },
    { ...post, slug: 'future-post', title: 'Future post', status: 'published', publishedAt: new Date(Date.now() + 86_400_000) },
    { ...post, slug: 'deleted-post', title: 'Deleted post', status: 'published', isDeleted: true },
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

describe('feeds exclude hidden posts', () => {
  const HIDDEN = ['draft-post', 'future-post', 'deleted-post'];

  it('sitemap lists /blog, the public post, its category/tag and author', async () => {
    const sitemap = (await import('@/app/sitemap')).default;
    const urls = (await sitemap()).map((e) => e.url);
    for (const u of ['/blog', '/blog/public-post', '/blog/category/automation', '/blog/tag/workflows', '/authors/ritu']) {
      expect(urls).toContain(`https://www.embtelsolutions.com${u}`);
    }
    for (const h of HIDDEN) expect(urls.join(' ')).not.toContain(h);
    const entry = (await sitemap()).find((e) => e.url.endsWith('/blog/public-post'));
    expect(entry?.lastModified).toBe('2026-09-05T00:00:00.000Z');
  });

  it('llms.txt has a Blog section with only public posts', async () => {
    const { GET } = await import('@/app/llms.txt/route');
    const text = await (await GET()).text();
    expect(text).toContain('## Blog\n- [Automate <everything> & "win"](https://www.embtelsolutions.com/blog/public-post): Save time & money');
    for (const h of HIDDEN) expect(text).not.toContain(h);
  });

  it('RSS feed is valid XML with only public posts, escaped', async () => {
    const { GET } = await import('@/app/feed.xml/route');
    const res = await GET();
    expect(res.headers.get('content-type')).toBe('application/rss+xml; charset=utf-8');
    const xml = await res.text();
    expect(xml).toContain('<title>Automate &lt;everything&gt; &amp; &quot;win&quot;</title>');
    const cheerio = await import('cheerio');
    const $ = cheerio.load(xml, { xmlMode: true });
    expect($('rss > channel > item')).toHaveLength(1);
    expect($('item > link').text()).toBe('https://www.embtelsolutions.com/blog/public-post');
    expect($('item > pubDate').text()).toBe('Tue, 01 Sep 2026 09:00:00 GMT');
    expect($('channel > atom\\:link').attr('href')).toBe('https://www.embtelsolutions.com/feed.xml');
    for (const h of HIDDEN) expect(xml).not.toContain(h);
    // Cold dynamic imports of the route + cheerio take several seconds when the full suite runs in parallel.
  }, 20_000);
});
