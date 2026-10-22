'use server';

import { z } from 'zod';
import { adminAction, NO_PERMISSION, UserFacingError, userCan } from '@/lib/admin/action';
import { ObjectIdSchema } from '@/lib/admin/post-schema';
import { deletePostPermanently, duplicatePost, PostInputSchema, restorePost, savePost, trashPost } from '@/lib/admin/posts';

const IdSchema = z.object({ id: ObjectIdSchema });

const save = adminAction('blog.write', PostInputSchema, async (input, user) => {
  if (input.status !== 'draft' && !userCan(user, 'blog.publish')) throw new UserFacingError(NO_PERMISSION);
  return savePost(input, user);
});
const trash = adminAction('blog.write', IdSchema, ({ id }, user) => trashPost(id, user));
const restore = adminAction('blog.write', IdSchema, ({ id }, user) => restorePost(id, user));
const duplicate = adminAction('blog.write', IdSchema, ({ id }, user) => duplicatePost(id, user));
const destroy = adminAction('blog.deletePermanent', IdSchema, ({ id }, user) => deletePostPermanently(id, user));

export async function savePostAction(input: unknown) {
  return save(input);
}
export async function trashPostAction(input: unknown) {
  return trash(input);
}
export async function restorePostAction(input: unknown) {
  return restore(input);
}
export async function duplicatePostAction(input: unknown) {
  return duplicate(input);
}
export async function deletePostAction(input: unknown) {
  return destroy(input);
}
