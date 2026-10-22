import { z } from 'zod';
import { audit } from '@/lib/audit';
import { connectDB } from '@/lib/db/connect';
import { RESET_TOKEN_EXPIRES_MINUTES, User } from '@/lib/db/models/User';
import type { Mail } from '@/lib/mail';
import { hitRateLimit } from './rate-limit';

const GENERIC = `If that email belongs to an account, we’ve sent a link to reset the password. It expires in ${RESET_TOKEN_EXPIRES_MINUTES} minutes.`;
const LIMITED = 'Too many reset requests. Please wait a while and try again.';
const InputSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function resetMail(to: string, name: string, link: string): Mail {
  const first = name.split(/\s+/)[0] || 'there';
  const text = `Hi ${first},\n\nSomeone (hopefully you) asked to reset the password for your Embtel admin account.\n\nSet a new password here (the link works once and expires in ${RESET_TOKEN_EXPIRES_MINUTES} minutes):\n${link}\n\nIf you didn't ask for this, ignore this email — your password stays the same.\n\nEmbtel Solutions`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1f;max-width:520px">
<p>Hi ${escapeHtml(first)},</p>
<p>Someone (hopefully you) asked to reset the password for your Embtel admin account.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#1559d6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Set a new password</a></p>
<p style="color:#55555f;font-size:13px">The link works once and expires in ${RESET_TOKEN_EXPIRES_MINUTES} minutes. If you didn't ask for this, ignore this email — your password stays the same.</p>
<p>Embtel Solutions</p></div>`;
  return { to, subject: 'Reset your Embtel admin password', text, html };
}

// Self-service reset. The answer never reveals whether an account exists; the email is sent through
// `send` (the caller runs it after the response, so response time doesn't reveal it either).
export async function requestPasswordReset(
  input: { email: unknown },
  ip: string,
  opts: { site: string; send: (m: Mail) => Promise<unknown> },
): Promise<{ ok: boolean; message: string }> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Enter the email address you sign in with.' };
  const email = parsed.data.email;
  await connectDB();
  if (!(await hitRateLimit(`forgot-ip:${ip}`, 5, 900)).allowed) return { ok: false, message: LIMITED };
  if (!(await hitRateLimit(`forgot-email:${email}`, 3, 3600)).allowed) return { ok: false, message: LIMITED };

  const user = await User.findOne({ email, active: { $ne: false } });
  if (user) {
    const token = user.createPasswordResetToken();
    await user.save();
    await audit({ actorId: String(user._id), action: 'auth.password-reset-request', target: { type: 'user', id: String(user._id) } });
    await opts.send(resetMail(user.email, user.name, `${opts.site.replace(/\/+$/, '')}/admin/reset-password/${token}`));
  }
  return { ok: true, message: GENERIC };
}
