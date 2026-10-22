// NOTE: src/proxy.ts does not protect server actions: they can be POSTed to any path.
// Every admin server action must call requireUser()/requirePermission() itself.
import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { forbidden, redirect } from 'next/navigation';
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

function hasPermission(user: UserDoc, p: Permission): boolean {
  try {
    return can(normalizeRole(user.role), p);
  } catch {
    return false; // unknown role: deny
  }
}

export async function requirePermission(p: Permission): Promise<UserDoc> {
  const user = await requireUser();
  if (!hasPermission(user, p)) throw new ForbiddenError();
  return user;
}

// For pages: renders the 403 page (forbidden.tsx) instead of throwing an error.
export async function requirePagePermission(p: Permission): Promise<UserDoc> {
  const user = await requireUser();
  if (!hasPermission(user, p)) forbidden();
  return user;
}
