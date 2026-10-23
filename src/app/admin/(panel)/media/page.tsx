import Link from 'next/link';
import { MediaLibrary } from '@/components/admin/MediaLibrary';
import { requirePagePermission } from '@/lib/auth/session';
import { listMedia } from '@/lib/media/upload';

export default async function MediaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePagePermission('media.write');
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : '';
  const page = Number(sp.page) || 1;
  const list = await listMedia({ q, page });
  const href = (p: number) => `/admin/media?${new URLSearchParams({ ...(q && { q }), page: String(p) })}`;
  return (
    <>
      <h1>Media</h1>
      <form className="adm-row" role="search" style={{ marginBottom: 16 }}>
        <label className="adm-field" style={{ flex: '1 1 240px' }}>
          <span>Search by name</span>
          <input type="search" name="q" defaultValue={q} maxLength={100} />
        </label>
        <button type="submit" className="adm-btn" style={{ alignSelf: 'flex-end' }}>
          Search
        </button>
      </form>
      <MediaLibrary items={list.items} userId={String(user._id)} isAdmin={user.role === 'admin'} />
      {list.pages > 1 && (
        <nav aria-label="Pages" className="adm-row" style={{ marginTop: 16 }}>
          {list.page > 1 && (
            <Link className="adm-btn" href={href(list.page - 1)}>
              Previous
            </Link>
          )}
          <span className="adm-hint">
            Page {list.page} of {list.pages}
          </span>
          {list.page < list.pages && (
            <Link className="adm-btn" href={href(list.page + 1)}>
              Next
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
