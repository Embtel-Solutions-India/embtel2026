import Link from 'next/link';
import { loadDashboard } from '@/lib/admin/dashboard';
import { userCan } from '@/lib/admin/action';
import { requireUser } from '@/lib/auth/session';

const when = (iso: string) =>
  iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' }) + ' ET' : '';

const TILES = [
  { key: 'published', label: 'Published' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'draft', label: 'Drafts' },
  { key: 'trashed', label: 'Trash', status: 'trash' },
] as const;

export default async function DashboardPage() {
  const user = await requireUser();
  const d = await loadDashboard();
  return (
    <>
      <div className="adm-row" style={{ justifyContent: 'space-between' }}>
        <h1>Dashboard</h1>
        {userCan(user, 'blog.write') && (
          <Link href="/admin/posts/new" className="adm-btn adm-btn-primary">
            New post
          </Link>
        )}
      </div>
      <div className="adm-stack">
        <div className="adm-grid">
          {TILES.map((t) => (
            <Link key={t.key} href={`/admin/posts?status=${'status' in t ? t.status : t.key}`} className="adm-card" style={{ textDecoration: 'none' }}>
              <div className="adm-stat">{d.counts[t.key]}</div>
              <div>{t.label}</div>
            </Link>
          ))}
        </div>
        <section className="adm-card" aria-labelledby="dash-upcoming">
          <h2 id="dash-upcoming">Scheduled next</h2>
          {d.upcoming.length ? (
            <ul className="adm-list">
              {d.upcoming.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/posts/${p.id}`}>{p.title}</Link> <span className="adm-hint">· {when(p.scheduledAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-hint">Nothing scheduled.</p>
          )}
        </section>
        <section className="adm-card" aria-labelledby="dash-recent">
          <h2 id="dash-recent">Recently edited</h2>
          {d.recent.length ? (
            <ul className="adm-list">
              {d.recent.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/posts/${p.id}`}>{p.title}</Link>{' '}
                  <span className="adm-badge" data-status={p.status}>
                    {p.status}
                  </span>{' '}
                  <span className="adm-hint">{when(p.updatedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-hint">No posts yet.</p>
          )}
        </section>
      </div>
    </>
  );
}
