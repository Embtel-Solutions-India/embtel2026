import type { Metadata } from 'next';
import { SetPasswordForm } from './set-password-form';

export const metadata: Metadata = {
  title: 'Set your password',
  robots: { index: false, follow: false },
  // The token is in the URL: never send it to other sites.
  referrer: 'no-referrer',
};

export default async function SetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-2xl font-semibold">Set your password</h1>
      <SetPasswordForm token={token} />
    </main>
  );
}
