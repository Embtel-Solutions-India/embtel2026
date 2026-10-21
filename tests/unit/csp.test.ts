import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCsp, CSP_SOURCES } from '@/lib/security/csp';

const directive = (csp: string, name: string) =>
  csp.split(';').map((d) => d.trim()).find((d) => d.split(' ')[0] === name);

afterEach(() => vi.unstubAllEnvs());

describe('buildCsp', () => {
  it('never allows unsafe-inline scripts', () => {
    for (const nonce of [undefined, 'abc123']) {
      expect(directive(buildCsp({ nonce }), 'script-src')).not.toContain("'unsafe-inline'");
    }
  });

  it('adds the nonce and strict-dynamic when given', () => {
    const s = directive(buildCsp({ nonce: 'abc123' }), 'script-src');
    expect(s).toContain("'self'");
    expect(s).toContain("'nonce-abc123'");
    expect(s).toContain("'strict-dynamic'");
    expect(directive(buildCsp({}), 'script-src')).not.toContain('nonce-');
  });

  it('locks down framing, plugins, base and forms', () => {
    const csp = buildCsp({});
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive(csp, 'object-src')).toBe("object-src 'none'");
    expect(directive(csp, 'base-uri')).toBe("base-uri 'self'");
    expect(directive(csp, 'form-action')).toBe("form-action 'self'");
  });

  it('allows unsafe-eval only outside production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(buildCsp({})).not.toContain("'unsafe-eval'");
    vi.stubEnv('NODE_ENV', 'development');
    expect(directive(buildCsp({}), 'script-src')).toContain("'unsafe-eval'");
  });

  it('sends upgrade-insecure-requests only in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(buildCsp({})).toMatch(/; upgrade-insecure-requests$/);
    vi.stubEnv('NODE_ENV', 'development');
    expect(buildCsp({})).not.toContain('upgrade-insecure-requests');
  });

  it('exposes a frozen allow-list', () => {
    expect(Object.isFrozen(CSP_SOURCES)).toBe(true);
    expect(Object.isFrozen(CSP_SOURCES['script-src'])).toBe(true);
  });
});
