'use client';

import { useState } from 'react';
import Image from 'next/image';
import { listMediaAction } from '@/app/admin/(panel)/media/actions';
import type { MediaRow } from '@/lib/media/upload';
import { Field } from './Field';
import { MediaUpload } from './MediaUpload';

// Image URL field with a "choose from library" panel (and upload in place).
export function MediaPicker({ label, value, onChange, error }: { label: string; value: string; onChange: (url: string) => void; error?: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaRow[]>([]);
  const [q, setQ] = useState('');
  const [loadError, setLoadError] = useState('');

  async function load(query = q) {
    const r = await listMediaAction({ q: query || undefined });
    if (!r.ok) return setLoadError(r.error);
    setLoadError('');
    setItems(r.data!.items);
  }

  const pick = (url: string) => {
    onChange(url);
    setOpen(false);
  };

  return (
    <div className="adm-stack" style={{ gap: 8 }}>
      <Field label={label} error={error}>
        <input type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://" />
      </Field>
      <div className="adm-row" style={{ gap: 6 }}>
        <button
          type="button"
          className="adm-btn"
          aria-expanded={open}
          onClick={() => {
            setOpen(!open);
            if (!open) load();
          }}
        >
          Choose from library<span className="sr-only"> for {label}</span>
        </button>
        {value && (
          <button type="button" className="adm-btn" onClick={() => onChange('')}>
            Clear<span className="sr-only"> {label}</span>
          </button>
        )}
      </div>
      {open && (
        <div className="adm-card adm-stack" role="group" aria-label={`Media library for ${label}`}>
          <MediaUpload onUploaded={(m) => pick(m.url)} />
          <div className="adm-row">
            <label className="adm-field" style={{ flex: '1 1 200px' }}>
              <span>Search images</span>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), load())} />
            </label>
          </div>
          {loadError && <p className="adm-error">{loadError}</p>}
          <ul className="adm-media-grid">
            {items.map((m) => (
              <li key={m.id}>
                <button type="button" className="adm-media-pick" onClick={() => pick(m.url)}>
                  <Image src={m.url} alt="" width={m.width || 400} height={m.height || 300} unoptimized className="adm-media-thumb" />
                  <span>Use {m.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
