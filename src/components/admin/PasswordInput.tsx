'use client';

import { useState, type InputHTMLAttributes } from 'react';
import { AdminIcon } from './AdminIcon';

// Password field with a show/hide toggle. Takes every input prop (id/aria-* from <Field> included).
export function PasswordInput({ style, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [shown, setShown] = useState(false);
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input {...props} type={shown ? 'text' : 'password'} style={{ ...style, paddingRight: 42 }} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
        style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: 8, lineHeight: 0, background: 'none', border: 0, color: 'inherit', opacity: 0.7, cursor: 'pointer' }}
      >
        <AdminIcon name={shown ? 'eyeOff' : 'eye'} />
      </button>
    </div>
  );
}
