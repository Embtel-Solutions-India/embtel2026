import '@/components/admin/admin.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminIcon } from '@/components/admin/AdminIcon';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { can, normalizeRole } from '@/lib/auth/permissions';
import { requireUser } from '@/lib/auth/session';
import { logoutAction } from './dashboard/actions';

export const metadata: Metadata = { title: 'Admin · Embtel Solutions', robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const role = normalizeRole(user.role);
  const initials = user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="adm">
      <a href="#main" className="adm-skip">
        Skip to content
      </a>
      <AdminSidebar
        role={role}
        footer={
          <div className="adm-me">
            <span className="adm-avatar" aria-hidden="true">
              {initials}
            </span>
            <span className="adm-me-text">
              <strong>{user.name}</strong>
              <span>{role === 'admin' ? 'Admin' : 'Marketing'}</span>
            </span>
            <form action={logoutAction}>
              <button type="submit" className="adm-icon-btn" title="Log out">
                <AdminIcon name="logout" />
                <span className="sr-only">Log out</span>
              </button>
            </form>
          </div>
        }
      />
      <div className="adm-body">
        <header className="adm-top">
          <span className="adm-top-brand">Embtel Admin</span>
          <div className="adm-top-actions">
            <Link href="/" className="adm-btn adm-btn-ghost" target="_blank">
              <AdminIcon name="external" size={16} />
              View site
            </Link>
            {can(role, 'blog.write') && (
              <Link href="/admin/posts/new" className="adm-btn adm-btn-primary">
                <AdminIcon name="plus" size={16} />
                New post
              </Link>
            )}
          </div>
        </header>
        <main id="main" className="adm-main">
          {children}
        </main>
      </div>
    </div>
  );
}
