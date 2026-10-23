import { expect, test } from '@playwright/test';
import { E2E_PORT } from './creds';

for (const path of ['/', '/law-industry']) {
  test(`${path} renders from the database with exactly one h1`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('banner')).toBeVisible();
  });
}

test('law-industry shows its breadcrumb and hero copy', async ({ page }) => {
  await page.goto('/law-industry');
  await expect(page.locator('h1')).toHaveText('Digital Solutions for Law Firms');
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Industries');
});

for (const path of ['/secret-draft', '/does-not-exist']) {
  test(`${path} is a 404 with site chrome`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByText('Secret Draft')).toHaveCount(0);
  });
}

test('/admin is still the admin gate, not a CMS page', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('crawlers get a real 404 status for unknown, draft and duplicate-home slugs', async ({ request }) => {
  const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
  for (const path of ['/does-not-exist', '/secret-draft', '/home']) {
    const res = await request.get(path, { headers: { 'user-agent': ua } });
    expect(res.status(), path).toBe(404);
    expect(res.headers()['content-security-policy'], path).toContain("'nonce-");
  }
  expect((await request.get('/law-industry', { headers: { 'user-agent': ua } })).status()).toBe(200);
});

for (const path of ['/', '/law-industry']) {
  test(`${path} has canonical, Open Graph, noindex (non-production) and valid JSON-LD`, async ({ page }) => {
    await page.goto(path);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute('href', `http://localhost:${E2E_PORT}${path}`);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    const ld = page.locator('script[type="application/ld+json"]');
    await expect(ld).toHaveCount(1);
    const json = JSON.parse((await ld.textContent()) ?? '');
    expect(json['@context']).toBe('https://schema.org');
    expect(json['@graph'].map((n: { '@type': string }) => n['@type'])).toContain('Organization');
  });
}

test('robots.txt blocks crawling outside production', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  expect(await res.text()).toMatch(/User-Agent: \*\s+Disallow: \//i);
});

test('sitemap.xml lists published pages but not drafts', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  expect(xml).toContain(`<loc>http://localhost:${E2E_PORT}/</loc>`);
  expect(xml).toContain(`<loc>http://localhost:${E2E_PORT}/law-industry</loc>`);
  expect(xml).not.toContain('secret-draft');
});

test('llms.txt and the web manifest are served', async ({ request }) => {
  const llms = await request.get('/llms.txt');
  expect(llms.headers()['content-type']).toContain('text/plain');
  expect(await llms.text()).toMatch(/^# Embtel Solutions/);
  const manifest = await request.get('/manifest.webmanifest');
  expect((await manifest.json()).name).toBe('Embtel Solutions');
  expect((await request.get('/indexnow-key.txt')).status()).toBe(404); // no key configured in e2e
});

test('Open Graph images are generated per page, with a default fallback', async ({ request, page }) => {
  for (const path of ['/opengraph-image', '/law-industry/opengraph-image', '/nope/opengraph-image']) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()['content-type'], path).toBe('image/png');
    expect((await res.body()).subarray(1, 4).toString(), path).toBe('PNG');
  }
  await page.goto('/law-industry');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `http://localhost:${E2E_PORT}/law-industry/opengraph-image`);
});

test('reserved, malformed and direct /404 paths return a real 404 status', async ({ request }) => {
  for (const path of ['/api', '/authors', '/About', '/index.php', '/404']) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  for (const path of ['/robots.txt', '/sitemap.xml', '/llms.txt', '/manifest.webmanifest', '/opengraph-image']) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
});

test('unknown or hidden blog URLs return a real 404', async ({ request }) => {
  const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
  for (const path of ['/blog/does-not-exist', '/blog/secret-post', '/blog/category/nope', '/blog/tag/nope', '/authors/nope', '/blog/a/b/c']) {
    expect((await request.get(path, { headers: { 'user-agent': ua } })).status(), path).toBe(404);
  }
});
