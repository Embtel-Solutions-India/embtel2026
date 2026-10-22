'use client';

import { cloneElement, useId, type ReactElement } from 'react';

type ControlProps = { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean };

// Label + one control + optional hint/error. Hints and errors stay outside the <label> (so they are not
// part of the field's name) and are linked to the control with aria-describedby.
export function Field({ label, hint, error, children }: { label: string; hint?: React.ReactNode; error?: string; children: ReactElement<ControlProps> }) {
  const id = useId();
  const described = [hint && `${id}-h`, error && `${id}-e`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="adm-field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id, 'aria-describedby': described, 'aria-invalid': error ? true : undefined })}
      {hint && (
        <span id={`${id}-h`} className="adm-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-e`} className="adm-error">
          {error}
        </span>
      )}
    </div>
  );
}
