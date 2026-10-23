'use server';

import { z } from 'zod';
import { adminAction } from '@/lib/admin/action';
import { ObjectIdSchema } from '@/lib/admin/post-schema';
import { deleteMedia, listMedia, processUpload, updateMedia } from '@/lib/media/upload';

const upload = adminAction('media.write', z.object({ file: z.instanceof(File, { message: 'Choose an image' }) }), async ({ file }, user) =>
  processUpload({ name: file.name, bytes: Buffer.from(await file.arrayBuffer()) }, user),
);
const update = adminAction('media.write', z.object({ id: ObjectIdSchema, name: z.string().trim().min(1).max(200), alt: z.string().trim().max(200) }), (input, user) =>
  updateMedia(input, user),
);
const destroy = adminAction('media.write', z.object({ id: ObjectIdSchema }), ({ id }, user) => deleteMedia(id, user));
const list = adminAction('media.write', z.object({ q: z.string().max(100).optional(), page: z.number().int().min(1).max(1000).optional() }), (input) =>
  listMedia(input),
);

export async function uploadMediaAction(formData: FormData) {
  return upload({ file: formData.get('file') });
}
export async function updateMediaAction(input: unknown) {
  return update(input);
}
export async function deleteMediaAction(input: unknown) {
  return destroy(input);
}
export async function listMediaAction(input: unknown) {
  return list(input);
}
