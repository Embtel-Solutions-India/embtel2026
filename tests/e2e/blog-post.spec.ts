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
