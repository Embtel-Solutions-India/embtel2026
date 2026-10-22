'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction } from './actions';

const input = 'w-full rounded border border-gray-300 px-3 py-2';

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <input type="hidden" name="redirect" value={redirectTo ?? ''} />
      <label className="flex flex-col gap-1">
        Email
        <input name="email" type="email" autoComplete="email" required className={input} />
      </label>
      <label className="flex flex-col gap-1">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={input}
        />
      </label>
      <label className="flex items-center gap-2">
        <input name="remember" type="checkbox" />
        Remember me for 30 days
      </label>
      {state.error && (
        <p role="alert" className="text-red-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-60"
      >
        Sign in
      </button>
      <Link href="/admin/forgot-password" className="text-center underline">
        Forgot password?
      </Link>
    </form>
  );
}
