import { expect, test, type Page } from '@playwright/test';

// Third-party hosts are intercepted: no real network, just "did we request it, with the nonce".
async function stubThirdParties(page: Page) {
  const hits: string[] = [];
  await page.route(/https:\/\/(www\.googletagmanager\.com|elfsightcdn\.com|[^/]*\.elfsight(cdn)?\.com)\//, (route) => {
    hits.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });
  const violations: string[] = [];
  page.on('console', (m) => /Content Security Policy|Refused to/i.test(m.text()) && violations.push(m.text()));
  return { hits, violations };
}

for (const path of ['/', '/law-industry']) {
  test(`${path} waits for the first interaction, then loads the Google Ads tag with the page nonce`, async ({ page }) => {
    const { hits, violations } = await stubThirdParties(page);
    await page.goto(`${path}?gclid=e2e-click&utm_source=google`);
    await page.waitForLoadState('networkidle');
    // Nothing from Google before the visitor does anything (no third-party cookies for Lighthouse)…
    expect(hits.filter((u) => u.includes('googletagmanager.com'))).toEqual([]);
    // …but the config is already queued and the click ID is kept for the contact form.
    const queued = await page.evaluate(() => ((window as unknown as { dataLayer?: unknown[][] }).dataLayer ?? []).some((a) => a[0] === 'config' && a[1] === 'AW-18518114785'));
    expect(queued).toBe(true);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('embtel_attr') ?? '{}').gclid)).toBe('e2e-click');
    await page.mouse.wheel(0, 300);
    await expect.poll(() => hits.some((u) => u.startsWith('https://www.googletagmanager.com/gtag/js?id=AW-18518114785'))).toBe(true);
    const nonce = await page.$eval('script[src*="gtag/js"]', (e) => (e as HTMLScriptElement).nonce);
    expect((nonce ?? '').length).toBeGreaterThan(0);
    expect(violations).toEqual([]);
  });
}

test('Elfsight loads only on pages with a reviews block', async ({ page }) => {
  const { hits } = await stubThirdParties(page);
  await page.goto('/law-industry');
  await page.waitForLoadState('networkidle');
  expect(hits.some((u) => u.includes('elfsightcdn.com/platform.js'))).toBe(false);

  await page.goto('/');
  await page.mouse.wheel(0, 4000);
  await expect.poll(() => hits.some((u) => u.includes('elfsightcdn.com/platform.js')), { timeout: 15_000 }).toBe(true);
  await expect(page.locator('.elfsight-app-0804c920-a003-45d4-8ceb-8f4b7a45f7e4')).toHaveCount(1);
});
