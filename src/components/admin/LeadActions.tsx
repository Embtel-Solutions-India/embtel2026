'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteLeadAction, retryLeadAction } from '@/app/admin/(panel)/leads/actions';
import { ConfirmButton } from './Dialog';

export function LeadActions({ id, canRetry, canDelete }: { id: string; canRetry: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function retry() {
    setError('');
    const r = await retryLeadAction({ id });
    if (!r.ok) return setError(r.error);
    setMsg(r.data === 'sent' ? 'Sent to Formspree' : `Not sent (${r.data})`);
    router.refresh();
  }
  return (
    <div className="adm-row">
      {canRetry && (
        <button type="button" className="adm-btn" onClick={retry}>
          Send to Formspree again
        </button>
      )}
      {canDelete && (
        <ConfirmButton
          label="Delete lead"
          title="Delete this lead?"
          message="The lead and its message are removed from the admin for good. Formspree keeps its own copy."
          confirmLabel="Delete lead"
          onConfirm={async () => {
            const r = await deleteLeadAction({ id });
            if (!r.ok) return r.error;
            router.push('/admin/leads');
          }}
        />
      )}
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
