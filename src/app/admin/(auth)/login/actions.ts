'use server';

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { audit } from '@/lib/audit';
import { hitRateLimit, resetRateLimit } from '@/lib/auth/rate-limit';
import { safeRedirect } from '@/lib/auth/redirect';
import { setSessionCookie } from '@/lib/auth/session';
import { connectDB } from '@/lib/db/connect';
import { User } from '@/lib/db/models/User';

export type LoginState = { error?: string };

const GENERIC = 'Incorrect email or password.';
const LIMITED = 'Too many attempts. Please try again later.';

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
  remember: z.literal('on').nullable(),
  redirect: z.string().nullable(),
});

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
let dummyHash: Promise<string> | undefined;
const dummy = () => (dummyHash ??= bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12));

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    remember: formData.get('remember'),
    redirect: formData.get('redirect'),
  });
  if (!parsed.success) return { error: GENERIC };
  const { email, password, remember } = parsed.data;

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'unknown';

  // Per email+IP, plus a per-account cap that survives IP rotation (spoofed x-forwarded-for).
  // Both are reset on success, so effectively only failures count.
  const ipKey = `login:${email}:${ip}`;
  const accountKey = `login-account:${email}`;
  await connectDB();
  if (!(await hitRateLimit(ipKey, 10, 900)).allowed) return { error: LIMITED };
  if (!(await hitRateLimit(accountKey, 50, 900)).allowed) return { error: LIMITED };

  const user = await User.findOne({ email }).select('+password');
  const ok = user ? await user.comparePassword(password) : await bcrypt.compare(password, await dummy());
  if (!user || !ok || !user.active) return { error: GENERIC };

  await Promise.all([resetRateLimit(ipKey), resetRateLimit(accountKey)]);
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  await setSessionCookie(String(user._id), remember === 'on');
  await audit({ actorId: String(user._id), action: 'auth.login', target: { type: 'user', id: String(user._id) } });
  redirect(safeRedirect(parsed.data.redirect));
}
