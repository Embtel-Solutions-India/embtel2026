import Link from 'next/link';
import { COMMENT_STATUSES, listComments } from '@/lib/admin/comments';
import { requirePagePermission } from '@/lib/auth/session';

const when = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'America/New_York' }) : '');

export default async function CommentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission('blog.write');
  const sp = await searchParams;
  const status = COMMENT_STATUSES.find((s) => s === sp.status);
  const page = Number(sp.page) || 1;
  const list = await listComments({ status, page });
  const href = (over: { status?: string; page?: number }) => {
    const p = new URLSearchParams();
    const s = 'status' in over ? over.status : status;
    if (s) p.set('status', s);
    if (over.page && over.page > 1) p.set('page', String(over.page));
    return `/admin/comments${p.size ? `?${p}` : ''}`;
  };
  return (
    <>
      <h1>Comments</h1>
      <p className="adm-hint" style={{ marginBottom: 16 }}>
        Comments from the old blog, kept for reference. The new site doesn’t take public comments.
      </p>
      <nav aria-label="Comment status" className="adm-tabs">
        <Link href={href({ status: undefined })} aria-current={!status ? 'page' : undefined}>
          All
        </Link>
        {COMMENT_STATUSES.map((s) => (
          <Link key={s} href={href({ status: s })} aria-current={status === s ? 'page' : undefined}>
            {s[0].toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </nav>
      {list.items.length === 0 ? (
        <p className="adm-hint">No comments.</p>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Post</th>
                <th scope="col">Name</th>
                <th scope="col">Comment</th>
                <th scope="col">Status</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((c) => (
                <tr key={c.id}>
                  <td>{c.post}</td>
                  <td>{c.name}</td>
                  <td style={{ maxWidth: 420, overflowWrap: 'anywhere' }}>{c.content}</td>
                  <td>
                    <span className="adm-badge">{c.status}</span>
                  </td>
                  <td>{when(c.createdAt)}</td>
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
