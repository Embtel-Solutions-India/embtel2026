import { describe, expect, it } from 'vitest';
import { safeRedirect } from '@/lib/auth/redirect';

describe('safeRedirect', () => {
  it('keeps admin paths', () => {
    expect(safeRedirect('/admin/blogs')).toBe('/admin/blogs');
    expect(safeRedirect('/admin/blogs?page=2')).toBe('/admin/blogs?page=2');
  });

  it.each([
    null, '', 'https://evil.com', '//evil.com', '/\\evil.com', '/blog', '/admin', 'admin/blogs',
    '/admin/\\evil.com', '/admin/../blog', '/admin/%2E%2E/blog', '/admin/x/..','/admin/x\nLocation: https://evil.com',
  ])('%j falls back to dashboard', (t) => {
    expect(safeRedirect(t)).toBe('/admin/dashboard');
  });

  it('uses the given fallback', () => {
    expect(safeRedirect('//evil.com', '/admin/x')).toBe('/admin/x');
  });
});
