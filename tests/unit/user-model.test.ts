import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectDB } from '@/lib/db/connect';
import { User } from '@/lib/db/models/User';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
beforeAll(async () => {
  mongo = await startMemoryMongo();
  await connectDB(mongo.uri);
}, 300_000);
afterAll(async () => {
  await mongo?.stop();
});

const pw = () => crypto.randomBytes(12).toString('hex');
const mail = () => `${crypto.randomBytes(6).toString('hex')}@example.com`;

describe('User model', () => {
  it('uses the legacy users collection', () => {
    expect(User.collection.name).toBe('users');
  });

  it('hashes on save with cost 12', async () => {
    const p = pw();
    const u = await User.create({ name: 'A', email: mail(), password: p, role: 'admin' });
    const row = await User.findById(u._id).select('+password');
    expect(row!.password).toMatch(/^\$2[ab]\$12\$/);
    expect(await row!.comparePassword(p)).toBe(true);
    expect(await row!.comparePassword(pw())).toBe(false);
  });

  it('verifies legacy bcryptjs hash', async () => {
    const p = pw();
    const email = mail();
    await User.collection.insertOne({
      name: 'Legacy', email, password: bcrypt.hashSync(p, 12), role: 'admin', active: true,
    });
    const row = await User.findOne({ email }).select('+password');
    expect(await row!.comparePassword(p)).toBe(true);
  });

  it('toSafeJSON omits password and reset fields', async () => {
    const u = await User.create({ name: 'B', email: mail(), password: pw(), role: 'marketing' });
    u.createPasswordResetToken();
    const json = u.toSafeJSON();
    expect(json).not.toHaveProperty('password');
    expect(json).not.toHaveProperty('passwordResetToken');
    expect(json).not.toHaveProperty('passwordResetExpires');
    expect(json).toHaveProperty('email');
  });

  it('changedPasswordAfter is true only when change is later than iat', () => {
    const u = new User({ name: 'C', email: mail(), password: pw() });
    expect(u.changedPasswordAfter(1)).toBe(false);
    u.passwordChangedAt = new Date(2_000_000 * 1000);
    expect(u.changedPasswordAfter(1_999_999)).toBe(true);
    expect(u.changedPasswordAfter(2_000_001)).toBe(false);
  });

  it('stores the reset token hashed with a 30-minute expiry', () => {
    const u = new User({ name: 'D', email: mail(), password: pw() });
    const token = u.createPasswordResetToken();
    expect(u.passwordResetToken).toBe(crypto.createHash('sha256').update(token).digest('hex'));
    expect(u.passwordResetToken).not.toBe(token);
    const ms = u.passwordResetExpires!.getTime() - Date.now();
    expect(ms).toBeGreaterThan(29 * 60_000);
    expect(ms).toBeLessThanOrEqual(30 * 60_000);
  });

  it('defaults author fields and rejects unknown roles', async () => {
    const u = new User({ name: 'E', email: mail(), password: pw() });
    expect(u.bio).toBe('');
    expect(u.sameAs).toEqual([]);
    const bad = new User({ name: 'F', email: mail(), password: pw(), role: 'editor' });
    await expect(bad.validate()).rejects.toThrow();
  });
});
