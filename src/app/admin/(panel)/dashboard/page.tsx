import { requireUser } from '@/lib/auth/session';

// Placeholder until Task 2's dashboard; the shell (layout) supplies <main>, nav and logout.
export default async function DashboardPage() {
  const user = await requireUser();
  return (
    <>
      <h1>Dashboard</h1>
      <p>Signed in as {user.name}</p>
    </>
  );
}
