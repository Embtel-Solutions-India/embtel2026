import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/auth/token';

const PUBLIC = /^\/admin\/(login|logout|forgot-password|reset-password)(\/|$)/;

// Cheap gate: signature/expiry only. Active-user and password-change checks happen in requireUser().
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.test(pathname)) return NextResponse.next();
  const token = req.cookies.get('session')?.value;
  if (token && (await verifySessionToken(token))) return NextResponse.next();
  const login = new URL('/admin/login', req.url);
  login.searchParams.set('redirect', pathname + search);
  return NextResponse.redirect(login);
}

export const config = { matcher: ['/admin/:path*'] };
