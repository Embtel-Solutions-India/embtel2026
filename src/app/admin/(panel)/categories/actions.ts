'use server';

import { z } from 'zod';
import { adminAction } from '@/lib/admin/action';
import { ObjectIdSchema } from '@/lib/admin/post-schema';
import { CategoryInputSchema, deleteCategory, saveCategory } from '@/lib/admin/taxonomy';

const save = adminAction('taxonomy.write', CategoryInputSchema, (input, user) => saveCategory(input, user));
const destroy = adminAction('taxonomy.delete', z.object({ id: ObjectIdSchema }), ({ id }, user) => deleteCategory(id, user));

export async function saveCategoryAction(input: unknown) {
  return save(input);
}
export async function deleteCategoryAction(input: unknown) {
  return destroy(input);
}
