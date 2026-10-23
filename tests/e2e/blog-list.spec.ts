import { readdirSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const POSTS = readdirSync('content/blog/posts')
  .map((f) => JSON.parse(readFileSync(`content/blog/posts/${f}`, 'utf8')) as { slug: string; title: string; publishedAt: string })
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

test('/blog lists the 6 legacy posts newest first, with one h1 and image alts', async ({ page }) => {
  const res = await page.goto('/blog');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('Ideas on growth, automation & tech.');
  // Admin specs running in parallel publish their own "E2E" posts; ignore those.
  const titles = (await page.locator('article h2').allTextContents()).filter((t) => !t.includes('E2E'));
  expect(titles).toEqual(POSTS.map((p) => p.title));
  await expect(page.getByText('Secret Post')).toHaveCount(0);
  for (const img of await page.locator('article img').all()) expect(await img.getAttribute('alt')).toBeTruthy();
});

test('search finds the dashboard post and is noindex', async ({ page }) => {
  await page.goto('/blog');
  await page.getByLabel('Search articles').fill('dashboard');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page).toHaveURL(/\/blog\?q=dashboard/);
  await expect(page.locator('article h2').first()).toContainText(/dashboard/i);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('hostile search input is harmless', async ({ request }) => {
  for (const q of ['.*', '{"$where":"1"}', 'a'.repeat(1000)]) {
    expect((await request.get(`/blog?q=${encodeURIComponent(q)}`)).status(), q.slice(0, 20)).toBe(200);
  }
});

test('category page lists only its posts', async ({ page }) => {
  await page.goto('/blog/category/cybersecurity');
  await expect(page.locator('h1')).toHaveText('Cybersecurity');
  await expect(page.locator('article h2')).toHaveText([POSTS.find((p) => p.slug === 'cybersecurity-basics-every-small-business-needs')!.title]);
});

test('tag page and category chips link correctly', async ({ page }) => {
  await page.goto('/blog');
  await page.getByRole('navigation', { name: 'Categories' }).getByRole('link', { name: /Automation/ }).click();
  await expect(page).toHaveURL(/\/blog\/category\/automation$/);
  const res = await page.goto('/blog/tag/smb');
  expect(res?.status()).toBe(200);
  await expect(page.locator('article')).toHaveCount(2);
});

test('invalid ?page is a real 404; out-of-range page is an empty noindex page', async ({ request, page }) => {
  for (const q of ['abc', '0', '2.5']) expect((await request.get(`/blog?page=${q}`)).status(), q).toBe(404);
  await page.goto('/blog?page=99');
  await expect(page.getByText('No articles found')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('RSS is discoverable and served; sitemap includes the blog', async ({ page, request }) => {
  await page.goto('/blog');
  await expect(page.locator('head link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute('href', '/feed.xml');
  const feed = await request.get('/feed.xml');
  expect(feed.headers()['content-type']).toBe('application/rss+xml; charset=utf-8');
  // Every imported post is in the feed and the draft is not (admin specs may publish extra posts concurrently).
  const xml = await feed.text();
  for (const p of POSTS) expect(xml).toContain(`/blog/${p.slug}</link>`);
  expect(xml).not.toContain('secret-post');
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/blog/website-speed-costing-you-customers</loc>');
  expect(sitemap).not.toContain('secret-post');
});
