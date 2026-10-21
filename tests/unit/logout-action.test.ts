import { describe, expect, it, vi } from 'vitest';

const clear = vi.fn(async () => {});
vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: async () => {
    throw new Error('db down');
  },
  clearSessionCookie: () => clear(),
}));
vi.mock('@/lib/audit', () => ({ audit: async () => {} }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

import { logoutAction } from '@/app/admin/dashboard/actions';

describe('logoutAction', () => {
  it('still clears the cookie and redirects when the user lookup fails', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(logoutAction()).rejects.toThrow('REDIRECT:/admin/login');
    expect(clear).toHaveBeenCalledOnce();
    expect(err).toHaveBeenCalledWith('[logout] audit skipped:', 'db down');
    err.mockRestore();
  });
});
