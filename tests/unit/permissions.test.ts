import { describe, expect, it } from 'vitest';
import { can, normalizeRole, PERMISSIONS } from '@/lib/auth/permissions';

const marketingTrue = new Set<string>([
  'blog.write', 'blog.publish', 'taxonomy.write', 'media.write', 'seo.write',
  'seo.insights', 'leads.view', 'profile.self',
]);

describe('permissions', () => {
  it.each(PERMISSIONS)('%s: admin true, marketing per matrix', (p) => {
    expect(can('admin', p)).toBe(true);
    expect(can('marketing', p)).toBe(marketingTrue.has(p));
  });

  it('matrix covers only known permissions', () => {
    for (const p of marketingTrue) expect(PERMISSIONS).toContain(p);
  });

  it('normalizes roles', () => {
    expect(normalizeRole('editor')).toBe('marketing');
    expect(normalizeRole('admin')).toBe('admin');
    expect(normalizeRole('marketing')).toBe('marketing');
    expect(() => normalizeRole('root')).toThrow(/root/);
  });
});
