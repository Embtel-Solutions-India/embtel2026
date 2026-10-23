'use server';

import { headers } from 'next/headers';
import { resetPasswordWithToken } from '@/lib/auth/reset';

// Public (no session): the token is the credential. Rate-limited per IP inside resetPasswordWithToken.
export async function setPasswordAction(input: { token: string; password: string; confirm: string }) {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
  return resetPasswordWithToken({ token: String(input?.token ?? ''), password: String(input?.password ?? ''), confirm: String(input?.confirm ?? '') }, ip);
}
