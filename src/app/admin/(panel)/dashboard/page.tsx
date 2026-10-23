import Link from 'next/link';
import { AdminIcon } from '@/components/admin/AdminIcon';
import { userCan } from '@/lib/admin/action';
import { loadDashboard } from '@/lib/admin/dashboard';
import { requireUser } from '@/lib/auth/session';

const ET = 'America/New_York';
const when = (iso: string) => (iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: ET }) : '');
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
};
const greeting = () => {
  const h = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: ET }));
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};
const ACTION: Record<string, string> = {
  'post.create': 'created a post',
  'post.update': 'edited a post',
  'post.trash': 'moved a post to the trash',
  'post.autopublish': 'post went live',
  'page.update': 'edited a page',
  'user.invite': 'invited a person',
  'settings.update': 'changed settings',
  'media.upload': 'uploaded an image',
  'lead.export': 'exported leads',
  'auth.login': 'signed in',
};

type Attention = { tone: 'warn' | 'info'; href: string; text: string };

export default async function DashboardPage() {
  const user = await requireUser();
  const isAdmin = user.role === 'admin';
  const d = await loadDashboard({ userId: String(user._id), isAdmin });
  const firstName = user.name.split(/\s+/)[0];

  const attention: Attention[] = [];
  if (d.leads.failed) attention.push({ tone: 'warn', href: '/admin/leads?status=failed', text: `${d.leads.failed} lead${d.leads.failed === 1 ? '' : 's'} didn't reach Formspree — re-send ${d.leads.failed === 1 ? 'it' : 'them'}` });
  if (d.leads.last7Days) attention.push({ tone: 'info', href: '/admin/leads', text: `${d.leads.last7Days} new lead${d.leads.last7Days === 1 ? '' : 's'} in the last 7 days` });
  if (d.upcoming[0]) attention.push({ tone: 'info', href: `/admin/posts/${d.upcoming[0].id}`, text: `“${d.upcoming[0].title}” goes live ${when(d.upcoming[0].scheduledAt)} ET` });
  if (d.myDrafts.length) attention.push({ tone: 'info', href: `/admin/posts/${d.myDrafts[0].id}`, text: `You have ${d.myDrafts.length} draft${d.myDrafts.length === 1 ? '' : 's'} in progress — continue “${d.myDrafts[0].title}”` });
  if (d.seoGaps.length) attention.push({ tone: 'warn', href: `/admin/posts/${d.seoGaps[0].id}`, text: `${d.seoGaps.length} published post${d.seoGaps.length === 1 ? ' is' : 's are'} missing a focus keyword or FAQs — start with “${d.seoGaps[0].title}”` });

  const flow = [
    { key: 'draft', label: 'Drafts', n: d.counts.draft, href: '/admin/posts?status=draft' },
    { key: 'scheduled', label: 'Scheduled', n: d.counts.scheduled, href: '/admin/posts?status=scheduled' },
    { key: 'published', label: 'Published', n: d.counts.published, href: '/admin/posts?status=published' },
  ];

  return (
    <>
      <div className="adm-page-head">
        <div>
          <h1>
            {greeting()}, {firstName}
          </h1>
          <p className="adm-hint">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: ET })}</p>
        </div>
      </div>

      <section className="adm-attention" aria-labelledby="dash-attention">
        <h2 id="dash-attention">Needs attention</h2>
        {attention.length === 0 ? (
          <p className="adm-attention-clear">
            <AdminIcon name="dashboard" size={16} />
            All clear. Nothing is waiting on you right now.
          </p>
        ) : (
          <ul>
            {attention.map((a) => (
              <li key={a.href + a.text} data-tone={a.tone}>
                <Link href={a.href}>
                  <AdminIcon name={a.tone === 'warn' ? 'alert' : 'arrow'} size={16} />
                  <span>{a.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {userCan(user, 'blog.write') && (
        <section aria-labelledby="dash-flow" className="adm-section">
          <div className="adm-row adm-row-between">
            <h2 id="dash-flow">Content</h2>
            <Link href="/admin/posts?status=trash" className="adm-link-quiet">
              Trash ({d.counts.trashed})
            </Link>
          </div>
          <ol className="adm-flow">
            {flow.map((f) => (
              <li key={f.key} data-step={f.key}>
                <Link href={f.href}>
                  <span className="adm-flow-n">{f.n}</span>
                  <span className="adm-flow-label">{f.label}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="adm-split">
        <section className="adm-panel" aria-labelledby="dash-leads">
          <div className="adm-panel-head">
            <h2 id="dash-leads">Recent leads</h2>
            <Link href="/admin/leads" className="adm-link-quiet">
              All leads
            </Link>
          </div>
          {d.leads.recent.length === 0 ? (
            <p className="adm-hint adm-panel-body">No leads yet. They appear here as soon as someone sends the contact form.</p>
          ) : (
            <ul className="adm-rows">
              {d.leads.recent.map((l) => (
                <li key={l.id}>
                  <Link href={`/admin/leads/${l.id}`}>
                    <span className="adm-rows-main">
                      <strong>{l.name}</strong>
                      <span className="adm-muted">{l.service || 'No service chosen'}</span>
                    </span>
                    <span className="adm-rows-side">
                      {l.status === 'failed' && <span className="adm-badge" data-status="warn">Not sent</span>}
                      <span className="adm-muted">{ago(l.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="adm-panel" aria-labelledby="dash-recent">
          <div className="adm-panel-head">
            <h2 id="dash-recent">Recently edited</h2>
            <Link href="/admin/posts" className="adm-link-quiet">
              All posts
            </Link>
          </div>
          {d.recent.length === 0 ? (
            <p className="adm-hint adm-panel-body">Nothing edited yet. Write the first post with “New post”.</p>
          ) : (
            <ul className="adm-rows">
              {d.recent.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/posts/${p.id}`}>
                    <span className="adm-rows-main">
                      <strong>{p.title}</strong>
                    </span>
                    <span className="adm-rows-side">
                      <span className="adm-badge" data-status={p.status}>
                        {p.status}
                      </span>
                      <span className="adm-muted">{ago(p.updatedAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {isAdmin && d.activity && d.integrations && (
        <div className="adm-split adm-split-wide">
          <section className="adm-panel" aria-labelledby="dash-team">
            <div className="adm-panel-head">
              <h2 id="dash-team">Team activity</h2>
              <Link href="/admin/audit" className="adm-link-quiet">
                Audit log
              </Link>
            </div>
            <ul className="adm-rows">
              {d.activity.map((a) => (
                <li key={a.id}>
                  <div>
                    <span className="adm-rows-main">
                      <span>
                        <strong>{a.actor}</strong> {ACTION[a.action] ?? a.action.replace('.', ' ')}
                      </span>
                    </span>
                    <span className="adm-rows-side adm-muted">{ago(a.at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="adm-panel" aria-labelledby="dash-site">
            <div className="adm-panel-head">
              <h2 id="dash-site">Site connections</h2>
              <Link href="/admin/integrations" className="adm-link-quiet">
                Manage
              </Link>
            </div>
            <ul className="adm-status-list">
              {d.integrations.map((i) => (
                <li key={i.name} data-on={i.on}>
                  <span className="adm-dot" aria-hidden="true" />
                  {i.name}
                  <span className="sr-only">{i.on ? ': on' : ': off'}</span>
                  <span className="adm-muted adm-status-state" aria-hidden="true">
                    {i.on ? 'On' : 'Off'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
