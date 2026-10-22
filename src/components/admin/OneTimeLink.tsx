'use client';

import { useState } from 'react';

// Shows a set-password link once (it is never stored in plain text or logged), with a copy button.
export function OneTimeLink({ path, who }: { path: string; who: string }) {
  const url = `${window.location.origin}${path}`;
  const [copied, setCopied] = useState(false);
  return (
    <div className="adm-card adm-stack" role="status" style={{ gap: 8 }}>
      <p>
        Send this link to {who}. It works once and expires soon; it won’t be shown again.
      </p>
      <div className="adm-row">
        <input className="adm-input" readOnly value={url} aria-label="Set-password link" style={{ flex: '1 1 320px' }} onFocus={(e) => e.target.select()} />
        <button type="button" className="adm-btn" onClick={() => navigator.clipboard?.writeText(url).then(() => setCopied(true))}>
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
