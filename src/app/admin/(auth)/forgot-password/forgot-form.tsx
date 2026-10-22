'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { forgotPasswordAction, type ForgotState } from './actions';

const input = 'w-full rounded border border-gray-300 px-3 py-2';

export function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(forgotPasswordAction, {});
  if (state.ok)
    return (
      <div className="flex w-full max-w-sm flex-col gap-4">
        <p role="status">{state.message}</p>
        <Link href="/admin/login" className="underline">
          Back to sign in
        </Link>
      </div>
    );
  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <p>Enter the email you sign in with. We&apos;ll email you a link to set a new password.</p>
      <label className="flex flex-col gap-1">
        Email
        <input name="email" type="email" autoComplete="email" required className={input} />
      </label>
      {state.message && (
        <p role="alert" className="text-red-300">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-60">
        {pending ? 'Sending…' : 'Email me a reset link'}
      </button>
      <Link href="/admin/login" className="underline">
        Back to sign in
      </Link>
    </form>
  );
}
