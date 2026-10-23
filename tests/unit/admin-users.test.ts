import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

let current: unknown = null;
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {} }));
vi.mock('@/lib/admin/revalidate', () => ({ refreshContent: () => {} }));
vi.mock('@/lib/auth/session', () => ({ getCurrentUser: async () => current }));

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
type U = import('@/lib/db/models/User').UserDoc;
let boss: U;
const svc = () => import('@/lib/admin/users');
const pw = () => new mongoose.Types.ObjectId().toHexString() + 'Aa1!';
const tokenOf = (path: string) => path.split('/').pop()!;

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
  const { User } = await import('@/lib/db/models/User');
  boss = await User.create({ name: 'Boss Admin', email: 'boss@example.com', password: pw(), role: 'admin' });
});
afterAll(async () => mongo?.stop());

describe('inviteUser', () => {
  it('creates the user and a 72 h set-password link that works once', async () => {
    const { inviteUser } = await svc();
    const { resetPasswordWithToken } = await import('@/lib/auth/reset');
    const { id, path } = await inviteUser({ name: 'New Writer', email: 'New@Example.com', role: 'marketing' }, boss);
    expect(path).toMatch(/^\/admin\/reset-password\/[0-9a-f]{64}$/);
    const { User } = await import('@/lib/db/models/User');
    const u = await User.findById(id).select('+passwordResetExpires');
    expect(u?.email).toBe('new@example.com');
    expect(u!.passwordResetExpires!.getTime() - Date.now()).toBeGreaterThan(71 * 3600_000);

    const password = 'a-long-chosen-passphrase';
    expect(await resetPasswordWithToken({ token: tokenOf(path), password, confirm: password }, '1.1.1.1')).toEqual({ ok: true });
    const after = await User.findById(id).select('+password');
    expect(await after!.comparePassword(password)).toBe(true);
    expect(await resetPasswordWithToken({ token: tokenOf(path), password, confirm: password }, '1.1.1.1')).toMatchObject({ ok: false });
  });

  it('reports a duplicate email in words', async () => {
    const { inviteUser } = await svc();
    await expect(inviteUser({ name: 'Dup', email: 'boss@example.com', role: 'marketing' }, boss)).rejects.toThrow(/already has an account/);
  });

  it('never writes the token or link to the audit log', async () => {
    const { inviteUser, issuePasswordLink } = await svc();
    const { id, path } = await inviteUser({ name: 'Audited', email: 'audited@example.com', role: 'marketing' }, boss);
    const again = await issuePasswordLink(id, boss);
    const logs = JSON.stringify(await mongoose.connection.db!.collection('auditlogs').find().toArray());
    expect(logs).not.toContain(tokenOf(path));
    expect(logs).not.toContain(tokenOf(again.path));
  });
});

describe('reset tokens', () => {
  it('expired, wrong and mismatched inputs are refused with one generic message', async () => {
    const { inviteUser, issuePasswordLink } = await svc();
    const { resetPasswordWithToken } = await import('@/lib/auth/reset');
    const { id } = await inviteUser({ name: 'Late', email: 'late@example.com', role: 'marketing' }, boss);
    const { path } = await issuePasswordLink(id, boss);
    const { User } = await import('@/lib/db/models/User');
    await User.updateOne({ _id: id }, { $set: { passwordResetExpires: new Date(Date.now() - 1000) } });
    const good = 'a-long-chosen-passphrase';
    const expired = await resetPasswordWithToken({ token: tokenOf(path), password: good, confirm: good }, '2.2.2.2');
    const unknown = await resetPasswordWithToken({ token: 'f'.repeat(64), password: good, confirm: good }, '2.2.2.2');
    expect(expired).toEqual(unknown);
    expect(expired).toMatchObject({ ok: false, error: 'This link is invalid or has expired. Request a new one from “Forgot password?” on the sign-in page, or ask an Admin.' });
    expect(await resetPasswordWithToken({ token: 'f'.repeat(64), password: 'short', confirm: 'short' }, '2.2.2.2')).toMatchObject({ ok: false, error: expect.stringMatching(/12/) });
    expect(await resetPasswordWithToken({ token: 'f'.repeat(64), password: good, confirm: `${good}x` }, '2.2.2.2')).toMatchObject({ ok: false, error: expect.stringMatching(/match/) });
  });

  it('rate-limits attempts per IP', async () => {
    const { resetPasswordWithToken } = await import('@/lib/auth/reset');
    const good = 'a-long-chosen-passphrase';
    let last: unknown;
    for (let i = 0; i < 11; i++) last = await resetPasswordWithToken({ token: 'e'.repeat(64), password: good, confirm: good }, '9.9.9.9');
    expect(last).toMatchObject({ ok: false, error: expect.stringMatching(/Too many/) });
  });
});

describe('updateUser', () => {
  it('last admin is protected and admins cannot demote or deactivate themselves', async () => {
    const { updateUser } = await svc();
    await expect(updateUser({ id: String(boss._id), name: 'Boss Admin', role: 'marketing', active: true }, boss)).rejects.toThrow(/your own admin access/);
    await expect(updateUser({ id: String(boss._id), name: 'Boss Admin', role: 'admin', active: false }, boss)).rejects.toThrow(/your own admin access/);

    const { User } = await import('@/lib/db/models/User');
    const second = await User.create({ name: 'Second Admin', email: 'second@example.com', password: pw(), role: 'admin' });
    await updateUser({ id: String(boss._id), name: 'Boss Admin', role: 'marketing', active: true }, second);
    await expect(updateUser({ id: String(second._id), name: 'Second Admin', role: 'marketing', active: true }, second)).rejects.toThrow(/own admin access/);
    await User.updateOne({ _id: boss._id }, { $set: { role: 'admin' } });
  });

  it('updates author profile fields and enforces a unique slug', async () => {
    const { inviteUser, updateUser } = await svc();
    const a = await inviteUser({ name: 'Author A', email: 'a@example.com', role: 'marketing' }, boss);
    const b = await inviteUser({ name: 'Author B', email: 'b@example.com', role: 'marketing' }, boss);
    await updateUser({ id: a.id, name: 'Author A', role: 'marketing', active: true, slug: 'author-a', bio: 'Writes.', sameAs: ['https://www.linkedin.com/in/a'] }, boss);
    await expect(updateUser({ id: b.id, name: 'Author B', role: 'marketing', active: true, slug: 'author-a' }, boss)).rejects.toThrow(/slug/);
  });

  it('marketing cannot invite', async () => {
    const { inviteUserAction } = await import('@/app/admin/(panel)/users/actions');
    current = { _id: new mongoose.Types.ObjectId(), role: 'marketing' };
    expect(await inviteUserAction({ name: 'X', email: 'x@example.com', role: 'admin' })).toMatchObject({ ok: false, error: 'You do not have permission to do that.' });
    const { User } = await import('@/lib/db/models/User');
    expect(await User.findOne({ email: 'x@example.com' })).toBeNull();
  });
});
