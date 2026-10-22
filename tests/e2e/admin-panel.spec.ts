import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readCreds, signIn } from './login';

const SCREENS = {
  admin: ['/admin/dashboard', '/admin/posts', '/admin/posts/new', '/admin/categories', '/admin/tags', '/admin/media', '/admin/comments', '/admin/pages', '/admin/leads', '/admin/seo', '/admin/users', '/admin/settings', '/admin/integrations', '/admin/audit', '/admin/profile'],
  marketing: ['/admin/dashboard', '/admin/posts', '/admin/posts/new', '/admin/categories', '/admin/tags', '/admin/media', '/admin/comments', '/admin/pages', '/admin/leads', '/admin/seo', '/admin/profile'],
} as const;

const serious = async (page: Page) =>
  (await new AxeBuilder({ page }).analyze()).violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);

for (const who of ['admin', 'marketing'] as const) {
  test(`${who}: every screen loads, one h1, accessible, no console errors, no sideways scroll`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await signIn(page, who);
    for (const path of SCREENS[who]) {
      await page.setViewportSize({ width: 1280, height: 900 });
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.locator('h1'), path).toHaveCount(1);
      expect(await serious(page), path).toEqual([]);
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => (window.scrollTo(1000, 0), window.scrollX)), path).toBe(0);
    }
    expect(errors).toEqual([]);
  });
}

test('marketing gets the 403 page for admin-only screens', async ({ page }) => {
  await signIn(page, 'marketing');
  for (const path of ['/admin/users', '/admin/settings']) {
    await page.goto(path);
    await expect(page.locator('h1'), path).toHaveText(/You don.t have access to this page/);
    await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);
  }
});

test('admin invites a person who sets a password and signs in', async ({ page, browser }) => {
  await signIn(page, 'admin');
  await page.goto('/admin/users');
  const email = `invitee-${Date.now()}@example.com`;
  const form = page.getByRole('form', { name: 'Invite a person' });
  await form.getByRole('textbox', { name: 'Name' }).fill('Ivy Invitee');
  await form.getByRole('textbox', { name: 'Email' }).fill(email);
  await form.getByRole('button', { name: 'Create invite link' }).click();
  const link = await page.getByRole('textbox', { name: 'Set-password link' }).inputValue();
  expect(link).toMatch(/\/admin\/reset-password\/[0-9a-f]{64}$/);
  await expect(page.getByRole('link', { name: 'Ivy Invitee' })).toBeVisible();

  const fresh = await browser.newContext();
  const p = await fresh.newPage();
  await p.goto(new URL(link).pathname);
  expect(await serious(p)).toEqual([]);
  const password = 'ivy-chose-a-long-passphrase';
  await p.getByLabel('New password').fill(password);
  await p.getByLabel('Confirm password').fill(password);
  await p.getByRole('button', { name: 'Set password' }).click();
  await expect(p.getByRole('status')).toContainText('Your password is set');
  await p.goto('/admin/login');
  await p.getByLabel('Email').fill(email);
  await p.getByLabel('Password').fill(password);
  await p.getByRole('button', { name: 'Sign in' }).click();
  await expect(p).toHaveURL(/\/admin\/dashboard$/);
  // The link is single-use.
  await p.goto(new URL(link).pathname);
  await p.getByLabel('New password').fill(password);
  await p.getByLabel('Confirm password').fill(password);
  await p.getByRole('button', { name: 'Set password' }).click();
  await expect(p.locator('form').getByRole('alert')).toContainText('invalid or has expired');
  await fresh.close();
});

test('a scheduled post goes live when the cron runs after its time', async ({ page, request }) => {
  test.setTimeout(180_000);
  await signIn(page, 'marketing');
  await page.goto('/admin/posts/new');
  const title = `Scheduled E2E ${Date.now()}`;
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill(title);
  await page.getByRole('textbox', { name: 'Short description' }).fill('Goes live by itself.');
  await page.getByRole('textbox', { name: 'Post content' }).click();
  await page.keyboard.type('Scheduled body.');
  await page.getByLabel('Schedule').check();
  // datetime-local in the browser's zone, one minute from now.
  const local = await page.evaluate(() => {
    const d = new Date(Date.now() + 60_000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  await page.getByLabel('Publish on (your local time)').fill(local);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toHaveText(/Saved/);
  const slug = await page.getByRole('textbox', { name: 'Slug', exact: true }).inputValue();

  const cron = (auth?: string) => request.get('/api/cron/publish-scheduled', auth ? { headers: { authorization: auth } } : {});
  expect((await cron()).status()).toBe(401);
  const secret = readCreds().cronSecret;
  await expect
    .poll(async () => ((await (await cron(`Bearer ${secret}`)).json()) as { published: string[] }).published.includes(slug) || (await request.get(`/blog/${slug}`)).status() === 200, {
      timeout: 120_000,
      intervals: [5_000],
    })
    .toBe(true);
  const live = await request.get(`/blog/${slug}`);
  expect(live.status()).toBe(200);
  expect(await live.text()).toContain(title);
});
