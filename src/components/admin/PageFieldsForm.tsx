'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { savePageFieldsAction } from '@/app/admin/(panel)/pages/actions';
import type { PageFields } from '@/lib/admin/pages';
import { Field } from './Field';
import { MediaPicker } from './MediaPicker';
import { RepeatableField } from './RepeatableField';

export function PageFieldsForm({ initial, canPublish }: { initial: PageFields; canPublish: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState(initial.updatedAt);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const readOnly = initial.locked && !canPublish;
  const set = (p: Partial<PageFields>) => (setV({ ...v, ...p }), setMsg(''));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const r = await savePageFieldsAction({
      id: v.id,
      expectedUpdatedAt: updatedAt,
      title: v.title,
      seo: v.seo,
      ...(v.hero && { hero: v.hero }),
      faqs: v.faqs.map((f) => ({ index: f.index, items: f.items })),
      ...(canPublish && { status: v.status, locked: v.locked }),
    });
    if (!r.ok) return setError(r.fieldErrors ? Object.entries(r.fieldErrors).map(([k, m]) => `${k}: ${m}`).join(' · ') : r.error);
    setUpdatedAt(r.data!.updatedAt);
    setMsg('Saved — live on the site now.');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="adm-stack" aria-label="Page fields">
      {readOnly && <p className="adm-card adm-error">This page is locked because ads point to it. Only an Admin can change it.</p>}
      <fieldset disabled={readOnly} className="adm-stack" style={{ border: 0, padding: 0, margin: 0 }}>
        <section className="adm-card adm-stack" aria-label="Basics">
          <Field label="Page title" hint="Used in the admin and as the search title when no meta title is set">
            <input value={v.title} onChange={(e) => set({ title: e.target.value })} maxLength={200} />
          </Field>
          {canPublish && (
            <div className="adm-row">
              <label className="adm-check">
                <input type="checkbox" checked={v.status === 'published'} onChange={(e) => set({ status: e.target.checked ? 'published' : 'draft' })} />
                Published
              </label>
              <label className="adm-check">
                <input type="checkbox" checked={v.locked} onChange={(e) => set({ locked: e.target.checked })} />
                Locked (ads landing page — only Admins can edit)
              </label>
            </div>
          )}
        </section>

        <section className="adm-card adm-stack" aria-label="Search and social">
          <h2>Search and social</h2>
          <Field label="Meta title" hint={`${v.seo.metaTitle.length}/60 recommended · empty uses the page title`}>
            <input value={v.seo.metaTitle} onChange={(e) => set({ seo: { ...v.seo, metaTitle: e.target.value } })} maxLength={200} />
          </Field>
          <Field label="Meta description" hint={`${v.seo.metaDescription.length}/160 recommended`}>
            <textarea value={v.seo.metaDescription} onChange={(e) => set({ seo: { ...v.seo, metaDescription: e.target.value } })} maxLength={400} rows={2} />
          </Field>
          <MediaPicker label="Social image" value={v.seo.ogImage} onChange={(ogImage) => set({ seo: { ...v.seo, ogImage } })} />
          <label className="adm-check">
            <input type="checkbox" checked={v.seo.noindex} onChange={(e) => set({ seo: { ...v.seo, noindex: e.target.checked } })} />
            Hide from search engines (noindex)
          </label>
        </section>

        {v.hero && (
          <section className="adm-card adm-stack" aria-label="Top section">
            <h2>Top section</h2>
            <Field label="Badge" hint="Small label above the heading (optional)">
              <input value={v.hero.badge} onChange={(e) => set({ hero: { ...v.hero!, badge: e.target.value } })} maxLength={200} />
            </Field>
            <Field label="Heading" hint="Wrap words in *asterisks* to highlight them">
              <textarea value={v.hero.heading} onChange={(e) => set({ hero: { ...v.hero!, heading: e.target.value } })} rows={2} />
            </Field>
            <Field label="Intro text">
              <textarea value={v.hero.lead} onChange={(e) => set({ hero: { ...v.hero!, lead: e.target.value } })} rows={3} />
            </Field>
            <RepeatableField
              legend="Buttons"
              items={v.hero.buttons}
              onChange={(buttons) => set({ hero: { ...v.hero!, buttons } })}
              empty={() => ({ label: '', href: '' })}
              addLabel="Add button"
              max={4}
              render={(b, setB, i) => (
                <div className="adm-grid">
                  <Field label={`Button ${i + 1} text`}>
                    <input value={b.label} onChange={(e) => setB({ ...b, label: e.target.value })} />
                  </Field>
                  <Field label={`Button ${i + 1} link`} hint="/page, https://…, tel: or mailto:">
                    <input value={b.href} onChange={(e) => setB({ ...b, href: e.target.value })} />
                  </Field>
                </div>
              )}
            />
          </section>
        )}

        {v.faqs.map((f, n) => (
          <section key={f.index} className="adm-card adm-stack" aria-label={`FAQ: ${f.title}`}>
            <h2>FAQ: {f.title.replace(/\*/g, '')}</h2>
            <RepeatableField
              legend="Questions"
              items={f.items}
              onChange={(items) => set({ faqs: v.faqs.map((x, j) => (j === n ? { ...x, items } : x)) })}
              empty={() => ({ q: '', a: '' })}
              addLabel="Add question"
              max={30}
              render={(it, setIt, i) => (
                <>
                  <Field label={`Question ${i + 1}`}>
                    <input value={it.q} onChange={(e) => setIt({ ...it, q: e.target.value })} maxLength={500} />
                  </Field>
                  <Field label={`Answer ${i + 1}`}>
                    <textarea value={it.a} onChange={(e) => setIt({ ...it, a: e.target.value })} rows={3} />
                  </Field>
                </>
              )}
            />
          </section>
        ))}
      </fieldset>
      {!readOnly && (
        <div className="adm-row">
          <button type="submit" className="adm-btn adm-btn-primary">
            Save page
          </button>
          <span role="status" className="adm-ok">
            {msg}
          </span>
        </div>
      )}
      {error && (
        <p role="alert" className="adm-error">
          {error}
        </p>
      )}
    </form>
  );
}
