// Single CSP allow-list. Phase 5 adds third-party origins (GTM/GA/Tawk) here.
export const CSP_SOURCES: Record<string, string[]> = {
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
};

export function buildCsp({ nonce }: { nonce?: string } = {}): string {
  const script = [...CSP_SOURCES['script-src']];
  if (nonce) script.push(`'nonce-${nonce}'`, "'strict-dynamic'");
  // React dev tooling needs eval; never in production.
  if (process.env.NODE_ENV !== 'production') script.push("'unsafe-eval'");
  return Object.entries({ ...CSP_SOURCES, 'script-src': script })
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ');
}
