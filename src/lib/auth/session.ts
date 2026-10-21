import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isValidObjectId } from 'mongoose';
import { env } from '@/lib/env';
import { connectDB } from '@/lib/db/connect';
import { User, type UserDoc } from '@/lib/db/models/User';
import { can, normalizeRole, type Permission } from './permissions';
import { sessionMaxAge, signSessionToken, verifySessionToken } from './token';

const COOKIE = 'session';

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export async function setSessionCookie(userId: string, remember: boolean): Promise<void> {
  const token = await signSessionToken(userId, remember);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: sessionMaxAge(remember),
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

// Memoized per server request (React cache), so layout + page share one DB lookup.
export const getCurrentUser = cache(async (): Promise<UserDoc | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const claims = await verifySessionToken(token);
  if (!claims || !isValidObjectId(claims.sub)) return null;
  await connectDB();
  const user = await User.findById(claims.sub);
  if (!user || !user.active || user.changedPasswordAfter(claims.iat)) return null;
  return user;
});

export async function requireUser(): Promise<UserDoc> {
  const user = await getCurrentUser();
  if (!user) redirect('/admin/login');
  return user;
}

export async function requirePermission(p: Permission): Promise<UserDoc> {
  const user = await requireUser();
  let allowed = false;
  try {
    allowed = can(normalizeRole(user.role), p);
  } catch {
    // unknown role: deny
  }
  if (!allowed) throw new ForbiddenError();
  return user;
}
