import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('contact form: errors are announced, a valid lead is accepted', async ({ page }) => {
  await page.goto('/contact?utm_source=google&utm_campaign=e2e&gclid=test-gclid');
  const form = page.getByRole('form', { name: 'Contact form' });
  await form.getByRole('button', { name: /Send Message/ }).click();
  await expect(form.getByRole('alert')).toContainText('check the highlighted fields');
  await expect(form.getByRole('textbox', { name: 'First Name' })).toHaveAttribute('aria-invalid', 'true');

  await form.getByRole('textbox', { name: 'First Name' }).fill('Erin');
  await form.getByRole('textbox', { name: 'Last Name' }).fill('Tester');
  await form.getByRole('textbox', { name: 'Email Address' }).fill(`erin-${Date.now()}@example.com`);
  await form.getByRole('textbox', { name: 'Phone' }).fill('+1 510 555 0100');
  await form.getByRole('combobox', { name: 'Service Needed' }).selectOption('Business Automation');
  await form.getByRole('textbox', { name: 'Tell us about your project' }).fill('Automated end-to-end test lead.');
  await page.getByRole('checkbox', { name: /SMS messages from Embtel/ }).check();
  expect((await new AxeBuilder({ page }).analyze()).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  await form.getByRole('button', { name: /Send Message/ }).click();
  await expect(page.getByRole('status')).toContainText('Message Sent!');
});
