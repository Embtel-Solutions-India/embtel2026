'use server';

import { z } from 'zod';
import { adminAction } from '@/lib/admin/action';
import { deleteLead, retryForward } from '@/lib/admin/leads';
import { ObjectIdSchema } from '@/lib/admin/post-schema';
import { audit } from '@/lib/audit';

const IdSchema = z.object({ id: ObjectIdSchema });

const retry = adminAction('leads.view', IdSchema, async ({ id }, user) => {
  const status = await retryForward(id);
  await audit({ actorId: String(user._id), action: 'lead.retry', target: { type: 'lead', id }, meta: { status } });
  return status;
});
const destroy = adminAction('leads.delete', IdSchema, async ({ id }, user) => {
  await deleteLead(id);
  await audit({ actorId: String(user._id), action: 'lead.delete', target: { type: 'lead', id } });
});

export async function retryLeadAction(input: unknown) {
  return retry(input);
}
export async function deleteLeadAction(input: unknown) {
  return destroy(input);
}
