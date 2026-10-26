// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { PublishedPage } from '@/lib/content/pages';
import { DEFAULT_SETTINGS, SiteSettingsSchema, type SiteSettings } from '@/lib/content/settings';

beforeAll(() => {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    SITE_URL: 'https://www.embtelsolutions.com',
    MONGODB_URI: 'mongodb://127.0.0.1:1/unused',
    SESSION_SECRET: randomBytes(32).toString('hex'),
    ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    AWS_S3_BUCKET: 'test-bucket',
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: randomBytes(8).toString('hex'),
    AWS_SECRET_ACCESS_KEY: randomBytes(16).toString('hex'),
  });
});
afterEach(() => {
  cleanup();
  delete process.env.VERCEL_ENV;
});

const SETTINGS: SiteSettings = SiteSettingsSchema.parse(JSON.parse(readFileSync('content/settings.json', 'utf8')));

const page = (over: Partial<PublishedPage> = {}): PublishedPage => ({
  slug: 'law-industry',
  title: 'Law Industry',
  status: 'published',
  type: 'industry',
  theme: { accent: '#1A6BFF' },
  seo: { noindex: false },
  locked: false,
  blocks: [
    {
      type: 'hero',
      variant: 'page',
      heading: 'Digital Solutions for *Law Firms*',
      breadcrumb: [{ label: 'Home', href: '/' }, { label: 'Industries', href: '/industries' }, { label: 'Law Industry' }],
      lead: 'Modernize your legal practice with secure, compliant digital platforms that enhance client experience and keep matters moving without the paperwork that slows your team down.',
    },
  ],
  ...over,
});

describe('metadata', () => {
  it('builds canonical URLs on the www host without trailing slash (home keeps /)', async () => {
    const { canonicalUrl } = await import('@/lib/seo/metadata');
    expect(canonicalUrl('/')).toBe('https://www.embtelsolutions.com/');
    expect(canonicalUrl('/law-industry')).toBe('https://www.embtelsolutions.com/law-industry');
  });

  it('falls back to the hero lead, truncated to ≤160 chars at a word boundary', async () => {
    const { buildPageMetadata } = await import('@/lib/seo/metadata');
    const m = buildPageMetadata(page(), SETTINGS);
    const d = m.description as string;
    expect(d.length).toBeLessThanOrEqual(160);
    expect(d.endsWith('…')).toBe(true);
    expect(d).toMatch(/^Modernize your legal practice/);
    expect(d.slice(0, -1)).not.toMatch(/\s$/);
  });

  it('uses SEO overrides, canonical, Open Graph and a default title suffix', async () => {
    const { buildPageMetadata } = await import('@/lib/seo/metadata');
    const plain = buildPageMetadata(page(), SETTINGS);
    expect(plain.title).toEqual({ absolute: 'Law Industry — Embtel Solutions' });
    expect(plain.alternates?.canonical).toBe('https://www.embtelsolutions.com/law-industry');
    expect(plain.openGraph).toMatchObject({ siteName: 'Embtel Solutions', url: 'https://www.embtelsolutions.com/law-industry' });
    const custom = buildPageMetadata(page({ seo: { noindex: false, metaTitle: 'Custom', metaDescription: 'Desc' } }), SETTINGS);
    expect(custom.title).toEqual({ absolute: 'Custom' });
    expect(custom.description).toBe('Desc');
  });

  it('is noindex outside production and for noindex pages', async () => {
    const { buildPageMetadata } = await import('@/lib/seo/metadata');
    expect(buildPageMetadata(page(), SETTINGS).robots).toEqual({ index: false, follow: false });
    process.env.VERCEL_ENV = 'production';
    expect(buildPageMetadata(page(), SETTINGS).robots).toEqual({ index: true, follow: true });
    expect(buildPageMetadata(page({ seo: { noindex: true } }), SETTINGS).robots).toEqual({ index: false, follow: false });
  });
});

