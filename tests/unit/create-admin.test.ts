import crypto from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAdmin } from '@/lib/auth/create-admin';
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

const pw = () => crypto.randomBytes(12).toString('hex'); // 24 chars
const mail = () => `${crypto.randomBytes(6).toString('hex')}@example.com`;

describe('createAdmin', () => {
  it('creates an admin', async () => {
    const email = mail();
    const { id } = await createAdmin({ name: 'Ada', email, password: pw() });
    const u = await User.findById(id);
    expect(u?.role).toBe('admin');
    expect(u?.email).toBe(email);
  });

  it('rejects a short password', async () => {
    await expect(
      createAdmin({ name: 'Ada', email: mail(), password: crypto.randomBytes(4).toString('hex') }),
    ).rejects.toThrow(/12/);
  });

  it('rejects a duplicate email', async () => {
    const email = mail();
    await createAdmin({ name: 'Ada', email, password: pw() });
    await expect(createAdmin({ name: 'Bob', email: email.toUpperCase(), password: pw() })).rejects.toThrow(
      /already exists/,
    );
  });
});
