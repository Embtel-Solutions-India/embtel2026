import crypto from 'node:crypto';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const rnd = (n = 24) => crypto.randomBytes(n).toString('hex');
const secret = rnd(32);
Object.assign(process.env, {
  SESSION_SECRET: secret,
  SITE_URL: 'https://example.com',
  MONGODB_URI: 'mongodb://placeholder',
  ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64'),
  AWS_S3_BUCKET: 'b',
  AWS_REGION: 'r',
  AWS_ACCESS_KEY_ID: rnd(8),
  AWS_SECRET_ACCESS_KEY: rnd(8),
});

const jar = new Map<string, string>();
const setSpy = vi.fn((name: string, value: string, opts: Record<string, unknown>) => {
  void opts;
  jar.set(name, value);
});
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (jar.has(n) ? { name: n, value: jar.get(n) } : undefined),
    set: setSpy,
    delete: (n: string) => void jar.delete(n),
  }),
}));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

import { signSessionToken, verifySessionToken } from '@/lib/auth/token';
import {
  ForbiddenError, clearSessionCookie, getCurrentUser, requirePermission, requireUser,
  setSessionCookie,
} from '@/lib/auth/session';
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
beforeEach(() => {
  jar.clear();
  setSpy.mockClear();
});

const mail = () => `${rnd(6)}@example.com`;
const mk = (role: string, extra: Record<string, unknown> = {}) =>
  User.create({ name: 'U', email: mail(), password: rnd(12), role, ...extra });
const key = () => new TextEncoder().encode(secret);

describe('token', () => {
  it('round-trips', async () => {
    const t = await signSessionToken('abc', false);
    const p = await verifySessionToken(t);
    expect(p?.sub).toBe('abc');
    expect(typeof p?.iat).toBe('number');
  });

  it('rejects tampered token', async () => {
    const t = await signSessionToken('abc', false);
    const [h, b, s] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'evil', iat: 1 })).toString('base64url');
    expect(await verifySessionToken(`${h}.${forged}.${s}`)).toBeNull();
    expect(await verifySessionToken(`${h}.${b}.${s.slice(0, -2)}xx`)).toBeNull();
    expect(await verifySessionToken('garbage')).toBeNull();
  });

  it('rejects expired token', async () => {
    const now = Math.floor(Date.now() / 1000);
    const t = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' })
      .setSubject('abc').setIssuedAt(now - 100).setExpirationTime(now - 50).sign(key());
    expect(await verifySessionToken(t)).toBeNull();
  });

  it('rejects alg none', async () => {
    const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const t = `${enc({ alg: 'none', typ: 'JWT' })}.${enc({ sub: 'abc', iat: now, exp: now + 99 })}.`;
    expect(await verifySessionToken(t)).toBeNull();
  });

  it('exp is 1 day, or 30 days when remembered', async () => {
    const claims = async (r: boolean) => {
      const t = await signSessionToken('abc', r);
      return JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString());
    };
    const a = await claims(false);
    const b = await claims(true);
    expect(a.exp - a.iat).toBe(86_400);
    expect(b.exp - b.iat).toBe(30 * 86_400);
  });
});

describe('cookie', () => {
  it('sets httpOnly lax cookie with matching maxAge, and clears', async () => {
    const u = await mk('admin');
    await setSessionCookie(String(u._id), true);
    const [name, , opts] = setSpy.mock.calls[0];
    expect(name).toBe('session');
    expect(opts).toMatchObject({
      httpOnly: true, sameSite: 'lax', path: '/', maxAge: 30 * 86_400, secure: false,
    });
    await setSessionCookie(String(u._id), false);
    expect(setSpy.mock.calls[1][2].maxAge).toBe(86_400);
    await clearSessionCookie();
    expect(jar.has('session')).toBe(false);
  });
});

describe('getCurrentUser', () => {
  it('returns user for valid session, null without cookie or with bad sub', async () => {
    expect(await getCurrentUser()).toBeNull();
    const u = await mk('admin');
    await setSessionCookie(String(u._id), false);
    expect((await getCurrentUser())?.id).toBe(u.id);
    jar.set('session', await signSessionToken('not-an-objectid', false));
    expect(await getCurrentUser()).toBeNull();
    jar.set('session', 'junk');
    expect(await getCurrentUser()).toBeNull();
  });

  it('rejects stale sessions', async () => {
    const inactive = await mk('admin', { active: false });
    await setSessionCookie(String(inactive._id), false);
    expect(await getCurrentUser()).toBeNull();

    const u = await mk('admin');
    const old = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(String(u._id))
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600).setExpirationTime('1d').sign(key());
    jar.set('session', old);
    expect((await getCurrentUser())?.id).toBe(u.id);
    u.password = rnd(12);
    await u.save();
    expect(await getCurrentUser()).toBeNull();
  });
});

describe('requireUser / requirePermission', () => {
  it('requireUser redirects to login when anonymous', async () => {
    await expect(requireUser()).rejects.toThrow('REDIRECT:/admin/login');
  });

  it('users.manage is forbidden for marketing, allowed for admin; legacy and unknown roles', async () => {
    const m = await mk('marketing');
    await setSessionCookie(String(m._id), false);
    await expect(requirePermission('users.manage')).rejects.toBeInstanceOf(ForbiddenError);
    expect((await requirePermission('blog.write')).id).toBe(m.id);

    await User.collection.updateOne({ _id: m._id }, { $set: { role: 'editor' } });
    expect((await requirePermission('blog.write')).id).toBe(m.id);

    await User.collection.updateOne({ _id: m._id }, { $set: { role: 'weird' } });
    await expect(requirePermission('blog.write')).rejects.toBeInstanceOf(ForbiddenError);

    const a = await mk('admin');
    await setSessionCookie(String(a._id), false);
    expect((await requirePermission('users.manage')).id).toBe(a.id);
  });
});
