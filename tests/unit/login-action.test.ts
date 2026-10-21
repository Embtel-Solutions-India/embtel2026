import crypto from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const rnd = (n = 24) => crypto.randomBytes(n).toString('hex');
Object.assign(process.env, {
  SESSION_SECRET: rnd(32),
  SITE_URL: 'https://example.com',
  MONGODB_URI: 'mongodb://placeholder',
  ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64'),
  AWS_S3_BUCKET: 'b',
  AWS_REGION: 'r',
  AWS_ACCESS_KEY_ID: rnd(8),
  AWS_SECRET_ACCESS_KEY: rnd(8),
});

let ip = '1.1.1.1';
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ set: () => {}, get: () => undefined, delete: () => {} }),
  headers: async () => new Headers({ 'x-forwarded-for': `${ip}, 10.0.0.1` }),
}));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

import { loginAction } from '@/app/admin/(auth)/login/actions';
import { connectDB } from '@/lib/db/connect';
import { User } from '@/lib/db/models/User';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
beforeAll(async () => {
  mongo = await startMemoryMongo();
  process.env.MONGODB_URI = mongo.uri;
  await connectDB(mongo.uri);
}, 300_000);
afterAll(async () => {
  await mongo?.stop();
});

const LIMITED = 'Too many attempts. Please try again later.';
const GENERIC = 'Incorrect email or password.';

async function account() {
  const email = `${rnd(6)}@example.com`;
  const password = rnd(12);
  await User.create({ name: 'U', email, password, role: 'admin' });
  const attempt = (pw: string) => {
    const fd = new FormData();
    fd.set('email', email);
    fd.set('password', pw);
    return loginAction({}, fd).catch((e: Error) => ({ error: e.message }));
  };
  return { ok: () => attempt(password), bad: () => attempt(`${password}x`) };
}

describe('loginAction rate limits', () => {
  it('success resets the email+IP counter: 9 fail, 1 ok, 9 fail all allowed; then blocks', async () => {
    ip = '2.2.2.2';
    const a = await account();
    for (let i = 0; i < 9; i++) expect(await a.bad()).toEqual({ error: GENERIC });
    expect(await a.ok()).toEqual({ error: 'REDIRECT:/admin/dashboard' });
    for (let i = 0; i < 9; i++) expect(await a.bad()).toEqual({ error: GENERIC });
    expect(await a.bad()).toEqual({ error: GENERIC }); // 10th failure in window
    expect(await a.ok()).toEqual({ error: LIMITED }); // 11th attempt blocked, even with right password
  }, 120_000);

  it('per-account limit holds across rotating IPs', async () => {
    const a = await account();
    for (let i = 0; i < 50; i++) {
      ip = `9.9.${i}.1`;
      expect(await a.bad()).toEqual({ error: GENERIC });
    }
    ip = '9.9.200.1';
    expect(await a.ok()).toEqual({ error: LIMITED });
  }, 120_000);
});
