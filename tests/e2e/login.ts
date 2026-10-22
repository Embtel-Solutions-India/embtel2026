import fs from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { CREDS_FILE } from './creds';

type Creds = { email: string; password: string; marketing: { email: string; password: string }; cronSecret: string };
export const readCreds = (): Creds => JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));

// Signs in through the real login form (runtime-random credentials written by server.ts).
export async function signIn(page: Page, who: 'admin' | 'marketing') {
  const c = readCreds();
  const { email, password } = who === 'admin' ? c : c.marketing;
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
}
