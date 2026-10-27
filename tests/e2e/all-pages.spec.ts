import { readdirSync, readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const SLUGS = readdirSync('content/pages').filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
const json = <T,>(f: string): T => JSON.parse(readFileSync(f, 'utf8'));
const BLOG_PATHS = [
  '/blog',
  ...readdirSync('content/blog/posts').map((f) => `/blog/${f.replace(/\.json$/, '')}`),
  ...json<{ slug: string }[]>('content/blog/categories.json').map((c) => `/blog/category/${c.slug}`),
  ...json<{ slug: string }[]>('content/blog/tags.json').map((t) => `/blog/tag/${t.slug}`),
  '/authors/ritu-writer', // seeded by tests/e2e/server.ts
];
const PATHS = [...SLUGS.map((s) => (s === 'home' ? '/' : `/${s}`)), ...BLOG_PATHS];

// Third parties are stubbed so failures are about our code, not Google/Elfsight availability.
async function stubThirdParties(page: Page) {
  await page.route(/https:\/\/(www\.googletagmanager\.com|elfsightcdn\.com|[^/]*\.elfsight(cdn)?\.com)\//, (r) =>
    r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
  );
}

test('the content set covers all 30 legacy non-blog pages plus /paid-ads', () => {
  expect(SLUGS).toHaveLength(31);
});

for (const path of PATHS) {
  test(`${path}: 200, one h1, canonical, JSON-LD, accessible, no console errors`, async ({ page }) => {
    await stubThirdParties(page);
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));

    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '');
    expect(ld['@context']).toBe('https://schema.org');

    const axe = await new AxeBuilder({ page }).analyze();
    const serious = axe.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    expect(serious).toEqual([]);

    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test(`${path}: cannot be scrolled sideways at 390px`, async ({ page }) => {
    await stubThirdParties(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    // What a visitor experiences: decorative glows/marquee overflow is clipped, so the page must not pan.
    expect(await page.evaluate(() => (window.scrollTo(1000, 0), window.scrollX))).toBe(0);
  });
}
