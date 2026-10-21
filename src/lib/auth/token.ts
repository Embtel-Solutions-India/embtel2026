import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/lib/env';

const DAY = 86_400;
const AUDIENCE = 'embtel-admin-session';
export const sessionMaxAge = (remember: boolean) => (remember ? 30 : 1) * DAY;

const key = () => new TextEncoder().encode(env.SESSION_SECRET);

export function signSessionToken(userId: string, remember: boolean): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${sessionMaxAge(remember)}s`)
    .sign(key());
}

export async function verifySessionToken(
  token: string,
): Promise<{ sub: string; iat: number } | null> {
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ['HS256'],
      audience: AUDIENCE,
      requiredClaims: ['exp', 'iat', 'sub'],
    });
    if (!payload.sub || typeof payload.iat !== 'number') return null;
    return { sub: payload.sub, iat: payload.iat };
  } catch {
    return null;
  }
}
