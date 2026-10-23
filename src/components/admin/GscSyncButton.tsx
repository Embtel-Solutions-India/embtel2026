'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { syncGscAction } from '@/app/admin/(panel)/seo/actions';

export function GscSyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="adm-row">
      <button
        type="button"
        className="adm-btn"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          const r = await syncGscAction();
          setBusy(false);
          if (!r.ok) return setError(r.error);
          setMsg(`Updated: ${r.data!.current} rows`);
          router.refresh();
        }}
      >
        {busy ? 'Updating…' : 'Update now'}
      </button>
      <span role="status" className="adm-ok">
        {msg}
      </span>
      {error && (
        <span role="alert" className="adm-error">
          {error}
        </span>
      )}
    </div>
  );
}
