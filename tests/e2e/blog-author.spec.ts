import { expect, test } from '@playwright/test';

test('author page shows the profile and their posts', async ({ page }) => {
  const res = await page.goto('/authors/ritu-writer');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toHaveText('Ritu Writer');
  await expect(page.getByText('Content Lead')).toBeVisible();
  await expect(page.getByText('Writes about dashboards and reporting.')).toBeVisible();
  await expect(page.locator('article h2')).toHaveCount(1);
  await expect(page.locator('article h2 a')).toHaveAttribute('href', '/blog/dashboard-guide-for-growing-businesses');
});

test('post byline links to the author page', async ({ page }) => {
  await page.goto('/blog/dashboard-guide-for-growing-businesses');
  await expect(page.locator('.bd-meta a[href="/authors/ritu-writer"]')).toHaveText('Ritu Writer');
  await expect(page.getByRole('region', { name: /About Ritu Writer/ })).toBeVisible();
});

test('an author without public posts is a real 404', async ({ request }) => {
  expect((await request.get('/authors/idle-writer')).status()).toBe(404);
});
