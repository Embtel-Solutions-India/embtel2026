'use client';

import { useId, useRef, useState } from 'react';
import { uploadMediaAction } from '@/app/admin/(panel)/media/actions';
import type { MediaRow } from '@/lib/media/upload';

// File input that uploads immediately. Server checks type by content, size and re-encodes to WebP.
export function MediaUpload({ onUploaded }: { onUploaded: (m: MediaRow) => void }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File) {
    setError('');
    if (file.size > 5 * 1024 * 1024) return setError('Images must be 5 MB or smaller.');
    setBusy(true);
    const fd = new FormData();
    fd.set('file', file);
    const r = await uploadMediaAction(fd);
    setBusy(false);
    if (input.current) input.current.value = '';
    if (!r.ok) return setError(r.error);
    onUploaded(r.data!);
  }

  return (
    <div className="adm-field">
      <label htmlFor={id}>Upload an image</label>
      <input
        id={id}
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        disabled={busy}
        aria-describedby={`${id}-hint`}
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <span id={`${id}-hint`} className="adm-hint">
        {busy ? 'Uploading…' : 'JPEG, PNG, WebP, GIF or AVIF, up to 5 MB. Saved as WebP, max 2400 px.'}
      </span>
      {error && (
        <span role="alert" className="adm-error">
          {error}
        </span>
      )}
    </div>
  );
}