describe('JSON-LD', () => {
  it('omits LocalBusiness when the address is incomplete', async () => {
    const { localBusinessLd } = await import('@/lib/seo/jsonld');
    const noStreet = { ...SETTINGS, organization: { ...SETTINGS.organization, address: { ...SETTINGS.organization.address, street: '' } } };
    expect(localBusinessLd(noStreet)).toBeNull();
    expect(localBusinessLd(DEFAULT_SETTINGS)).toBeNull();
    expect(localBusinessLd(SETTINGS)).toMatchObject({ address: { addressLocality: 'Fremont', postalCode: '94538' } });
    const withAddress = {
      ...SETTINGS,
      organization: { ...SETTINGS.organization, address: { street: '1 Main St', city: 'Fremont', region: 'CA', postalCode: '94538', country: 'US' as const } },
    };
    expect(localBusinessLd(withAddress)).toMatchObject({ '@type': 'ProfessionalService', address: { addressLocality: 'Fremont', addressCountry: 'US' } });
  });

  it('builds the page graph: organization, website, breadcrumb, service and FAQ', async () => {
    const { pageJsonLd } = await import('@/lib/seo/jsonld');
    const p = page({
      type: 'service',
      blocks: [...page().blocks, { type: 'faq', variant: 'static', items: [{ q: 'Is it secure?', a: 'Yes.' }] }],
    });
    const types = pageJsonLd(p, SETTINGS).map((n) => n['@type']);
    expect(types).toEqual(['Organization', 'WebSite', 'BreadcrumbList', 'Service', 'FAQPage']);
    const crumbs = pageJsonLd(p, SETTINGS).find((n) => n['@type'] === 'BreadcrumbList') as unknown as { itemListElement: { item: string }[] };
    expect(crumbs.itemListElement.map((i) => i.item)).toEqual([
      'https://www.embtelsolutions.com/',
      'https://www.embtelsolutions.com/industries',
      'https://www.embtelsolutions.com/law-industry',
    ]);
  });

  it('home gets no breadcrumb', async () => {
    const { pageJsonLd } = await import('@/lib/seo/jsonld');
    const types = pageJsonLd(page({ slug: 'home', type: 'standard' }), SETTINGS).map((n) => n['@type']);
    expect(types).not.toContain('BreadcrumbList');
  });

  it('escapes </script> in rendered JSON-LD', async () => {
    const { JsonLd } = await import('@/components/seo/JsonLd');
    const { container } = render(<JsonLd data={[{ '@type': 'Thing', name: '</script><script>alert(1)</script>' }]} nonce="n" />);
    const scripts = container.querySelectorAll('script');
    expect(scripts).toHaveLength(1);
    expect(scripts[0].innerHTML).not.toContain('</script>');
    expect(JSON.parse(scripts[0].innerHTML)['@graph'][0].name).toBe('</script><script>alert(1)</script>');
  });
});

describe('title suffix', () => {
  it('does not repeat the brand when the title already contains it', async () => {
    const { buildPageMetadata } = await import('@/lib/seo/metadata');
    const home = buildPageMetadata(page({ slug: 'home', title: 'Embtel Solutions — Technology & Automation for Growing Businesses' }), SETTINGS);
    expect(home.title).toEqual({ absolute: 'Embtel Solutions — Technology & Automation for Growing Businesses' });
  });
});

