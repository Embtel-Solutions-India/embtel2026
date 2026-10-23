'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deletePostAction, duplicatePostAction, restorePostAction, trashPostAction } from '@/app/admin/(panel)/posts/actions';
import { ConfirmButton } from './Dialog';

type Act = (input: unknown) => Promise<{ ok: boolean; error?: string; data?: unknown }>;

export function PostRowActions({ id, trashed, canDelete }: { id: string; trashed: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (act: Act, after?: (data: unknown) => void) => {
    setBusy(true);
    setError('');
    const r = await act({ id });
    setBusy(false);
    if (!r.ok) return setError(r.error ?? 'Failed');
    if (after) after(r.data);
    else router.refresh();
  };

  return (
    <div className="adm-row" style={{ gap: 6 }}>
      {trashed ? (
        <>
          <button type="button" className="adm-btn" disabled={busy} onClick={() => run(restorePostAction)}>
            Restore
          </button>
          {canDelete && (
            <ConfirmButton
              label="Delete permanently"
              title="Delete this post permanently?"
              message="It is removed from the trash and can't be restored. Its address will show “page not found”."
              confirmLabel="Delete permanently"
              onConfirm={async () => {
                const r = await deletePostAction({ id });
                if (!r.ok) return r.error;
                router.refresh();
              }}
            />
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            className="adm-btn"
            disabled={busy}
            onClick={() => run(duplicatePostAction, (d) => router.push(`/admin/posts/${(d as { id: string }).id}`))}
          >
            Duplicate
          </button>
          <button type="button" className="adm-btn adm-btn-danger" disabled={busy} onClick={() => run(trashPostAction)}>
            Trash
          </button>
        </>
      )}
      {error && (
        <span role="alert" className="adm-error">
          {error}
        </span>
      )}
    </div>
  );
}
