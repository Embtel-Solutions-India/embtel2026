export type Role = 'admin' | 'marketing';

export const PERMISSIONS = [
  'blog.write', 'blog.publish', 'blog.deletePermanent',
  'taxonomy.write', 'taxonomy.delete', 'media.write',
  'seo.write', 'seo.insights',
  'page.editContent', 'page.publish', 'page.editLocked', 'page.create', 'page.delete',
  'nav.write', 'settings.write', 'integrations.write', 'users.manage',
  'leads.view', 'leads.export', 'leads.delete',
  'audit.view', 'profile.self',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const MAP: Record<Role, ReadonlySet<Permission>> = {
  admin: new Set(PERMISSIONS),
  // page.create is drafts only; page.publish stays admin-only.
  marketing: new Set<Permission>([
    'blog.write', 'blog.publish', 'taxonomy.write', 'media.write', 'seo.write',
    'seo.insights', 'page.editContent', 'page.create', 'leads.view', 'profile.self',
  ]),
};

export function can(role: Role, permission: Permission): boolean {
  return MAP[role].has(permission);
}

export function normalizeRole(raw: string): Role {
  if (raw === 'editor') return 'marketing';
  if (raw === 'admin' || raw === 'marketing') return raw;
  throw new Error(`Unknown role: ${raw}`);
}
