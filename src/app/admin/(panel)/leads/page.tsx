import Link from 'next/link';
import { userCan } from '@/lib/admin/action';
import { FORWARD_STATUSES, listLeads } from '@/lib/admin/leads';
import { requirePagePermission } from '@/lib/auth/session';

const when = (iso: string) => (iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' }) + ' ET' : '');
const LABEL: Record<string, string> = { sent: 'Sent', failed: 'Failed', skipped: 'Not sent', pending: 'Pending' };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePagePermission('leads.view');
  const sp = await searchParams;
  const status = FORWARD_STATUSES.find((s) => s === sp.status);
  const q = typeof sp.q === 'string' ? sp.q : '';
  const list = await listLeads({ status, q, page: Number(sp.page) || 1 });
  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, q: q || undefined, ...over })) if (v) p.set(k, String(v));
    return p.size ? `?${p}` : '';
  };
  return (
    <>
      <div className="adm-page-head">
        <h1>Leads</h1>
        {userCan(user, 'leads.export') && (
          <a className="adm-btn" href={`/admin/leads/export${qs({ page: undefined })}`}>
            Export CSV
          </a>
        )}
      </div>
      <nav aria-label="Formspree status" className="adm-tabs">
        <Link href={`/admin/leads${qs({ status: undefined, page: undefined })}`} aria-current={!status ? 'page' : undefined}>
          All ({status ? '…' : list.total})
        </Link>
        {FORWARD_STATUSES.map((s) => (
          <Link key={s} href={`/admin/leads${qs({ status: s, page: undefined })}`} aria-current={status === s ? 'page' : undefined}>
            {LABEL[s]}
          </Link>
        ))}
      </nav>
      <form className="adm-row" role="search" style={{ marginBottom: 16 }}>
        {status && <input type="hidden" name="status" value={status} />}
        <label className="adm-field" style={{ flex: '1 1 240px' }}>
          <span>Search name, email or business</span>
          <input type="search" name="q" defaultValue={q} maxLength={100} />
        </label>
        <button type="submit" className="adm-btn" style={{ alignSelf: 'flex-end' }}>
          Search
        </button>
      </form>
      {list.items.length === 0 ? (
        <p className="adm-hint">No leads yet.</p>
      ) : (
        <div className="adm-panel adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Received</th>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Service</th>
                <th scope="col">Source</th>
                <th scope="col">Formspree</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((l) => (
                <tr key={l.id}>
                  <td>{when(l.createdAt)}</td>
                  <td>
                    <Link href={`/admin/leads/${l.id}`}>{l.name}</Link>
                  </td>
                  <td>{l.email}</td>
                  <td>{l.service || '—'}</td>
                  <td>{l.utm.source ? `${l.utm.source}${l.utm.campaign ? ` / ${l.utm.campaign}` : ''}` : l.gclid ? 'Google Ads' : l.sourcePage}</td>
                  <td>
                    <span className="adm-badge" data-status={l.forwardStatus === 'sent' ? 'published' : undefined}>
                      {LABEL[l.forwardStatus] ?? l.forwardStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.pages > 1 && (
        <nav aria-label="Pages" className="adm-row" style={{ marginTop: 16 }}>
          {list.page > 1 && (
            <Link className="adm-btn" href={`/admin/leads${qs({ page: list.page - 1 })}`}>
              Previous
            </Link>
          )}
          <span className="adm-hint">
            Page {list.page} of {list.pages}
          </span>
          {list.page < list.pages && (
            <Link className="adm-btn" href={`/admin/leads${qs({ page: list.page + 1 })}`}>
              Next
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