describe('blog SEO', () => {
  const post = {
    id: '1', slug: 'website-speed', title: 'Is Your Website Speed Costing You Customers?', shortDescription: 'Slow pages lose buyers.',
    featuredImage: 'https://images.unsplash.com/p.jpg', imageAltText: 'Stopwatch', category: { name: 'Web Development', slug: 'web-development' },
    readingTime: 5, publishedAt: '2026-09-01T09:00:00.000Z', content: '<p>one two three</p>',
    tags: [{ name: 'Performance', slug: 'performance', serviceSlug: 'web-development' }],
    author: { name: 'Embtel Team', slug: null, jobTitle: '', bio: '', avatar: '', sameAs: [], expertise: [] },
    faqs: [{ q: 'What is LCP?', a: 'Largest Contentful Paint.' }], keyTakeaways: [], sources: [{ title: 'web.dev', url: 'https://web.dev/articles/lcp' }],
    focusKeyword: 'website speed', secondaryKeywords: ['page speed'], seo: { keywords: ['core web vitals'], noindex: false },
    updatedAt: '2026-09-02T00:00:00.000Z', lastReviewedAt: null,
  } as const;

  it('post metadata: brand once, article OG, keywords, canonical override only on our host', async () => {
    const { buildPostMetadata } = await import('@/lib/seo/metadata');
    const m = buildPostMetadata({ ...post } as never, SETTINGS);
    expect(m.title).toEqual({ absolute: 'Is Your Website Speed Costing You Customers? — Embtel Solutions' });
    expect(m.alternates?.canonical).toBe('https://www.embtelsolutions.com/blog/website-speed');
    expect(m.openGraph).toMatchObject({ type: 'article', publishedTime: post.publishedAt, modifiedTime: post.updatedAt, section: 'Web Development', tags: ['Performance'] });
    expect(m.keywords).toEqual(['website speed', 'page speed', 'core web vitals']);
    const foreign = buildPostMetadata({ ...post, seo: { ...post.seo, canonicalUrl: 'https://evil.example/x' } } as never, SETTINGS);
    expect(foreign.alternates?.canonical).toBe('https://www.embtelsolutions.com/blog/website-speed');
    const own = buildPostMetadata({ ...post, seo: { ...post.seo, canonicalUrl: 'https://www.embtelsolutions.com/blog/original' } } as never, SETTINGS);
    expect(own.alternates?.canonical).toBe('https://www.embtelsolutions.com/blog/original');
  });

  it('BlogPosting credits the Organization when there is no author user', async () => {
    const { blogPostingLd } = await import('@/lib/seo/jsonld');
    const ld = blogPostingLd({ ...post } as never);
    expect(ld).toMatchObject({
      '@type': 'BlogPosting', headline: post.title, datePublished: post.publishedAt, dateModified: post.updatedAt,
      author: { '@id': 'https://www.embtelsolutions.com/#organization' }, articleSection: 'Web Development',
      keywords: 'website speed, page speed, core web vitals', citation: ['https://web.dev/articles/lcp'],
    });
  });

  it('BlogPosting names a Person author with their page when they have one', async () => {
    const { blogPostingLd } = await import('@/lib/seo/jsonld');
    const ld = blogPostingLd({ ...post, author: { ...post.author, name: 'Ritu Writer', slug: 'ritu-writer', sameAs: ['https://www.linkedin.com/in/x'] } } as never);
    expect(ld.author).toEqual({ '@type': 'Person', name: 'Ritu Writer', url: 'https://www.embtelsolutions.com/authors/ritu-writer', sameAs: ['https://www.linkedin.com/in/x'] });
  });

  it('post graph: Organization, WebSite, BlogPosting, BreadcrumbList, FAQPage', async () => {
    const { postJsonLd } = await import('@/lib/seo/jsonld');
    expect(postJsonLd({ ...post } as never, SETTINGS).map((n) => n['@type'])).toEqual(['Organization', 'WebSite', 'BlogPosting', 'BreadcrumbList', 'FAQPage']);
  });
});

describe('offices (US + India)', () => {
  const INDIA = { label: 'India office', street: '12 MG Road', city: 'Bengaluru', region: 'KA', postalCode: '560001', country: 'IN' as const, phone: '+918000000000' };
  const withIndia = () => SiteSettingsSchema.parse({ ...SETTINGS, organization: { ...SETTINGS.organization, offices: [INDIA] } });

  it('the settings schema accepts US/IN offices and rejects other countries', () => {
    expect(withIndia().organization.offices).toHaveLength(1);
    expect(SETTINGS.organization.offices).toEqual([]);
    expect(SiteSettingsSchema.safeParse({ ...SETTINGS, organization: { ...SETTINGS.organization, offices: [{ ...INDIA, country: 'FR' }] } }).success).toBe(false);
  });

  it('Organization keeps the US address and lists each office as a location', async () => {
    const { organizationLd } = await import('@/lib/seo/jsonld');
    const ld = organizationLd(withIndia()) as unknown as { address: { addressCountry: string }; location: { name: string; address: { addressCountry: string; addressLocality: string } }[] };
    expect(ld.address.addressCountry).toBe('US');
    expect(ld.location).toEqual([expect.objectContaining({ '@type': 'Place', name: 'India office', telephone: '+918000000000', address: expect.objectContaining({ addressCountry: 'IN', addressLocality: 'Bengaluru' }) })]);
    expect('location' in organizationLd(SETTINGS)).toBe(false);
  });

  it('the footer shows the US address and every office', async () => {
    const { Footer } = await import('@/components/site/Footer');
    const { container } = render(<Footer settings={withIndia()} />);
    const text = [...container.querySelectorAll('address')].map((a) => a.textContent);
    expect(text).toHaveLength(2);
    expect(text[0]).toContain('Fremont');
    expect(text[1]).toContain('India office');
    expect(text[1]).toContain('Bengaluru');
  });
});
