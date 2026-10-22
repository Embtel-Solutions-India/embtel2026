'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TaxonomyRow } from '@/lib/admin/taxonomy';
import { Field } from './Field';

type Result = { ok: boolean; error?: string; fieldErrors?: Record<string, string> };
type Draft = { id?: string; name: string; slug: string; description: string; serviceSlug: string };
const blank: Draft = { name: '', slug: '', description: '', serviceSlug: '' };

// Shared screen for categories (with description) and tags (with related service).
export function TaxonomyManager({
  kind,
  rows,
  services,
  canDelete,
  save,
  remove,
}: {
  kind: 'category' | 'tag';
  rows: TaxonomyRow[];
  services: { slug: string; title: string }[];
  canDelete: boolean;
  save: (input: unknown) => Promise<Result>;
  remove: (input: unknown) => Promise<Result>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(blank);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const noun = kind === 'category' ? 'category' : 'tag';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const input = kind === 'category' ? { id: draft.id, name: draft.name, slug: draft.slug, description: draft.description } : { id: draft.id, name: draft.name, slug: draft.slug, serviceSlug: draft.serviceSlug };
    const r = await save(input);
    setBusy(false);
    if (!r.ok) return setError(r.fieldErrors ? Object.values(r.fieldErrors).join(' ') : (r.error ?? 'Failed'));
    setMsg(draft.id ? `Saved “${draft.name}”` : `Added “${draft.name}”`);
    setDraft(blank);
    router.refresh();
  }

  async function del(row: TaxonomyRow) {
    setError('');
    const r = await remove({ id: row.id });
    if (!r.ok) return setError(r.error ?? 'Failed');
    setMsg(`Deleted “${row.name}”`);
    router.refresh();
  }

  return (
    <div className="adm-stack">
      <form onSubmit={submit} className="adm-card adm-stack" aria-label={draft.id ? `Edit ${noun}` : `Add ${noun}`}>
        <h2>{draft.id ? `Edit ${noun}` : `Add a ${noun}`}</h2>
        <div className="adm-grid">
          <Field label="Name">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={kind === 'category' ? 80 : 50} required />
          </Field>
          <Field label="Slug" hint="Leave empty to generate from the name">
            <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase() })} maxLength={100} />
          </Field>
          {kind === 'tag' && (
            <Field label="Related service" hint="Posts with this tag link to this service page">
              <select value={draft.serviceSlug} onChange={(e) => setDraft({ ...draft, serviceSlug: e.target.value })}>
                <option value="">None</option>
                {services.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.title}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
        {kind === 'category' && (
          <Field label="Description" hint="Shown at the top of the category page">
            <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={300} rows={2} />
          </Field>
        )}
        <div className="adm-row">
          <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
            {draft.id ? 'Save changes' : `Add ${noun}`}
          </button>
          {draft.id && (
            <button type="button" className="adm-btn" onClick={() => setDraft(blank)}>
              Cancel
            </button>
          )}
        </div>
      </form>
      <p role="status" className="adm-ok">
        {msg}
      </p>
      {error && (
        <p role="alert" className="adm-error">
          {error}
        </p>
      )}
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Slug</th>
              <th scope="col">{kind === 'category' ? 'Description' : 'Related service'}</th>
              <th scope="col">Posts</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.slug}</td>
                <td>{kind === 'category' ? r.description : (services.find((s) => s.slug === r.serviceSlug)?.title ?? '—')}</td>
                <td>{r.posts}</td>
                <td>
                  <div className="adm-row" style={{ gap: 6 }}>
                    <button type="button" className="adm-btn" onClick={() => setDraft({ id: r.id, name: r.name, slug: r.slug, description: r.description, serviceSlug: r.serviceSlug })}>
                      Edit<span className="sr-only"> {r.name}</span>
                    </button>
                    {canDelete && (
                      <button type="button" className="adm-btn adm-btn-danger" onClick={() => del(r)}>
                        Delete<span className="sr-only"> {r.name}</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
