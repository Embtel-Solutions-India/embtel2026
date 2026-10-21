const freeze = (o: Record<string, readonly string[]>) =>
  Object.freeze(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Object.freeze([...v])])));

// Single CSP allow-list. Phase 5 adds third-party origins (GTM/GA/Tawk) here. Frozen: no runtime mutation.
export const CSP_SOURCES: Readonly<Record<string, readonly string[]>> = freeze({
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  // Next/React emit inline style attributes; a nonce here would disable 'unsafe-inline'.
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'blob:', 'data:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
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
