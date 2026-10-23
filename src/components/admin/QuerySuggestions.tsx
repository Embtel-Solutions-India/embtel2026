'use client';

import type { QueryStat } from '@/lib/integrations/gsc';

// Search Console queries next to the editor: one click adds one as a secondary keyword or an FAQ question.
export function QuerySuggestions({ ranksFor, rising, onKeyword, onFaq }: { ranksFor: QueryStat[]; rising: QueryStat[]; onKeyword: (q: string) => void; onFaq: (q: string) => void }) {
  if (!ranksFor.length && !rising.length) return null;
  const list = (title: string, rows: QueryStat[]) =>
    rows.length > 0 && (
      <div>
        <h3 className="adm-hint" style={{ fontWeight: 700, marginBottom: 6 }}>
          {title}
        </h3>
        <ul className="adm-list">
          {rows.map((r) => (
            <li key={r.query} className="adm-row" style={{ gap: 6 }}>
              <span style={{ flex: '1 1 160px' }}>
                {r.query} <span className="adm-hint">· {r.impressions} impressions · pos {r.position}</span>
              </span>
              <button type="button" className="adm-btn" onClick={() => onKeyword(r.query)}>
                Add keyword<span className="sr-only"> “{r.query}”</span>
              </button>
              <button type="button" className="adm-btn" onClick={() => onFaq(r.query)}>
                Add FAQ<span className="sr-only"> “{r.query}”</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  return (
    <section className="adm-card adm-stack" aria-labelledby="gsc-suggest">
      <h2 id="gsc-suggest">From Google Search Console</h2>
      {list('Queries this post already ranks for', ranksFor)}
      {list('Rising across the site', rising)}
    </section>
  );
}
