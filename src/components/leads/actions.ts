'use server';

import { headers } from 'next/headers';
import { submitLead, type LeadResult } from '@/lib/leads/submit';

// Public contact-form action (no session). Validation, honeypot and rate limit live in submitLead.
export async function submitLeadAction(input: unknown, context: { sourcePage?: unknown; utm?: unknown; gclid?: unknown }): Promise<LeadResult> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
  const utm = context?.utm && typeof context.utm === 'object' ? (context.utm as Record<string, string>) : {};
  return submitLead(input, {
    ip,
    sourcePage: typeof context?.sourcePage === 'string' ? context.sourcePage : '',
    utm,
    gclid: typeof context?.gclid === 'string' ? context.gclid : '',
  });
}
