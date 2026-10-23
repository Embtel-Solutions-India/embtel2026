'use server';

import { z } from 'zod';
import { adminAction, UserFacingError } from '@/lib/admin/action';
import { refreshContent } from '@/lib/admin/revalidate';
import { applyProfile, ProfileFieldsSchema } from '@/lib/admin/users';
import { audit } from '@/lib/audit';
import { hitRateLimit } from '@/lib/auth/rate-limit';
import { PasswordSchema } from '@/lib/auth/reset';
import { setSessionCookie } from '@/lib/auth/session';
import { connectDB } from '@/lib/db/connect';
import { User } from '@/lib/db/models/User';

// Always the signed-in user; role, email and active are not part of the schema, so they are dropped.
const profile = adminAction('profile.self', ProfileFieldsSchema, async (input, me) => {
  await connectDB();
  const user = await User.findById(me._id);
  if (!user) throw new UserFacingError('Your account no longer exists.');
  await applyProfile(user, input);
  await user.save();
  await audit({ actorId: String(user._id), action: 'profile.update', target: { type: 'user', id: String(user._id) } });
  refreshContent({ allPosts: true }); // bylines and the author page
});

const PasswordChangeSchema = z
  .object({ current: z.string().min(1, 'Enter your current password').max(200), password: PasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: 'The passwords don’t match.', path: ['confirm'] });

const password = adminAction('profile.self', PasswordChangeSchema, async (input, me) => {
  await connectDB();
  if (!(await hitRateLimit(`pwchange:${me._id}`, 10, 900)).allowed) throw new UserFacingError('Too many attempts. Please try again later.');
  const user = await User.findById(me._id).select('+password');
  if (!user || !(await user.comparePassword(input.current))) throw new UserFacingError('Your current password is incorrect.');
  user.password = input.password;
  await user.save(); // sets passwordChangedAt: every other session ends
  await setSessionCookie(String(user._id), false); // …but this browser stays signed in
  await audit({ actorId: String(user._id), action: 'auth.password-change', target: { type: 'user', id: String(user._id) } });
});

export async function updateProfileAction(input: unknown) {
  return profile(input);
}
export async function changePasswordAction(input: unknown) {
  return password(input);
}
