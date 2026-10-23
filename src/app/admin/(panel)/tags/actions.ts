'use server';

import { z } from 'zod';
import { adminAction } from '@/lib/admin/action';
import { ObjectIdSchema } from '@/lib/admin/post-schema';
import { deleteTag, saveTag, TagInputSchema } from '@/lib/admin/taxonomy';

const save = adminAction('taxonomy.write', TagInputSchema, (input, user) => saveTag(input, user));
const destroy = adminAction('taxonomy.delete', z.object({ id: ObjectIdSchema }), ({ id }, user) => deleteTag(id, user));

export async function saveTagAction(input: unknown) {
  return save(input);
}
export async function deleteTagAction(input: unknown) {
  return destroy(input);
}
