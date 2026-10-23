import Link from 'next/link';
import { InviteDialog } from '@/components/admin/InviteDialog';
import { listUsers } from '@/lib/admin/users';
import { requirePagePermission } from '@/lib/auth/session';

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'America/New_York' }) : 'Never');

export default async function UsersPage() {
  await requirePagePermission('users.manage');
  const users = await listUsers();
  return (
    <>
      <div className="adm-page-head">
        <h1>Users</h1>
        <InviteDialog />
      </div>
      <div className="adm-stack">
        <div className="adm-panel adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link href={`/admin/users/${u.id}`}>{u.name}</Link>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.role === 'admin' ? 'Admin' : 'Marketing'}</td>
                  <td>
                    <span className="adm-badge" data-status={u.active ? 'published' : undefined}>
                      {u.active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td>{when(u.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
