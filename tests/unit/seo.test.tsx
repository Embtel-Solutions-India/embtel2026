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
  id: '1',
  slug: 'law-industry',
  title: 'Law Industry',
  status: 'published',
  type: 'industry',
  theme: { accent: '#1A6BFF' },
  seo: { noindex: false },
  locked: false,
  updatedAt: '2026-10-01T00:00:00.000Z',
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
