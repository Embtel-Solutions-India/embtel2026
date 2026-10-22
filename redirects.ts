import type { Redirect } from 'next/dist/lib/load-custom-routes';

// Every URL form the legacy static site (embtel-final/) answered, mapped to its new home with one 301 hop.
// Applied by next.config before the proxy, so these never reach the CMS 404 check. Order matters: specific first.
// Query strings are passed through by Next (e.g. /blog-details?slug=x → /blog/x?slug=x); the target ignores them.
const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';

export const legacyRedirects: Redirect[] = [
  // Old blog post URLs: blog-details(.html)?slug=<post>
  { source: '/blog-details', has: [{ type: 'query', key: 'slug', value: `(?<slug>${SLUG})` }], destination: '/blog/:slug', statusCode: 301 },
  { source: '/blog-details.html', has: [{ type: 'query', key: 'slug', value: `(?<slug>${SLUG})` }], destination: '/blog/:slug', statusCode: 301 },
  { source: '/blog-details', destination: '/blog', statusCode: 301 },
  { source: '/blog-details.html', destination: '/blog', statusCode: 301 },
  { source: '/index.html', destination: '/', statusCode: 301 },
  // /about.html → /about (any legacy page; unknown targets still 404 at their clean URL).
  { source: `/:page(${SLUG})\\.html`, destination: '/:page', statusCode: 301 },
  // Retired /da-ai section (legacy host rewrote it to the home page).
  { source: '/da-ai', destination: '/', statusCode: 301 },
  { source: '/da-ai/:path*', destination: '/', statusCode: 301 },
];
