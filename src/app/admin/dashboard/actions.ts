'use server';

import { redirect } from 'next/navigation';
import { clearSessionCookie } from '@/lib/auth/session';

// Server action (not a route handler) so Next's built-in Origin check gives CSRF protection.
export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect('/admin/login');
}
