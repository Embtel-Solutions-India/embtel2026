'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteLeadAction, retryLeadAction } from '@/app/admin/(panel)/leads/actions';

export function LeadActions({ id, canRetry, canDelete }: { id: string; canRetry: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  async function retry() {
    setError('');
    const r = await retryLeadAction({ id });
    if (!r.ok) return setError(r.error);
    setMsg(r.data === 'sent' ? 'Sent to Formspree' : `Not sent (${r.data})`);
    router.refresh();
  }
  async function remove() {
    const r = await deleteLeadAction({ id });
    if (!r.ok) return setError(r.error);
    router.push('/admin/leads');
  }

  return (
    <div className="adm-row">
      {canRetry && (
        <button type="button" className="adm-btn" onClick={retry}>
          Send to Formspree again
        </button>
      )}
      {canDelete &&
        (confirming ? (
          <button type="button" className="adm-btn adm-btn-danger" onClick={remove}>
            Confirm delete
          </button>
        ) : (
          <button type="button" className="adm-btn adm-btn-danger" onClick={() => setConfirming(true)}>
            Delete lead
          </button>
        ))}
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
