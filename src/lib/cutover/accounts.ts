import { isValidObjectId } from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import { Blog } from '@/lib/db/models/Blog';
import { User } from '@/lib/db/models/User';

// Cutover operator helpers (run against the production copy by scripts/cutover/*). No credentials anywhere:
// the legacy default admin is found by the operator in the list, then deactivated or given a set-password link.
const INVITE_MINUTES = 72 * 60;

export type AccountRow = { id: string; name: string; email: string; role: string; active: boolean; lastLoginAt: string };

export async function listAccounts(): Promise<AccountRow[]> {
  await connectDB();
  const users = await User.find({}, { name: 1, email: 1, role: 1, active: 1, lastLoginAt: 1 }).sort({ email: 1 }).lean();
  return users.map((u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role, active: u.active !== false, lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString().slice(0, 10) : 'never' }));
}

export async function applyAccountDecision(id: string, decision: 'keep' | 'deactivate' | 'link'): Promise<{ done: 'kept' } | { done: 'deactivated' } | { done: 'link'; path: string }> {
  if (!isValidObjectId(id)) throw new Error('Unknown account.');
  await connectDB();
  const user = await User.findById(id);
  if (!user) throw new Error('Unknown account.');
  if (decision === 'keep') return { done: 'kept' };
  if (decision === 'deactivate') {
    if (user.role === 'admin' && user.active && !(await User.exists({ _id: { $ne: user._id }, role: 'admin', active: true }))) {
      throw new Error('Refusing: this is the last active admin. Create another admin first (npm run admin:create).');
    }
    user.active = false;
    await user.save();
    return { done: 'deactivated' };
  }
  const token = user.createPasswordResetToken(INVITE_MINUTES);
  await user.save();
  return { done: 'link', path: `/admin/reset-password/${token}` };
}

export async function postsWithoutAuthor(): Promise<{ id: string; slug: string; title: string; authorName: string }[]> {
  await connectDB();
  const posts = await Blog.find({ $or: [{ author: { $exists: false } }, { author: null }] }, { slug: 1, title: 1, authorName: 1 })
    .setOptions({ includeDeleted: true })
    .sort({ slug: 1 })
    .lean();
  return posts.map((p) => ({ id: String(p._id), slug: p.slug, title: p.title, authorName: p.authorName ?? '' }));
}

// Credits posts to a real user (author pages, Person schema). The byline name is kept as a fallback.
export async function assignAuthor(slugs: string[], userId: string): Promise<number> {
  if (!isValidObjectId(userId) || !(await User.exists({ _id: userId }))) throw new Error('No such user.');
  const r = await Blog.updateMany({ slug: { $in: slugs } }, { $set: { author: userId } }).setOptions({ includeDeleted: true });
  return r.modifiedCount;
}
