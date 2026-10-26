// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PasswordInput } from '@/components/admin/PasswordInput';

it('toggles the password between hidden and shown', () => {
  render(<PasswordInput name="password" aria-label="Password" />);
  const input = screen.getByLabelText('Password');
  expect(input).toHaveProperty('type', 'password');
  fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
  expect(input).toHaveProperty('type', 'text');
  fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
  expect(input).toHaveProperty('type', 'password');
});
