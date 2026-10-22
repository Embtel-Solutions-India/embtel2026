'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { deleteMediaAction, updateMediaAction } from '@/app/admin/(panel)/media/actions';
import type { MediaRow } from '@/lib/media/upload';
import { ConfirmButton } from './Dialog';
import { MediaUpload } from './MediaUpload';

const kb = (n: number) => `${Math.round(n / 1024)} KB`;

export function MediaLibrary({ items, userId, isAdmin }: { items: MediaRow[]; userId: string; isAdmin: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const run = async (p: Promise<{ ok: boolean; error?: string }>, done: string) => {
    setError('');
    const r = await p;
    if (!r.ok) return setError(r.error ?? 'Failed');
    setMsg(done);
    router.refresh();
  };

  return (
    <div className="adm-stack">
      <div className="adm-card">
        <MediaUpload onUploaded={(m) => (setMsg(`Uploaded “${m.name}”`), router.refresh())} />
      </div>
      <p role="status" className="adm-ok">
        {msg}
      </p>
      {error && (
        <p role="alert" className="adm-error">
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <p className="adm-hint">No images yet.</p>
      ) : (
        <ul className="adm-media-grid">
          {items.map((m) => {
            const mine = isAdmin || m.uploadedBy === userId;
            return (
              <li key={m.id} className="adm-card adm-stack" style={{ padding: 10, gap: 8 }}>
                <Image src={m.url} alt={m.alt} width={m.width || 400} height={m.height || 300} unoptimized className="adm-media-thumb" />
                <span className="adm-hint">
                  {m.width}×{m.height} · {kb(m.size)}
                </span>
                {mine ? (
                  <form
                    className="adm-stack"
                    style={{ gap: 6 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      run(updateMediaAction({ id: m.id, name: f.get('name'), alt: f.get('alt') }), 'Saved');
                    }}
                  >
                    <label className="adm-field">
                      <span>Name</span>
                      <input name="name" defaultValue={m.name} maxLength={200} />
                    </label>
                    <label className="adm-field">
                      <span>Alt text</span>
                      <input name="alt" defaultValue={m.alt} maxLength={200} />
                    </label>
                    <div className="adm-row" style={{ gap: 6 }}>
                      <button type="submit" className="adm-btn">
                        Save<span className="sr-only"> {m.name}</span>
                      </button>
                      <button type="button" className="adm-btn" onClick={() => navigator.clipboard?.writeText(m.url).then(() => setMsg('URL copied'))}>
                        Copy URL<span className="sr-only"> of {m.name}</span>
                      </button>
                      <ConfirmButton
                        label="Delete"
                        srLabel={m.name}
                        title="Delete this image?"
                        message="It is removed from your storage. Any post or page still using it will show a broken image."
                        confirmLabel="Delete image"
                        onConfirm={async () => {
                          const r = await deleteMediaAction({ id: m.id });
                          if (!r.ok) return r.error;
                          setMsg(`Deleted “${m.name}”`);
                          router.refresh();
                        }}
                      />
                    </div>
                  </form>
                ) : (
                  <span>{m.name}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
