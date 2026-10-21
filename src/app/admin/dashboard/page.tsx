import { Suspense } from 'react';
import { requireUser } from '@/lib/auth/session';
import { logoutAction } from './actions';

async function Who() {
  const user = await requireUser();
  return (
    <>
      <p>Signed in as {user.name}</p>
      <p>Role: {user.role}</p>
    </>
  );
}

// Placeholder until the admin UI lands.
export default function DashboardPage() {
  return (
    <main className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Who />
      </Suspense>
      <form action={logoutAction}>
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-white">
          Log out
        </button>
      </form>
    </main>
  );
}
