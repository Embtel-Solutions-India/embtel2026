import crypto from 'node:crypto';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { audit } from '@/lib/audit';
import { connectDB } from '@/lib/db/connect';
import { User, type UserDoc } from '@/lib/db/models/User';
import { UserFacingError } from './action';
import { ImageUrlSchema, ObjectIdSchema, SlugSchema } from './post-schema';
import { refreshContent } from './revalidate';

export const INVITE_MINUTES = 72 * 60;
const RoleSchema = z.enum(['admin', 'marketing']);
const httpsUrl = z.string().trim().url().regex(/^https:\/\//, 'Profile links must start with https://');

export const InviteSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
  role: RoleSchema,
});

// Author-profile fields, shared with the own-profile screen.
export const ProfileFieldsSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  slug: z.union([SlugSchema, z.literal('')]).optional(),
  bio: z.string().trim().max(1000).optional(),
  jobTitle: z.string().trim().max(100).optional(),
  avatar: ImageUrlSchema.optional(),
  sameAs: z.array(httpsUrl).max(10).optional(),
  expertise: z.array(z.string().trim().min(1).max(60)).max(15).optional(),
});

export const UpdateUserSchema = ProfileFieldsSchema.extend({ id: ObjectIdSchema, role: RoleSchema, active: z.boolean() });

const linkPath = (token: string) => `/admin/reset-password/${token}`;

async function findUser(id: string) {
  if (!isValidObjectId(id)) throw new UserFacingError('This user no longer exists.');
  await connectDB();
  const u = await User.findById(id);
  if (!u) throw new UserFacingError('This user no longer exists.');
  return u;
}

// Returns the site-relative set-password path; the token is shown once and never logged.
export async function inviteUser(input: z.input<typeof InviteSchema>, admin: UserDoc): Promise<{ id: string; path: string }> {
  const v = InviteSchema.parse(input);
  await connectDB();
  if (await User.exists({ email: v.email })) throw new UserFacingError('That email already has an account.');
  // Unguessable placeholder password nobody knows; the user sets their own through the link.
  const user = new User({ ...v, password: crypto.randomBytes(32).toString('hex') });
  const token = user.createPasswordResetToken(INVITE_MINUTES);
  await user.save();
  await audit({ actorId: String(admin._id), action: 'user.invite', target: { type: 'user', id: String(user._id) }, meta: { email: v.email, role: v.role } });
  return { id: String(user._id), path: linkPath(token) };
}

export async function issuePasswordLink(id: string, admin: UserDoc): Promise<{ path: string }> {
  const user = await findUser(id);
  const token = user.createPasswordResetToken();
  await user.save();
  await audit({ actorId: String(admin._id), action: 'user.password-link', target: { type: 'user', id } });
  return { path: linkPath(token) };
}

// Profile fields (bio, slug, links…) applied to a user doc; shared with the own-profile screen.
export async function applyProfile(user: UserDoc, v: z.infer<typeof ProfileFieldsSchema>) {
  if (v.slug && (await User.exists({ slug: v.slug, _id: { $ne: user._id } }))) throw new UserFacingError('Another person already uses this author slug.');
  user.set({
    name: v.name,
    ...(v.slug !== undefined && { slug: v.slug || undefined }),
    ...(v.bio !== undefined && { bio: v.bio }),
    ...(v.jobTitle !== undefined && { jobTitle: v.jobTitle }),
    ...(v.avatar !== undefined && { avatar: v.avatar }),
    ...(v.sameAs !== undefined && { sameAs: v.sameAs }),
    ...(v.expertise !== undefined && { expertise: v.expertise }),
  });
}

export async function updateUser(input: z.input<typeof UpdateUserSchema>, admin: UserDoc): Promise<void> {
  const v = UpdateUserSchema.parse(input);
  const user = await findUser(v.id);
  const losesAdmin = user.role === 'admin' && user.active && (v.role !== 'admin' || !v.active);
  if (losesAdmin && String(user._id) === String(admin._id)) throw new UserFacingError('You can’t remove your own admin access. Ask another Admin.');
  if (losesAdmin && !(await User.exists({ _id: { $ne: user._id }, role: 'admin', active: true }))) {
    throw new UserFacingError('There must always be at least one active Admin.');
  }
  await applyProfile(user, v);
  user.set({ role: v.role, active: v.active });
  await user.save();
  await audit({ actorId: String(admin._id), action: 'user.update', target: { type: 'user', id: v.id }, meta: { role: v.role, active: v.active } });
  refreshContent({ allPosts: true }); // bylines and author pages
}

export type UserRow = { id: string; name: string; email: string; role: string; active: boolean; slug: string; lastLoginAt: string | null };

export async function listUsers(): Promise<UserRow[]> {
  await connectDB();
  const users = await User.find({}, { name: 1, email: 1, role: 1, active: 1, slug: 1, lastLoginAt: 1 }).sort({ name: 1 }).lean();
  return users.map((u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active !== false,
    slug: u.slug ?? '',
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
  }));
}

export type UserDetail = UserRow & { bio: string; jobTitle: string; avatar: string; sameAs: string[]; expertise: string[] };

export async function getUserDetail(id: string): Promise<UserDetail | null> {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const u = await User.findById(id).lean();
  if (!u) return null;
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active !== false,
    slug: u.slug ?? '',
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    bio: u.bio ?? '',
    jobTitle: u.jobTitle ?? '',
    avatar: u.avatar ?? '',
    sameAs: u.sameAs ?? [],
    expertise: u.expertise ?? [],
  };
}
