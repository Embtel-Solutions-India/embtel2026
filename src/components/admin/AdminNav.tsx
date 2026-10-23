'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { can, type Permission, type Role } from '@/lib/auth/permissions';
import { AdminIcon, type IconName } from './AdminIcon';

type Item = { href: string; label: string; icon: IconName; needs?: Permission };
const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Content',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { href: '/admin/posts', label: 'Posts', icon: 'posts', needs: 'blog.write' },
      { href: '/admin/pages', label: 'Pages', icon: 'pages', needs: 'page.editContent' },
      { href: '/admin/media', label: 'Media', icon: 'media', needs: 'media.write' },
      { href: '/admin/categories', label: 'Categories', icon: 'folder', needs: 'taxonomy.write' },
      { href: '/admin/tags', label: 'Tags', icon: 'tag', needs: 'taxonomy.write' },
    ],
  },
  {
    title: 'Growth',
    items: [
      { href: '/admin/leads', label: 'Leads', icon: 'leads', needs: 'leads.view' },
      { href: '/admin/seo', label: 'SEO insights', icon: 'seo', needs: 'seo.insights' },
      { href: '/admin/comments', label: 'Comments', icon: 'comment', needs: 'blog.write' },
    ],
  },
  {
    title: 'Manage',
    items: [
      { href: '/admin/users', label: 'Users', icon: 'users', needs: 'users.manage' },
      { href: '/admin/settings', label: 'Settings', icon: 'settings', needs: 'settings.write' },
      { href: '/admin/integrations', label: 'Integrations', icon: 'plug', needs: 'integrations.write' },
      { href: '/admin/audit', label: 'Audit log', icon: 'audit', needs: 'audit.view' },
      { href: '/admin/profile', label: 'Profile', icon: 'profile', needs: 'profile.self' },
    ],
  },
];

// Cosmetic only: every action and page checks permissions on the server.
export function AdminNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <>
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => !i.needs || can(role, i.needs));
        if (!items.length) return null;
        return (
          <div key={g.title} className="adm-nav-group">
            <p className="adm-nav-title" id={`nav-${g.title}`}>
              {g.title}
            </p>
            <ul className="adm-nav" aria-labelledby={`nav-${g.title}`}>
              {items.map((i) => {
                const current = path === i.href || path.startsWith(`${i.href}/`);
                return (
                  <li key={i.href}>
                    <Link href={i.href} aria-current={current ? 'page' : undefined} onClick={onNavigate}>
                      <AdminIcon name={i.icon} />
                      <span>{i.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </>
  );
}
