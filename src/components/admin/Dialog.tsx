'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AdminIcon } from './AdminIcon';

// Modal pop-up on the browser's native <dialog>: focus is trapped while open, Esc closes it, and focus
// returns to the button that opened it. No dialog library.
export function Modal({ open, onClose, title, children, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`adm-dialog adm-dialog-${size}`}
      aria-labelledby={`${id}-t`}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()} // click on the backdrop
    >
      <div className="adm-dialog-in">
        <div className="adm-dialog-head">
          <h2 id={`${id}-t`}>{title}</h2>
          <button type="button" className="adm-icon-btn" onClick={onClose}>
            <AdminIcon name="close" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        {open && children}
      </div>
    </dialog>
  );
}

// A button that asks before doing something destructive. `onConfirm` returns an error message, or nothing on success.
export function ConfirmButton({
  label,
  title,
  message,
  confirmLabel,
  onConfirm,
  danger = true,
  srLabel,
}: {
  label: string;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<string | void>;
  danger?: boolean;
  srLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <>
      <button type="button" className={`adm-btn ${danger ? 'adm-btn-danger' : ''}`} onClick={() => (setError(''), setOpen(true))}>
        {label}
        {srLabel && <span className="sr-only"> {srLabel}</span>}
      </button>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title={title} size="sm">
        <div className="adm-stack">
          <div className="adm-dialog-msg">{message}</div>
          {error && (
            <p role="alert" className="adm-error">
              {error}
            </p>
          )}
          <div className="adm-dialog-actions">
            <button type="button" className="adm-btn" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className={`adm-btn ${danger ? 'adm-btn-danger-solid' : 'adm-btn-primary'}`}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const err = await onConfirm();
                setBusy(false);
                if (err) return setError(err);
                setOpen(false);
              }}
            >
              {busy ? 'Working…' : confirmLabel}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
