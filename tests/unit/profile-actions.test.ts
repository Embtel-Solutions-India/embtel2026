import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { startMemoryMongo } from '../helpers/mongo';

let current: unknown = null;
const cookies: string[] = [];
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {} }));
vi.mock('@/lib/admin/revalidate', () => ({ refreshContent: () => {} }));
vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: async () => current,
  setSessionCookie: async (id: string) => void cookies.push(id),
}));

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const OLD = 'the-original-passphrase';

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
  const { User } = await import('@/lib/db/models/User');
  current = await User.create({ name: 'Mia', email: 'mia@example.com', password: OLD, role: 'marketing' });
});
afterAll(async () => mongo?.stop());

describe('own profile', () => {
  it('updates profile fields and ignores role/email/active in the input', async () => {
    const { updateProfileAction } = await import('@/app/admin/(panel)/profile/actions');
    const r = await updateProfileAction({ name: 'Mia M', slug: 'mia-m', bio: 'Writes.', role: 'admin', email: 'evil@example.com', active: true });
    expect(r).toMatchObject({ ok: true });
    const { User } = await import('@/lib/db/models/User');
    const u = await User.findOne({ email: 'mia@example.com' });
    expect(u).toMatchObject({ name: 'Mia M', slug: 'mia-m', bio: 'Writes.', role: 'marketing' });
  });
});

describe('password change', () => {
  it('refuses a wrong current password', async () => {
    const { changePasswordAction } = await import('@/app/admin/(panel)/profile/actions');
    const r = await changePasswordAction({ current: 'wrong-password-123', password: 'a-brand-new-passphrase', confirm: 'a-brand-new-passphrase' });
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/current password/i) });
  });

  it('changes the hash, ends other sessions and keeps this one signed in', async () => {
    const { changePasswordAction } = await import('@/app/admin/(panel)/profile/actions');
    const { User } = await import('@/lib/db/models/User');
    const beforeIat = Math.floor(Date.now() / 1000) - 5;
    const r = await changePasswordAction({ current: OLD, password: 'a-brand-new-passphrase', confirm: 'a-brand-new-passphrase' });
    expect(r).toMatchObject({ ok: true });
    const u = await User.findOne({ email: 'mia@example.com' }).select('+password');
    expect(await u!.comparePassword('a-brand-new-passphrase')).toBe(true);
    expect(u!.changedPasswordAfter(beforeIat)).toBe(true);
    expect(cookies).toEqual([String(u!._id)]);
  });
});
