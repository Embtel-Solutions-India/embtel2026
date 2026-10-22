import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

let current: { _id: string; role: string } | null = null;
vi.mock('@/lib/auth/session', () => ({ getCurrentUser: async () => current }));

import { adminAction, UserFacingError } from '@/lib/admin/action';

const schema = z.object({ title: z.string().min(1) });

beforeEach(() => {
  current = { _id: 'u1', role: 'marketing' };
});

describe('adminAction', () => {
  it('runs for an allowed role and returns its data', async () => {
    const run = vi.fn(async (input: { title: string }) => input.title.toUpperCase());
    const act = adminAction('blog.write', schema, run);
    expect(await act({ title: 'hi' })).toEqual({ ok: true, data: 'HI' });
  });

  it('forged admin action is refused', async () => {
    const run = vi.fn(async () => 'nope');
    const act = adminAction('users.manage', schema, run);
    expect(await act({ title: 'x' })).toEqual({ ok: false, error: 'You do not have permission to do that.' });
    expect(run).not.toHaveBeenCalled();
  });

  it('refuses without a session', async () => {
    current = null;
    const run = vi.fn(async () => 'x');
    const r = await adminAction('blog.write', schema, run)({ title: 'x' });
    expect(r.ok).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it('returns field errors for invalid input', async () => {
    const run = vi.fn(async () => 'x');
    const r = await adminAction('blog.write', schema, run)({ title: '' });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.fieldErrors?.title).toBeTruthy();
    expect(run).not.toHaveBeenCalled();
  });

  it('hides unexpected errors but passes user-facing ones through', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const boom = adminAction('blog.write', schema, async () => {
      throw new Error('boom secret-input');
    });
    expect(await boom({ title: 'secret-input' })).toEqual({ ok: false, error: 'Something went wrong. Please try again.' });
    expect(JSON.stringify(err.mock.calls)).not.toContain('"title"');
    const friendly = adminAction('blog.write', schema, async () => {
      throw new UserFacingError('Slug already taken.');
    });
    expect(await friendly({ title: 'x' })).toEqual({ ok: false, error: 'Slug already taken.' });
    err.mockRestore();
  });
});
