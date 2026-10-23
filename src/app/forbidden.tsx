import Link from 'next/link';

// Rendered (HTTP 403) when an admin page calls forbidden() for a role without access.
export default function Forbidden() {
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-display text-2xl font-extrabold text-off">You don&apos;t have access to this page</h1>
      <p>Your role can&apos;t open this screen. Ask an Admin if you need it.</p>
      <Link href="/admin/dashboard" className="text-teal underline">
        Back to the dashboard
      </Link>
    </main>
  );
}
