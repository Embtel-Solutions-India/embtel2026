'use server';

import { z } from 'zod';
import { adminAction, UserFacingError } from '@/lib/admin/action';
import { audit } from '@/lib/audit';
import { syncGsc } from '@/lib/integrations/gsc';

const sync = adminAction('seo.insights', z.object({}), async (_input, user) => {
  let r: Awaited<ReturnType<typeof syncGsc>>;
  try {
    r = await syncGsc();
  } catch (e) {
    throw new UserFacingError(e instanceof Error && e.message.startsWith('Search Console') ? e.message : 'Search Console sync failed. Try again later.');
  }
  if (!r) throw new UserFacingError('Search Console is not connected yet.');
  await audit({ actorId: String(user._id), action: 'seo.sync', target: { type: 'gsc' }, meta: r });
  return r;
});

export async function syncGscAction() {
  return sync({});
}
