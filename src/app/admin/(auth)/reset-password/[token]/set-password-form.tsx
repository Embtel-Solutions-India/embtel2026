'use client';

import { useState } from 'react';
import Link from 'next/link';
import { setPasswordAction } from './actions';

const input = 'w-full rounded border border-gray-300 px-3 py-2';

export function SetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const r = await setPasswordAction({ token, password: String(f.get('password')), confirm: String(f.get('confirm')) });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setDone(true);
  }

  if (done)
    return (
      <p role="status">
        Your password is set. <Link href="/admin/login" className="underline">Sign in</Link>
      </p>
    );

  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1">
        New password
        <input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required className={input} aria-describedby="pw-hint" />
      </label>
      <span id="pw-hint" className="text-sm">
        At least 12 characters. A short sentence works well.
      </span>
      <label className="flex flex-col gap-1">
        Confirm password
        <input name="confirm" type="password" autoComplete="new-password" required className={input} />
      </label>
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-60">
        Set password
      </button>
    </form>
  );
}
