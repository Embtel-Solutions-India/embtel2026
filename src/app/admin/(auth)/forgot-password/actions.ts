'use server';

import { headers } from 'next/headers';
import { after } from 'next/server';
import { requestPasswordReset } from '@/lib/auth/forgot';
import { env } from '@/lib/env';
import { sendMail } from '@/lib/mail';

export type ForgotState = { ok?: boolean; message?: string };

// Public. The email goes out after the response (after()), so timing never reveals whether the account exists.
export async function forgotPasswordAction(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
  return requestPasswordReset({ email: formData.get('email') }, ip, {
    site: env.SITE_URL,
    send: async (m) => {
      after(async () => {
        const r = await sendMail(m);
        if (!r.sent) console.error('[forgot] reset email not sent:', r.reason);
      });
    },
  });
}
