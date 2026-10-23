import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/auth/token';
import { RESERVED_SLUGS } from '@/lib/content/blocks';
import { isKnownPath } from '@/lib/content/page-index';
import { parsePage } from '@/lib/content/pagination';
import { buildCsp } from '@/lib/security/csp';

const ADMIN = /^\/admin(\/|$)/;
const PUBLIC = /^\/admin\/(login|forgot-password|reset-password)(\/|$)/;

// Per-request nonce CSP. Next reads the nonce from the request's CSP header and stamps its own
// scripts; server components read it via headers().get('x-nonce').
function withCsp(req: NextRequest, notFound = false) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp({ nonce });
  const headers = new Headers(req.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const res = notFound
    ? NextResponse.rewrite(new URL('/404', req.url), { status: 404, request: { headers } })
    : NextResponse.next({ request: { headers } });
  res.headers.set('Content-Security-Policy', csp);
  return res;
}

// Single-segment paths that are real app routes (not CMS pages).
const APP_ROUTES = new Set(['robots.txt', 'sitemap.xml', 'llms.txt', 'manifest.webmanifest', 'indexnow-key.txt', 'opengraph-image', 'blog', 'feed.xml']);
// Multi-segment CMS sections: every path under these must be in the index.
const CMS_SECTION = /^\/(blog|authors)\//;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Single-segment paths must be a published page and paths under /blog/ or /authors/ must be public
// content; anything else gets a real HTTP 404 here, because once a dynamic page streams Next can
// only answer 200 + noindex. OG image routes handle unknown slugs themselves.
async function isUnknownPage(pathname: string, search: URLSearchParams): Promise<boolean> {
  if (pathname.endsWith('/opengraph-image')) return false;
  // Listing pages: ?page must be absent or 1–999 (a page past the end renders an empty noindex page).
  if ((pathname === '/blog' || CMS_SECTION.test(pathname)) && search.has('page')) {
    const pages = search.getAll('page');
    if (parsePage(pages.length > 1 ? pages : pages[0]) === null) return true;
  }
  const seg = /^\/([^/]+)$/.exec(pathname)?.[1];
  if (seg) {
    if (APP_ROUTES.has(seg)) return false;
    if (seg === '404' || seg === 'home' || !SLUG.test(seg) || RESERVED_SLUGS.includes(seg)) return true; // home lives at `/`
  } else if (!CMS_SECTION.test(pathname)) {
    return false; // `/`, assets and other app routes
  }
  try {
    return !(await isKnownPath(pathname));
  } catch {
    console.error('[proxy] page index unavailable; rendering normally');
    return false; // fail open: the page itself still 404s (200 + noindex) if missing
  }
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (!ADMIN.test(pathname)) return withCsp(req, await isUnknownPage(pathname, req.nextUrl.searchParams));
  if (PUBLIC.test(pathname)) return withCsp(req);
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
