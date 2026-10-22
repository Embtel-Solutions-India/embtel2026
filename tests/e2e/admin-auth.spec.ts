import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { CREDS_FILE } from './creds';

const creds = (): { email: string; password: string } =>
  JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));

async function login(page: Page, email: string, password: string) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('unauthenticated dashboard redirects to login with redirect param', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/admin\/login\?redirect=%2Fadmin%2Fdashboard$/);
});

test('wrong password shows generic error', async ({ page }) => {
  await page.goto('/admin/login');
  await login(page, creds().email, `${creds().password}x`);
  await expect(page.locator('form').getByRole('alert')).toHaveText('Incorrect email or password.');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('unknown email shows the same generic error', async ({ page }) => {
  await page.goto('/admin/login');
  await login(page, 'nobody@example.com', creds().password);
  await expect(page.locator('form').getByRole('alert')).toHaveText('Incorrect email or password.');
});

test('login with messy-case email, then logout blocks dashboard again', async ({ page }) => {
  const { password } = creds(); // seeded as admin@example.com
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/admin\/login\?redirect=/);
  await login(page, '  Admin@Example.com ', password);
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(page.getByText('E2E Admin · Admin')).toBeVisible();

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/admin\/login\?redirect=%2Fadmin%2Fdashboard$/);
});

test('/admin redirects: unauthenticated to login, authenticated to dashboard', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login\?redirect=%2Fadmin$/);
  const { email, password } = creds();
  await login(page, email, password);
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
});
