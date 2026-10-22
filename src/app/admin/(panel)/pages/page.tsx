import Link from 'next/link';
import { listPagesAdmin } from '@/lib/admin/pages';
import { requirePagePermission } from '@/lib/auth/session';

const TYPE: Record<string, string> = { standard: 'Page', service: 'Service', industry: 'Industry', landing: 'Ad landing', legal: 'Legal' };

export default async function PagesPage() {
  await requirePagePermission('page.editContent');
  const pages = await listPagesAdmin();
  return (
    <>
      <h1>Pages</h1>
      <p className="adm-hint" style={{ marginBottom: 16 }}>
        Edit each page&apos;s title, search snippet, top section and FAQs. Locked pages (used by ads) can only be changed by an Admin.
      </p>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th scope="col">Page</th>
              <th scope="col">Address</th>
              <th scope="col">Type</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/pages/${p.id}`}>{p.title}</Link>
                  {p.locked && <span className="adm-badge" style={{ marginLeft: 8 }}>Locked</span>}
                </td>
                <td>{p.slug === 'home' ? '/' : `/${p.slug}`}</td>
                <td>{TYPE[p.type] ?? p.type}</td>
                <td>
                  <span className="adm-badge" data-status={p.status}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
