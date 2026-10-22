import { z } from 'zod';
import { hitRateLimit } from '@/lib/auth/rate-limit';
import { loadSiteSettings } from '@/lib/content/settings';
import { connectDB } from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/Lead';

import { SERVICES } from './services';

export { SERVICES };

export const LeadInputSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name').max(80),
  lastName: z.string().trim().min(1, 'Enter your last name').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
  phone: z.string().trim().regex(/^[0-9+\-\s()]{7,20}$/, 'Enter a valid phone number'),
  businessName: z.string().trim().max(120).default(''),
  service: z.union([z.enum(SERVICES), z.literal('')]).default(''),
  message: z.string().trim().min(1, 'Tell us a little about your project').max(5000),
  smsConsent: z.literal(true, { errorMap: () => ({ message: 'Please agree to receive SMS messages so we can follow up' }) }),
  website: z.string().max(200).default(''), // honeypot: humans never see or fill it
});

const UtmSchema = z.object({ source: z.string(), medium: z.string(), campaign: z.string(), term: z.string(), content: z.string() }).partial();
export type LeadMeta = { ip: string; sourcePage: string; utm: z.infer<typeof UtmSchema>; gclid: string };
export type LeadResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const clip = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : '');

// Forwards one saved lead to Formspree (which emails the team). Returns the status stored on the lead.
export async function forwardLead(lead: { _id: unknown } & Record<string, unknown>): Promise<'sent' | 'failed' | 'skipped'> {
  const formId = (await loadSiteSettings()).integrations.formspreeFormId;
  if (!formId) {
    await Lead.updateOne({ _id: lead._id }, { $set: { forwardStatus: 'skipped', forwardError: 'Formspree is not configured' } });
    return 'skipped';
  }
  let error = '';
  try {
    const res = await fetch(`https://formspree.io/f/${formId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        businessName: lead.businessName,
        service: lead.service,
        message: lead.message,
        smsConsent: lead.smsConsent ? 'yes' : 'no',
        sourcePage: lead.sourcePage,
        _subject: `New lead: ${lead.firstName} ${lead.lastName}`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) error = `Formspree HTTP ${res.status}`;
  } catch (e) {
    error = e instanceof Error && e.name === 'TimeoutError' ? 'Formspree timed out' : 'Formspree unreachable';
  }
  const status = error ? 'failed' : 'sent';
  await Lead.updateOne({ _id: lead._id }, { $set: { forwardStatus: status, forwardError: error, ...(status === 'sent' && { forwardedAt: new Date() }) } });
  if (error) console.error('[leads] forward failed:', error); // never the lead's details
  return status;
}

export async function submitLead(input: unknown, meta: LeadMeta): Promise<LeadResult> {
  await connectDB();
  if (!(await hitRateLimit(`lead:${meta.ip}`, 5, 600)).allowed) return { ok: false, error: 'Too many messages from your connection. Please try again in a few minutes.' };
  const parsed = LeadInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: 'Please check the highlighted fields.', fieldErrors };
  }
  const { website, ...v } = parsed.data;
  if (website) return { ok: true }; // bot: pretend success, keep nothing
  const utm = UtmSchema.safeParse(meta.utm).success ? Object.fromEntries(Object.entries(meta.utm).map(([k, x]) => [k, clip(x, 200)])) : {};
  const lead = await Lead.create({ ...v, sourcePage: clip(meta.sourcePage, 300), utm, gclid: clip(meta.gclid, 200) });
  await forwardLead(lead.toObject() as { _id: unknown } & Record<string, unknown>);
  return { ok: true };
}
