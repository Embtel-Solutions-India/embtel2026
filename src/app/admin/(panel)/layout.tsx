import '@/components/admin/admin.css';
import type { Metadata } from 'next';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { normalizeRole } from '@/lib/auth/permissions';
import { requireUser } from '@/lib/auth/session';
import { logoutAction } from './dashboard/actions';

export const metadata: Metadata = { title: 'Admin · Embtel Solutions', robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const role = normalizeRole(user.role);
  return (
    <div className="adm">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-8 focus:bg-blue focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <AdminSidebar role={role}>
        <div className="adm-user">
          <span>
            {user.name} · {role === 'admin' ? 'Admin' : 'Marketing'}
          </span>
          <form action={logoutAction}>
            <button type="submit" className="adm-btn">
              Log out
            </button>
          </form>
        </div>
      </AdminSidebar>
      <main id="main" className="adm-main">
        {children}
      </main>
    </div>
  );
}
