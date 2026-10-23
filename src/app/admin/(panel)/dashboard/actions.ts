'use server';

import { redirect } from 'next/navigation';
import { audit } from '@/lib/audit';
import { clearSessionCookie, getCurrentUser } from '@/lib/auth/session';

// Server action (not a route handler) so Next's built-in Origin check gives CSRF protection.
export async function logoutAction(): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (user) {
      await audit({ actorId: String(user._id), action: 'auth.logout', target: { type: 'user', id: String(user._id) } });
    }
  } catch (err) {
    // Logout must always clear the session, even if the DB is down.
    console.error('[logout] audit skipped:', err instanceof Error ? err.message : 'unknown error');
  }
  await clearSessionCookie();
  redirect('/admin/login');
}
