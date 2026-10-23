import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { signIn } from './login';

const serious = async (page: Page) =>
  (await new AxeBuilder({ page }).analyze()).violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);

// Role locators: Next keeps visited pages mounted but hidden, so label locators can match twice.
test('marketing writes, publishes, edits and trashes a post', async ({ page }) => {
  await signIn(page, 'marketing');
  await page.goto('/admin/posts/new');
  expect(await serious(page)).toEqual([]);

  const title = `E2E Launch Notes ${Date.now()}`;
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill(title);
  await page.getByRole('textbox', { name: 'Short description' }).fill('Notes from an end-to-end test.');
  const editor = page.getByRole('textbox', { name: 'Post content' });
  await editor.click();
  await page.getByRole('button', { name: 'Heading 2' }).click();
  await page.keyboard.type('Why it matters');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Read the guide');
  await page.keyboard.press('Shift+Home');
  await page.getByRole('button', { name: 'Link', exact: true }).click();
  await page.getByLabel('Link URL').fill('https://web.dev/articles/lcp');
  await page.getByRole('button', { name: 'Apply link' }).click();

  await page.getByRole('button', { name: 'Add FAQ' }).click();
  await page.getByLabel('Question 1').fill('Is this a test?');
  await page.getByLabel('Answer 1').fill('Yes, an automated one.');

  await page.getByLabel('Publish now').check();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toHaveText(/Saved/);
  await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f]{24}/);
  expect(await serious(page)).toEqual([]);

  const slug = await page.getByRole('textbox', { name: 'Slug', exact: true }).inputValue();
  const pub = await page.context().newPage();
  const res = await pub.goto(`/blog/${slug}`);
  expect(res?.status()).toBe(200);
  await expect(pub.locator('h1')).toHaveText(title);
  await expect(pub.locator('#why-it-matters')).toHaveText('Why it matters');
  await expect(pub.locator('a[href="https://web.dev/articles/lcp"]')).toBeVisible();
  await expect(pub.getByText('Is this a test?')).toBeVisible();
  await pub.goto('/blog');
  await expect(pub.getByRole('link', { name: title })).toBeVisible();

  await page.getByRole('textbox', { name: 'Title', exact: true }).fill(`${title} (edited)`);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toHaveText(/Saved/);
  await pub.goto(`/blog/${slug}`);
  await expect(pub.locator('h1')).toHaveText(`${title} (edited)`);

  await page.goto('/admin/posts');
  expect(await serious(page)).toEqual([]);
  const row = page.getByRole('row', { name: new RegExp(`${title} \\(edited\\)`) });
  await row.getByRole('button', { name: 'Trash' }).click();
  await expect(row).toHaveCount(0);
  // Gone at once (not-found page, noindex); the proxy's path index turns it into a hard 404 within 30 s.
  await pub.goto(`/blog/${slug}`);
  await expect(pub.locator('h1')).toHaveText(/doesn.t exist/);
  await expect(pub.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1);

  await page.goto('/admin/posts?status=trash');
  const trashed = page.getByRole('row', { name: new RegExp(`${title} \\(edited\\)`) });
  await expect(trashed.getByRole('button', { name: 'Restore' })).toBeVisible();
  await expect(trashed.getByRole('button', { name: 'Delete permanently' })).toHaveCount(0); // admin only
});

test('the editor works at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, 'marketing');
  await page.goto('/admin/posts/new');
  await expect(page.getByRole('textbox', { name: 'Post content' })).toBeVisible();
  expect(await page.evaluate(() => (window.scrollTo(1000, 0), window.scrollX))).toBe(0);
});
