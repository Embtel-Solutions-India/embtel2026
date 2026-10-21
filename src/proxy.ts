import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/auth/token';
import { buildCsp } from '@/lib/security/csp';

const ADMIN = /^\/admin(\/|$)/;
const PUBLIC = /^\/admin\/(login|forgot-password|reset-password)(\/|$)/;

// Per-request nonce CSP. Next reads the nonce from the request's CSP header and stamps its own
// scripts; server components read it via headers().get('x-nonce').
function withCsp(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp({ nonce });
  const headers = new Headers(req.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set('Content-Security-Policy', csp);
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (!ADMIN.test(pathname) || PUBLIC.test(pathname)) return withCsp(req);
  // Cheap gate: signature/expiry only. Active-user and password-change checks happen in requireUser().
  const token = req.cookies.get('session')?.value;
  if (token && (await verifySessionToken(token))) return withCsp(req);
  const login = new URL('/admin/login', req.url);
  login.searchParams.set('redirect', pathname + search);
  return NextResponse.redirect(login);
}

// Everything except build assets, the image optimizer, favicon and image files — but every
// /admin path, image-like or not, always runs the auth gate.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpe?g|gif|webp|avif|svg|ico)$).*)',
    '/admin/:path*',
  ],
};
