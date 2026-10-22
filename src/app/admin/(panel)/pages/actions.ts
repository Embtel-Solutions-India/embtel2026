'use server';

import { adminAction } from '@/lib/admin/action';
import { PageFieldsSchema, savePageFields } from '@/lib/admin/pages';

// page.editContent for everyone; locked pages and publish/lock changes are re-checked inside (Admin only).
const save = adminAction('page.editContent', PageFieldsSchema, (input, user) => savePageFields(input, user));

export async function savePageFieldsAction(input: unknown) {
  return save(input);
}
