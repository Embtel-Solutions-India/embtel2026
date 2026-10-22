'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { savePostAction } from '@/app/admin/(panel)/posts/actions';
import type { Option } from '@/lib/admin/posts';
import { type PostFormValue } from '@/lib/admin/post-defaults';
import { toLocalInput, withOffset } from '@/lib/admin/time';
import { Field } from './Field';
import { MediaPicker } from './MediaPicker';
import { RepeatableField } from './RepeatableField';
import { RichTextEditor } from './RichTextEditor';

type Options = { categories: Option[]; tags: Option[]; authors: Option[] };
const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

export function PostForm({
  id: initialId,
  initial,
  updatedAt: initialUpdatedAt,
  publishedAt: initialPublishedAt,
  options,
  saved,
}: {
  id: string | null;
  initial: PostFormValue;
  updatedAt: string | null;
  publishedAt: string | null;
  options: Options;
  saved?: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [schedule, setSchedule] = useState(toLocalInput(initial.scheduledAt));
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(saved ? 'Saved' : '');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = <K extends keyof PostFormValue>(k: K, val: PostFormValue[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    setDirty(true);
    setMsg('');
  };
  const setSeo = <K extends keyof PostFormValue['seo']>(k: K, val: PostFormValue['seo'][K]) => set('seo', { ...v.seo, [k]: val });
  const err = (path: string) => fieldErrors[path];
  const slugLocked = Boolean(publishedAt);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFieldErrors({});
    const r = await savePostAction({
      ...v,
      id: initialId ?? undefined,
      slug: v.slug,
      scheduledAt: v.status === 'scheduled' && schedule ? withOffset(schedule) : null,
      expectedUpdatedAt: initialId ? updatedAt : null,
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      setFieldErrors(r.fieldErrors ?? {});
      return;
    }
    const d = r.data!;
    setDirty(false);
    if (!initialId) {
      router.replace(`/admin/posts/${d.id}?saved=1`);
      return;
    }
    setUpdatedAt(d.updatedAt);
    setPublishedAt(d.publishedAt);
    setV((p) => ({ ...p, slug: d.slug, status: d.status as PostFormValue['status'] }));
    setMsg('Saved');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="adm-stack" noValidate>
      {error && (
        <div role="alert" className="adm-card adm-error">
          <p>{error}</p>
          {Object.keys(fieldErrors).length > 0 && (
            <ul>
              {Object.entries(fieldErrors).map(([k, m]) => (
                <li key={k}>
                  {k}: {m}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <section className="adm-card adm-stack" aria-label="Content">
        <Field label="Title" error={err('title')}>
          <input value={v.title} onChange={(e) => set('title', e.target.value)} required maxLength={200} />
        </Field>
        <Field
          label="Slug"
          error={err('slug')}
          hint={slugLocked ? 'Published posts keep their address so links and search rankings don’t break.' : 'The address: /blog/your-slug. Leave empty to use the title.'}
        >
          <input value={v.slug} onChange={(e) => set('slug', e.target.value.toLowerCase())} readOnly={slugLocked} placeholder="Generated from the title" />
        </Field>
        <Field
          label="Short description"
          error={err('shortDescription')}
          hint={`${v.shortDescription.length}/300 · shown on cards and used as the meta description when none is set`}
        >
          <textarea value={v.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} maxLength={300} rows={3} />
        </Field>
        <div className="adm-field">
          <span>Body</span>
          <RichTextEditor value={v.content} onChange={(html) => set('content', html)} />
          {err('content') && <span className="adm-error">{err('content')}</span>}
        </div>
      </section>

      <section className="adm-card adm-stack" aria-label="Publishing">
        <h2>Publishing</h2>
        <fieldset className="adm-row" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="adm-hint">Status</legend>
          {(
            [
              ['draft', 'Draft'],
              ['published', 'Publish now'],
              ['scheduled', 'Schedule'],
            ] as const
          ).map(([val, label]) => (
            <label key={val} className="adm-check">
              <input type="radio" name="status" value={val} checked={v.status === val} onChange={() => set('status', val)} />
              {label}
            </label>
          ))}
        </fieldset>
        {v.status === 'scheduled' && (
          <Field label="Publish on (your local time)" error={err('scheduledAt')}>
            <input type="datetime-local" value={schedule} onChange={(e) => (setSchedule(e.target.value), setDirty(true))} />
          </Field>
        )}
        {publishedAt && <p className="adm-hint">First published {new Date(publishedAt).toLocaleString('en-US')}</p>}
        <div className="adm-grid">
          <label className="adm-field">
            <span>Author</span>
            <select value={v.authorId ?? ''} onChange={(e) => set('authorId', e.target.value || null)}>
              <option value="">No author (byline below)</option>
              {options.authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="adm-field">
            <span>Byline name</span>
            <input value={v.authorName} onChange={(e) => set('authorName', e.target.value)} placeholder="Embtel Solutions" maxLength={100} />
          </label>
          <label className="adm-field">
            <span>Category</span>
            <select value={v.category ?? ''} onChange={(e) => set('category', e.target.value || null)}>
              <option value="">None</option>
              {options.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {options.tags.length > 0 && (
          <fieldset className="adm-row" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="adm-hint">Tags</legend>
            {options.tags.map((t) => (
              <label key={t.id} className="adm-check">
                <input
                  type="checkbox"
                  checked={v.tags.includes(t.id)}
                  onChange={(e) => set('tags', e.target.checked ? [...v.tags, t.id] : v.tags.filter((x) => x !== t.id))}
                />
                {t.name}
              </label>
            ))}
          </fieldset>
        )}
        <label className="adm-check">
          <input type="checkbox" checked={v.pinned} onChange={(e) => set('pinned', e.target.checked)} />
          Pin to the top of the blog
        </label>
        <MediaPicker label="Featured image" value={v.featuredImage} onChange={(u) => set('featuredImage', u)} error={err('featuredImage')} />
        <label className="adm-field">
          <span>Featured image alt text</span>
          <input value={v.imageAltText} onChange={(e) => set('imageAltText', e.target.value)} maxLength={200} />
        </label>
      </section>

      <section className="adm-card adm-stack" aria-label="Answers and citations">
        <h2>Answers and citations (AEO / GEO)</h2>
        <RepeatableField
          legend="Key takeaways"
          items={v.keyTakeaways}
          onChange={(x) => set('keyTakeaways', x)}
          empty={() => ''}
          addLabel="Add takeaway"
          max={10}
          render={(t, setT, i) => (
            <label className="adm-field">
              <span>Takeaway {i + 1}</span>
              <input value={t} onChange={(e) => setT(e.target.value)} maxLength={300} />
            </label>
          )}
        />
        <RepeatableField
          legend="FAQs"
          items={v.faqs}
          onChange={(x) => set('faqs', x)}
          empty={() => ({ q: '', a: '' })}
          addLabel="Add FAQ"
          max={20}
          render={(f, setF, i) => (
            <>
              <label className="adm-field">
                <span>Question {i + 1}</span>
                <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} maxLength={300} />
              </label>
              <label className="adm-field">
                <span>Answer {i + 1}</span>
                <textarea value={f.a} onChange={(e) => setF({ ...f, a: e.target.value })} maxLength={2000} rows={3} />
              </label>
            </>
          )}
        />
        <RepeatableField
          legend="Sources"
          items={v.sources}
          onChange={(x) => set('sources', x)}
          empty={() => ({ title: '', url: '' })}
          addLabel="Add source"
          max={20}
          render={(s, setS, i) => (
            <div className="adm-grid">
              <label className="adm-field">
                <span>Source {i + 1} title</span>
                <input value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} maxLength={200} />
              </label>
              <label className="adm-field">
                <span>Source {i + 1} URL</span>
                <input type="url" value={s.url} onChange={(e) => setS({ ...s, url: e.target.value })} placeholder="https://" />
              </label>
            </div>
          )}
        />
        <div className="adm-grid">
          <label className="adm-field">
            <span>Focus keyword</span>
            <input value={v.focusKeyword} onChange={(e) => set('focusKeyword', e.target.value)} maxLength={100} />
          </label>
          <Field label="Secondary keywords" hint="Separate with commas">
            <input defaultValue={v.secondaryKeywords.join(', ')} onChange={(e) => set('secondaryKeywords', list(e.target.value))} />
          </Field>
        </div>
      </section>

      <section className="adm-card adm-stack" aria-label="Search and social">
        <h2>Search and social (SEO)</h2>
        <Field label="Meta title" hint={`${v.seo.metaTitle.length}/60 recommended · empty uses the post title`}>
          <input value={v.seo.metaTitle} onChange={(e) => setSeo('metaTitle', e.target.value)} maxLength={70} />
        </Field>
        <Field label="Meta description" hint={`${v.seo.metaDescription.length}/160 recommended · empty uses the short description`}>
          <textarea value={v.seo.metaDescription} onChange={(e) => setSeo('metaDescription', e.target.value)} maxLength={170} rows={2} />
        </Field>
        <div className="adm-grid">
          <Field label="Canonical URL" error={err('seo.canonicalUrl')}>
            <input type="url" value={v.seo.canonicalUrl} onChange={(e) => setSeo('canonicalUrl', e.target.value)} placeholder="Leave empty (recommended)" />
          </Field>
          <label className="adm-field">
            <span>Last reviewed</span>
            <input type="date" value={v.lastReviewedAt ?? ''} onChange={(e) => set('lastReviewedAt', e.target.value || null)} />
          </label>
        </div>
        <MediaPicker label="Social image" value={v.seo.ogImage} onChange={(u) => setSeo('ogImage', u)} error={err('seo.ogImage')} />
        <label className="adm-check">
          <input type="checkbox" checked={v.seo.noindex} onChange={(e) => setSeo('noindex', e.target.checked)} />
          Hide from search engines (noindex)
        </label>
      </section>

      <div className="adm-row" style={{ position: 'sticky', bottom: 0, background: 'var(--color-ink)', padding: '12px 0' }}>
        <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <span role="status" className={dirty ? 'adm-hint' : 'adm-ok'}>
          {dirty ? 'Unsaved changes' : msg}
        </span>
      </div>
    </form>
  );
}
