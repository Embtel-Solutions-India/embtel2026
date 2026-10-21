import { expect, test } from '@playwright/test';

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
