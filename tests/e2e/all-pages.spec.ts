import { readdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const SLUGS = readdirSync('content/pages').filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
const pathOf = (slug: string) => (slug === 'home' ? '/' : `/${slug}`);

// Third parties are stubbed so failures are about our code, not Google/Elfsight availability.
async function stubThirdParties(page: Page) {
  await page.route(/https:\/\/(www\.googletagmanager\.com|elfsightcdn\.com|[^/]*\.elfsight(cdn)?\.com)\//, (r) =>
    r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
  );
}

test('the content set covers all 30 legacy non-blog pages', () => {
  expect(SLUGS).toHaveLength(30);
});

for (const slug of SLUGS) {
  test(`${pathOf(slug)}: 200, one h1, canonical, JSON-LD, accessible, no console errors`, async ({ page }) => {
    await stubThirdParties(page);
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));

    const res = await page.goto(pathOf(slug));
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

  test(`${pathOf(slug)}: cannot be scrolled sideways at 390px`, async ({ page }) => {
    await stubThirdParties(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(pathOf(slug));
    // What a visitor experiences: decorative glows/marquee overflow is clipped, so the page must not pan.
    expect(await page.evaluate(() => (window.scrollTo(1000, 0), window.scrollX))).toBe(0);
  });
}
