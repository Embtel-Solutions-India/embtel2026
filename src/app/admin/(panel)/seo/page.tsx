import { GscSyncButton } from '@/components/admin/GscSyncButton';
import { requirePagePermission } from '@/lib/auth/session';
import { gscSource, type QueryStat } from '@/lib/integrations/gsc';

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

function QueryTable({ title, hint, rows, showChange }: { title: string; hint: string; rows: QueryStat[]; showChange?: boolean }) {
  const id = title.toLowerCase().replace(/[^a-z]+/g, '-');
  return (
    <section className="adm-card adm-stack" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <p className="adm-hint">{hint}</p>
      {rows.length === 0 ? (
        <p className="adm-hint">Nothing here yet.</p>
      ) : (
        <div className="adm-panel adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Search query</th>
                <th scope="col">Clicks</th>
                {showChange && <th scope="col">vs previous 28 days</th>}
                <th scope="col">Impressions</th>
                <th scope="col">Avg. position</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.query}>
                  <td>{r.query}</td>
                  <td>{r.clicks}</td>
                  {showChange && <td>{signed(r.change)}</td>}
                  <td>{r.impressions}</td>
                  <td>{r.position}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function SeoPage() {
  await requirePagePermission('seo.insights');
  if (!gscSource.configured()) {
    return (
      <>
        <h1>SEO insights</h1>
        <div className="adm-card adm-stack">
          <h2>Connect Google Search Console</h2>
          <ol className="adm-stack" style={{ paddingLeft: 20, listStyle: 'decimal', gap: 6 }}>
            <li>In Google Cloud, create a service account, enable the Google Search Console API and download its JSON key.</li>
            <li>In Search Console → Settings → Users and permissions, add the service account&apos;s email with Restricted access.</li>
            <li>
              In Vercel, set <code>GSC_SERVICE_ACCOUNT_JSON</code> (the key file contents) and <code>GSC_SITE_URL</code> (e.g. <code>sc-domain:embtelsolutions.com</code>), then redeploy.
            </li>
          </ol>
        </div>
      </>
    );
  }
  const i = await gscSource.insights();
  return (
    <>
      <div className="adm-page-head">
        <h1>SEO insights</h1>
        <GscSyncButton />
      </div>
      {!i ? (
        <p className="adm-card">No data yet. Press “Update now” (it also updates daily).</p>
      ) : (
        <div className="adm-stack">
          <p className="adm-hint">
            Google Search, {i.range.start} to {i.range.end} · updated {new Date(i.syncedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' })} ET
          </p>
          <QueryTable title="Rising queries" hint="Biggest gains in clicks — write about these or add them to existing posts as FAQs." rows={i.rising} showChange />
          <QueryTable title="Striking distance" hint="Ranking 8–20: just off page one. Improving these pages is the fastest win." rows={i.strikingDistance} />
          <QueryTable title="Top queries" hint="What already brings people to the site." rows={i.topQueries} showChange />
          <section className="adm-card adm-stack" aria-labelledby="losing">
            <h2 id="losing">Pages losing clicks</h2>
            {i.losingPages.length === 0 ? (
              <p className="adm-hint">No page lost clicks.</p>
            ) : (
              <div className="adm-panel adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th scope="col">Page</th>
                      <th scope="col">Clicks</th>
                      <th scope="col">Previous 28 days</th>
                      <th scope="col">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {i.losingPages.map((p) => (
                      <tr key={p.path}>
                        <td>{p.path}</td>
                        <td>{p.clicks}</td>
                        <td>{p.previousClicks}</td>
                        <td>{signed(p.change)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
