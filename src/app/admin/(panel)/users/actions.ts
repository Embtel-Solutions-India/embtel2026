'use server';

import { z } from 'zod';
import { adminAction } from '@/lib/admin/action';
import { ObjectIdSchema } from '@/lib/admin/post-schema';
import { InviteSchema, inviteUser, issuePasswordLink, updateUser, UpdateUserSchema } from '@/lib/admin/users';

const invite = adminAction('users.manage', InviteSchema, (input, admin) => inviteUser(input, admin));
const link = adminAction('users.manage', z.object({ id: ObjectIdSchema }), ({ id }, admin) => issuePasswordLink(id, admin));
const update = adminAction('users.manage', UpdateUserSchema, (input, admin) => updateUser(input, admin));

export async function inviteUserAction(input: unknown) {
  return invite(input);
}
export async function passwordLinkAction(input: unknown) {
  return link(input);
}
export async function updateUserAction(input: unknown) {
  return update(input);
}
