'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { can, type Permission, type Role } from '@/lib/auth/permissions';

const ITEMS: { href: string; label: string; needs?: Permission }[] = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/posts', label: 'Posts', needs: 'blog.write' },
  { href: '/admin/categories', label: 'Categories', needs: 'taxonomy.write' },
  { href: '/admin/tags', label: 'Tags', needs: 'taxonomy.write' },
  { href: '/admin/media', label: 'Media', needs: 'media.write' },
  { href: '/admin/comments', label: 'Comments', needs: 'blog.write' },
  { href: '/admin/users', label: 'Users', needs: 'users.manage' },
  { href: '/admin/settings', label: 'Settings', needs: 'settings.write' },
  { href: '/admin/profile', label: 'Profile', needs: 'profile.self' },
];

// Cosmetic only: every action and page checks permissions on the server.
export function AdminNav({ role }: { role: Role }) {
  const path = usePathname();
  return (
    <ul className="adm-nav">
      {ITEMS.filter((i) => !i.needs || can(role, i.needs)).map((i) => {
        const current = path === i.href || path.startsWith(`${i.href}/`);
        return (
          <li key={i.href}>
            <Link href={i.href} aria-current={current ? 'page' : undefined}>
              {i.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
