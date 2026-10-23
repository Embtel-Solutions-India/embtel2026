import Link from 'next/link';
import { AUDIT_AREAS, listAudit } from '@/lib/admin/audit';
import { requirePagePermission } from '@/lib/auth/session';

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission('audit.view');
  const sp = await searchParams;
  const area = AUDIT_AREAS.find((a) => a === sp.area);
  const list = await listAudit({ area, page: Number(sp.page) || 1 });
  const href = (over: { area?: string; page?: number }) => {
    const p = new URLSearchParams();
    const a = 'area' in over ? over.area : area;
    if (a) p.set('area', a);
    if (over.page && over.page > 1) p.set('page', String(over.page));
    return `/admin/audit${p.size ? `?${p}` : ''}`;
  };
  return (
    <>
      <h1>Audit log</h1>
      <nav aria-label="Area" className="adm-tabs">
        <Link href={href({ area: undefined })} aria-current={!area ? 'page' : undefined}>
          All
        </Link>
        {AUDIT_AREAS.map((a) => (
          <Link key={a} href={href({ area: a })} aria-current={area === a ? 'page' : undefined}>
            {a[0].toUpperCase() + a.slice(1)}
          </Link>
        ))}
      </nav>
      {list.items.length === 0 ? (
        <p className="adm-hint">Nothing recorded yet.</p>
      ) : (
        <div className="adm-panel adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">When (ET)</th>
                <th scope="col">Who</th>
                <th scope="col">Action</th>
                <th scope="col">Target</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((e) => (
                <tr key={e.id}>
                  <td>{e.at ? new Date(e.at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' }) : ''}</td>
                  <td>{e.actor}</td>
                  <td>
                    <code>{e.action}</code>
                  </td>
                  <td>{e.target}</td>
                  <td style={{ overflowWrap: 'anywhere' }}>{e.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.pages > 1 && (
        <nav aria-label="Pages" className="adm-row" style={{ marginTop: 16 }}>
          {list.page > 1 && (
            <Link className="adm-btn" href={href({ page: list.page - 1 })}>
              Previous
            </Link>
          )}
          <span className="adm-hint">
            Page {list.page} of {list.pages}
          </span>
          {list.page < list.pages && (
            <Link className="adm-btn" href={href({ page: list.page + 1 })}>
              Next
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
