import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { E2E_PORT } from './creds';

const SLUG = 'website-speed-costing-you-customers';
const legacy = JSON.parse(readFileSync(`content/blog/posts/${SLUG}.json`, 'utf8')) as { title: string; publishedAt: string };

test('legacy post renders at its exact URL', async ({ page }) => {
  const res = await page.goto(`/blog/${SLUG}`);
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText(legacy.title);
  await expect(page.locator('article time').first()).toHaveAttribute('dateTime', legacy.publishedAt);
  expect(await page.locator('.bd-img').getAttribute('alt')).toBeTruthy();
  await expect(page.getByText('Embtel Team').first()).toBeVisible();
});

test('share links, related posts and related services', async ({ page }) => {
  await page.goto(`/blog/${SLUG}`);
  const canonical = `http://localhost:${E2E_PORT}/blog/${SLUG}`;
  for (const a of await page.locator('[aria-label^="Share on"]').all()) {
    expect(decodeURIComponent((await a.getAttribute('href')) ?? '')).toContain(canonical);
  }
  const related = page.getByRole('region', { name: 'Related articles' }).locator('a[href^="/blog/"]');
  expect(await related.count()).toBeGreaterThan(0);
  expect(await related.count()).toBeLessThanOrEqual(3);
  for (const href of await related.evaluateAll((els) => els.map((e) => e.getAttribute('href')))) expect(href).not.toBe(`/blog/${SLUG}`);
  await expect(page.getByRole('region', { name: 'Related services' }).getByRole('link', { name: 'Web Development' })).toHaveAttribute('href', '/web-development');
});

test('post SEO: one canonical, article Open Graph, BlogPosting graph', async ({ page }) => {
  await page.goto(`/blog/${SLUG}`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `http://localhost:${E2E_PORT}/blog/${SLUG}`);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute('content', legacy.publishedAt);
  const ld = page.locator('script[type="application/ld+json"]');
  await expect(ld).toHaveCount(1);
  const graph = JSON.parse((await ld.textContent()) ?? '')['@graph'] as { '@type': string; author?: { '@id'?: string } }[];
  expect(graph.map((n) => n['@type'])).toEqual(['Organization', 'WebSite', 'BlogPosting', 'BreadcrumbList']);
  expect(graph.find((n) => n['@type'] === 'BlogPosting')?.author?.['@id']).toMatch(/#organization$/);
});

test('post OG image renders; unknown slug redirects to the default card', async ({ request }) => {
  const ok = await request.get(`/blog/${SLUG}/opengraph-image`);
  expect(ok.headers()['content-type']).toBe('image/png');
  const unknown = await request.get('/blog/nope/opengraph-image', { maxRedirects: 0 });
  expect(unknown.status()).toBe(307);
  expect(unknown.headers()['location']).toMatch(/\/opengraph-image$/);
});

test('author page has ProfilePage structured data', async ({ page }) => {
  await page.goto('/authors/ritu-writer');
  const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '')['@graph'] as { '@type': string }[];
  expect(graph.map((n) => n['@type'])).toContain('ProfilePage');
});
