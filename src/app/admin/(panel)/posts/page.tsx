import Link from 'next/link';
import { PostRowActions } from '@/components/admin/PostRowActions';
import { userCan } from '@/lib/admin/action';
import { loadDashboard } from '@/lib/admin/dashboard';
import { listAdminPosts } from '@/lib/admin/posts';
import { requirePagePermission } from '@/lib/auth/session';

type Status = 'published' | 'scheduled' | 'draft' | 'trash';
const TABS: { status?: Status; label: string; count: (c: Awaited<ReturnType<typeof loadDashboard>>['counts']) => number }[] = [
  { label: 'All', count: (c) => c.published + c.scheduled + c.draft },
  { status: 'published', label: 'Published', count: (c) => c.published },
  { status: 'scheduled', label: 'Scheduled', count: (c) => c.scheduled },
  { status: 'draft', label: 'Drafts', count: (c) => c.draft },
  { status: 'trash', label: 'Trash', count: (c) => c.trashed },
];
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'America/New_York' }) : '');

export default async function PostsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePagePermission('blog.write');
  const sp = await searchParams;
  const status = TABS.find((t) => t.status === one(sp.status))?.status;
  const q = one(sp.q) ?? '';
  const page = Number(one(sp.page)) || 1;
  const [{ counts }, list] = await Promise.all([loadDashboard(), listAdminPosts({ status, q, page })]);
  const href = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, val] of Object.entries({ status, q: q || undefined, ...over })) if (val) p.set(k, String(val));
    const s = p.toString();
    return `/admin/posts${s ? `?${s}` : ''}`;
  };

  return (
    <>
      <div className="adm-page-head">
        <h1>Posts</h1>
        <Link href="/admin/posts/new" className="adm-btn adm-btn-primary">
          New post
        </Link>
      </div>
      <nav aria-label="Post status" className="adm-tabs">
        {TABS.map((t) => (
          <Link key={t.label} href={href({ status: t.status, page: undefined })} aria-current={t.status === status ? 'page' : undefined}>
            {t.label} ({t.count(counts)})
          </Link>
        ))}
      </nav>
      <form className="adm-row" role="search" style={{ marginBottom: 16 }}>
        {status && <input type="hidden" name="status" value={status} />}
        <label className="adm-field" style={{ flex: '1 1 240px' }}>
          <span>Search titles</span>
          <input type="search" name="q" defaultValue={q} maxLength={100} />
        </label>
        <button type="submit" className="adm-btn" style={{ alignSelf: 'flex-end' }}>
          Search
        </button>
      </form>
      {list.items.length === 0 ? (
        <p className="adm-hint">No posts here.</p>
      ) : (
        <div className="adm-panel adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Status</th>
                <th scope="col">Author</th>
                <th scope="col">Category</th>
                <th scope="col">Updated</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/posts/${p.id}`}>{p.title}</Link>
                  </td>
                  <td>
                    <span className="adm-badge" data-status={p.status}>
                      {p.status}
                    </span>{' '}
                    <span className="adm-hint">{date(p.status === 'scheduled' ? p.scheduledAt : p.publishedAt)}</span>
                  </td>
                  <td>{p.author}</td>
                  <td>{p.category}</td>
                  <td>{date(p.updatedAt)}</td>
                  <td>
                    <PostRowActions id={p.id} trashed={status === 'trash'} canDelete={userCan(user, 'blog.deletePermanent')} />
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
