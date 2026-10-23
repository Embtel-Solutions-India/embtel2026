'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TaxonomyRow } from '@/lib/admin/taxonomy';
import { AdminIcon } from './AdminIcon';
import { ConfirmButton, Modal } from './Dialog';
import { Field } from './Field';

type Result = { ok: boolean; error?: string; fieldErrors?: Record<string, string> };
type Draft = { id?: string; name: string; slug: string; description: string; serviceSlug: string };
const blank: Draft = { name: '', slug: '', description: '', serviceSlug: '' };

// Shared screen for categories (with description) and tags (with related service). Add/edit happen in a pop-up.
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
  const [draft, setDraft] = useState<Draft | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const noun = kind === 'category' ? 'category' : 'tag';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError('');
    const input = kind === 'category' ? { id: draft.id, name: draft.name, slug: draft.slug, description: draft.description } : { id: draft.id, name: draft.name, slug: draft.slug, serviceSlug: draft.serviceSlug };
    const r = await save(input);
    setBusy(false);
    if (!r.ok) return setError(r.fieldErrors ? Object.values(r.fieldErrors).join(' ') : (r.error ?? 'Failed'));
    setMsg(draft.id ? `Saved “${draft.name}”` : `Added “${draft.name}”`);
    setDraft(null);
    router.refresh();
  }

  return (
    <div className="adm-stack">
      <div className="adm-row adm-row-between">
        <p className="adm-hint">
          {rows.length} {rows.length === 1 ? noun : kind === 'category' ? 'categories' : 'tags'}
        </p>
        <button type="button" className="adm-btn adm-btn-primary" onClick={() => (setError(''), setDraft(blank))}>
          <AdminIcon name="plus" size={16} />
          Add {noun}
        </button>
      </div>
      <p role="status" className="adm-ok">
        {msg}
      </p>
      {rows.length === 0 ? (
        <div className="adm-empty">
          <p>No {kind === 'category' ? 'categories' : 'tags'} yet. Add one to start grouping posts.</p>
        </div>
      ) : (
        <div className="adm-panel adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Address</th>
                <th scope="col">{kind === 'category' ? 'Description' : 'Related service'}</th>
                <th scope="col">Posts</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                  </td>
                  <td className="adm-muted">/blog/{kind}/{r.slug}</td>
                  <td className="adm-muted">{kind === 'category' ? r.description || '—' : (services.find((s) => s.slug === r.serviceSlug)?.title ?? '—')}</td>
                  <td>{r.posts}</td>
                  <td>
                    <div className="adm-row adm-row-end">
                      <button
                        type="button"
                        className="adm-btn"
                        onClick={() => (setError(''), setDraft({ id: r.id, name: r.name, slug: r.slug, description: r.description, serviceSlug: r.serviceSlug }))}
                      >
                        Edit<span className="sr-only"> {r.name}</span>
                      </button>
                      {canDelete && (
                        <ConfirmButton
                          label="Delete"
                          srLabel={r.name}
                          title={`Delete “${r.name}”?`}
                          message={r.posts > 0 ? `${r.posts} post${r.posts === 1 ? ' uses' : 's use'} it — move them to another ${noun} first.` : `The ${noun} page /blog/${kind}/${r.slug} will stop working.`}
                          confirmLabel={`Delete ${noun}`}
                          onConfirm={async () => {
                            const res = await remove({ id: r.id });
                            if (!res.ok) return res.error ?? 'Failed';
                            setMsg(`Deleted “${r.name}”`);
                            router.refresh();
                          }}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? `Edit ${noun}` : `Add a ${noun}`}>
        {draft && (
          <form onSubmit={submit} className="adm-stack" aria-label={draft.id ? `Edit ${noun}` : `Add ${noun}`}>
            <Field label="Name">
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={kind === 'category' ? 80 : 50} required autoFocus />
            </Field>
            <Field label="Slug" hint="Leave empty to generate it from the name">
              <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase() })} maxLength={100} />
            </Field>
            {kind === 'tag' ? (
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
            ) : (
              <Field label="Description" hint="Shown at the top of the category page">
                <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={300} rows={3} />
              </Field>
            )}
            {error && (
              <p role="alert" className="adm-error">
                {error}
              </p>
            )}
            <div className="adm-dialog-actions">
              <button type="button" className="adm-btn" onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
                {draft.id ? 'Save changes' : `Add ${noun}`}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
