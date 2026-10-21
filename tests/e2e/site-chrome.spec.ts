import { expect, test } from '@playwright/test';

test.describe('desktop header', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('Services dropdown opens and closes with the keyboard', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Services menu' });
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const first = page.getByRole('link', { name: /Web Development/ }).first();
    await expect(first).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(first).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
  });

  test('a service child page marks Services as the active section', async ({ page }) => {
    await page.goto('/dental-automation');
    await expect(page.getByRole('banner').getByRole('link', { name: 'Services', exact: true })).toHaveAttribute(
      'data-active',
      'true',
    );
  });

  test('header CTA points to the booking widget', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner').getByRole('link', { name: 'Get Started' })).toHaveAttribute(
      'href',
      /^https:\/\/api\.leadconnectorhq\.com\/widget\/booking\//,
    );
  });
});

test.describe('mobile header', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('hamburger opens the menu and navigation closes it', async ({ page }) => {
    await page.goto('/');
    const burger = page.getByRole('button', { name: 'Menu' });
    await expect(burger).toHaveAttribute('aria-expanded', 'false');
    await burger.click();
    await expect(burger).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('dialog', { name: 'Site menu' }).getByRole('link', { name: 'About', exact: true }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
  });

  test('Escape closes the mobile menu', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
  });
});

test('footer legal links are real anchors', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy-policy');
  await expect(footer.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms-of-service');
  await expect(footer.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('rel', /noopener/);
});

test('floating WhatsApp link uses the business number', async ({ page }) => {
  await page.goto('/');
  const wa = page.getByRole('link', { name: 'Chat on WhatsApp' });
  await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/15109627900\?text=/);
  await expect(wa).toHaveAttribute('target', '_blank');
});

test('skip link moves focus to the main content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
});
