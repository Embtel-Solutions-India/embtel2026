'use server';

import { redirect } from 'next/navigation';
import { audit } from '@/lib/audit';
import { clearSessionCookie, getCurrentUser } from '@/lib/auth/session';

// Server action (not a route handler) so Next's built-in Origin check gives CSRF protection.
export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    await audit({ actorId: String(user._id), action: 'auth.logout', target: { type: 'user', id: String(user._id) } });
  }
  await clearSessionCookie();
  redirect('/admin/login');
}
