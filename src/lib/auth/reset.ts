import crypto from 'node:crypto';
import { z } from 'zod';
import { audit } from '@/lib/audit';
import { connectDB } from '@/lib/db/connect';
import { User } from '@/lib/db/models/User';
import { hitRateLimit } from './rate-limit';

export const PasswordSchema = z.string().min(12, 'Use at least 12 characters.').max(128, 'Use at most 128 characters.');
const InputSchema = z
  .object({ token: z.string().regex(/^[0-9a-f]{64}$/), password: PasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: 'The passwords don’t match.', path: ['confirm'] });

const INVALID = 'This link is invalid or has expired. Ask an Admin for a new one.';

// Set-password links (invites and resets). Token is single-use; unknown and expired tokens get the
// same answer; setting the password also ends every existing session (passwordChangedAt).
export async function resetPasswordWithToken(input: { token: string; password: string; confirm: string }, ip: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await connectDB();
  if (!(await hitRateLimit(`reset:${ip}`, 10, 900)).allowed) return { ok: false, error: 'Too many attempts. Please try again later.' };
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues.find((i) => i.path[0] !== 'token');
    return { ok: false, error: issue?.message ?? INVALID };
  }
  const hash = crypto.createHash('sha256').update(parsed.data.token).digest('hex');
  const user = await User.findOne({ passwordResetToken: hash, passwordResetExpires: { $gt: new Date() } }).select('+passwordResetToken +passwordResetExpires');
  if (!user) return { ok: false, error: INVALID };
  user.password = parsed.data.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  await audit({ actorId: String(user._id), action: 'auth.password-set', target: { type: 'user', id: String(user._id) } });
  return { ok: true };
}
