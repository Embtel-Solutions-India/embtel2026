const freeze = (o: Record<string, readonly string[]>) =>
  Object.freeze(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Object.freeze([...v])])));

// Single CSP allow-list. Frozen: no runtime mutation.
// With 'strict-dynamic', CSP3 browsers ignore host allow-lists in script-src, so third-party
// scripts (GTM, GA, Tawk) must be loaded via nonce'd next/script. Only img-src/connect-src/
// frame-src hosts belong here.
export const CSP_SOURCES: Readonly<Record<string, readonly string[]>> = freeze({
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  // Next/React emit inline style attributes; a nonce here would disable 'unsafe-inline'.
  'style-src': ["'self'", "'unsafe-inline'"],
  // Google Ads tag + Elfsight reviews (scripts themselves load via nonce; these are their data/frame hosts).
  'img-src': ["'self'", 'blob:', 'data:', 'https://www.googletagmanager.com', 'https://www.google.com', 'https://*.google.com', 'https://*.doubleclick.net', 'https://*.elfsightcdn.com', 'https://lh3.googleusercontent.com'],
  'font-src': ["'self'"],
  'connect-src': ["'self'", 'https://www.google.com', 'https://*.google.com', 'https://www.googletagmanager.com', 'https://*.doubleclick.net', 'https://*.elfsight.com', 'https://*.elfsightcdn.com'],
  'frame-src': ['https://*.elfsight.com', 'https://www.googletagmanager.com'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
});

export function buildCsp({ nonce }: { nonce?: string } = {}): string {
  const prod = process.env.NODE_ENV === 'production';
  const script = [...CSP_SOURCES['script-src']];
  if (nonce) script.push(`'nonce-${nonce}'`, "'strict-dynamic'");
  // React dev tooling needs eval; never in production.
  if (!prod) script.push("'unsafe-eval'");
  const directives = Object.entries({ ...CSP_SOURCES, 'script-src': script }).map(
    ([k, v]) => `${k} ${v.join(' ')}`,
  );
  if (prod) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}
