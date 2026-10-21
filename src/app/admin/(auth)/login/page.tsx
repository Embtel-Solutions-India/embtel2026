import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Admin login',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ redirect?: string | string[] }>;

// searchParams is request-time data, so it is read inside <Suspense> (cacheComponents).
async function FormWithRedirect({ searchParams }: { searchParams: SearchParams }) {
  const { redirect } = await searchParams;
  return <LoginForm redirectTo={typeof redirect === 'string' ? redirect : undefined} />;
}

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-2xl font-semibold">Admin login</h1>
      <Suspense fallback={<LoginForm />}>
        <FormWithRedirect searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
