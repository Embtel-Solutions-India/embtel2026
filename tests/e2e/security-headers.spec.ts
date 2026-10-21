import { expect, test, type Page } from '@playwright/test';

const scriptSrc = (csp: string) =>
  csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src ')) ?? '';

async function headersOf(page: Page, path: string) {
  const res = await page.goto(path);
  expect(res?.status()).toBe(200);
  return res!.headers();
}

function expectStaticHeaders(h: Record<string, string>) {
  expect(h['strict-transport-security']).toBe('max-age=63072000; includeSubDomains; preload');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
}

for (const path of ['/', '/admin/login']) {
  test(`${path} sends a nonce CSP without unsafe-inline scripts`, async ({ page }) => {
    const h = await headersOf(page, path);
    const csp = h['content-security-policy'];
    expect(csp).toBeTruthy();
    const s = scriptSrc(csp);
    expect(s).toMatch(/^script-src 'self' 'nonce-[A-Za-z0-9+/=]+'/);
    expect(s).not.toContain("'unsafe-inline'");
    expect(csp).toContain("frame-ancestors 'none'");
    expectStaticHeaders(h);
  });

  test(`${path} renders with no CSP violations in the console`, async ({ page }) => {
    // Our own code only: third-party tags are stubbed (tests/e2e/third-party.spec.ts covers loading them).
    await page.route(/https:\/\/(www\.googletagmanager\.com|elfsightcdn\.com)\//, (r) =>
      r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
    );
    const errors: string[] = [];
    page.on('console', (m) => {
      // Resource 404s (e.g. prefetching nav targets missing from the test DB) are not CSP issues;
      // tests/e2e/all-pages.spec.ts asserts zero console errors against the full content set.
      if (/Failed to load resource/.test(m.text())) return;
      if (m.type() === 'error' || /Content Security Policy/i.test(m.text())) errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });
}

test('nonce is fresh per request', async ({ request }) => {
  const a = (await request.get('/admin/login')).headers()['content-security-policy'];
  const b = (await request.get('/admin/login')).headers()['content-security-policy'];
  expect(a).not.toBe(b);
});

test('/admin is noindex and unframeable', async ({ page }) => {
  const h = await headersOf(page, '/admin/login');
  expect(h['x-robots-tag']).toBe('noindex, nofollow');
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
});

test('image-like /admin paths still hit the auth gate', async ({ page }) => {
  await page.goto('/admin/foo.png');
  await expect(page).toHaveURL(/\/admin\/login\?redirect=%2Fadmin%2Ffoo\.png$/);
});

test('login form hydrates under the CSP', async ({ page }) => {
  await page.goto('/admin/login');
  // React attaches __react* keys to DOM nodes it hydrated; blocked scripts leave none.
  await expect
    .poll(() => page.locator('form').evaluate((el) => Object.keys(el).some((k) => k.startsWith('__react'))))
    .toBe(true);
});
