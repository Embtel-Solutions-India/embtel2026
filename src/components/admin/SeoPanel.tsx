'use client';

import { scorePost, type ScoreContext, type ScoreInput } from '@/lib/seo/score';

const SITE = 'www.embtelsolutions.com';
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

// Live, advisory SEO/AEO/GEO checklist with Google and social previews. Never blocks saving.
export function SeoPanel({ input, ctx }: { input: ScoreInput; ctx: ScoreContext }) {
  const { score, checks } = scorePost(input, ctx);
  const level = score >= 80 ? 'Good' : score >= 50 ? 'Needs work' : 'Poor';
  const title = input.metaTitle.trim() || input.title.trim() || 'Post title';
  const description = input.metaDescription.trim() || input.shortDescription.trim();
  const groups = [...new Set(checks.map((c) => c.group))];
  return (
    <section className="adm-card adm-stack" aria-labelledby="seo-panel">
      <div className="adm-row" style={{ justifyContent: 'space-between' }}>
        <h2 id="seo-panel">SEO score</h2>
        <span className="adm-badge" data-status={score >= 80 ? 'published' : score >= 50 ? 'scheduled' : undefined}>
          {score}/100 · {level}
        </span>
      </div>
      <p className="adm-hint">Advice only — it never stops you publishing.</p>
      {groups.map((g) => (
        <div key={g}>
          <h3 className="adm-hint" style={{ fontWeight: 700, marginBottom: 6 }}>
            {g}
          </h3>
          <ul className="adm-list">
            {checks
              .filter((c) => c.group === g)
              .map((c) => (
                <li key={c.id} className="adm-seo-check" data-pass={c.pass}>
                  <span aria-hidden="true">{c.pass ? '✓' : '✗'}</span>
                  <span>
                    <span className="sr-only">{c.pass ? 'Passed: ' : 'To do: '}</span>
                    {c.label}
                    {!c.pass && <span className="adm-hint"> — {c.hint}</span>}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ))}
      <div>
        <h3 className="adm-hint" style={{ fontWeight: 700, marginBottom: 6 }}>
          Google preview
        </h3>
        <div className="adm-serp">
          <div className="adm-serp-url">
            {SITE} › blog › {input.slug || 'your-post'}
          </div>
          <div className="adm-serp-title">{cut(title, 60)}</div>
          <div className="adm-serp-desc">{description ? cut(description, 160) : 'Add a meta description to control this text.'}</div>
        </div>
      </div>
      <div>
        <h3 className="adm-hint" style={{ fontWeight: 700, marginBottom: 6 }}>
          Social preview
        </h3>
        <div className="adm-social">
          <div className="adm-social-img">{input.featuredImage ? 'Featured image' : 'Generated title card'}</div>
          <div className="adm-social-body">
            <div className="adm-hint">{SITE.replace('www.', '').toUpperCase()}</div>
            <strong>{cut(title, 70)}</strong>
            <div className="adm-hint">{cut(description, 110)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
