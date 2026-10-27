'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SERVICES } from '@/lib/leads/services';
import { submitLeadAction } from './actions';

type Gtag = (...args: unknown[]) => void;
const UTM_KEYS = ['source', 'medium', 'campaign', 'term', 'content'] as const;
const ATTR_MAX_AGE = 90 * 86_400_000;

// Ads click ID and UTM from the current URL, else as stored on arrival (see MarketingTags), up to 90 days old.
function attribution(): { utm: Record<string, string>; gclid: string } {
  const q = new URLSearchParams(window.location.search);
  let stored: Record<string, string | number> = {};
  try {
    const s = JSON.parse(window.localStorage.getItem('embtel_attr') ?? '{}');
    if (typeof s.at === 'number' && Date.now() - s.at < ATTR_MAX_AGE) stored = s;
  } catch {
    // storage blocked: URL only
  }
  const pick = (k: string) => q.get(k) ?? (typeof stored[k] === 'string' ? (stored[k] as string) : null);
  return {
    utm: Object.fromEntries(UTM_KEYS.flatMap((k) => (pick(`utm_${k}`) ? [[k, pick(`utm_${k}`)!]] : []))),
    gclid: pick('gclid') ?? '',
  };
}

// Contact form. SMS consent is an optional, unchecked opt-in; its wording is versioned (SMS_CONSENT_VERSION in submit.ts).
// Leads are saved by the server and forwarded to Formspree; conversions fire only after a confirmed save.
export function LeadForm({ adsId, adsLabel, ga4Id, gtmId, email }: { adsId: string; adsLabel: string; ga4Id: string; gtmId: string; email: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setState('busy');
    setError('');
    setFieldErrors({});
    let r: Awaited<ReturnType<typeof submitLeadAction>>;
    try {
      r = await submitLeadAction(
      {
        firstName: f.get('firstName'),
        lastName: f.get('lastName'),
        email: f.get('email'),
        phone: f.get('phone'),
        businessName: f.get('businessName') ?? '',
        service: f.get('service') ?? '',
        message: f.get('message'),
        smsConsent: f.get('smsConsent') === 'yes',
        website: f.get('website') ?? '',
      },
      {
        sourcePage: window.location.pathname,
        ...attribution(),
      },
    );
    } catch {
      // Server down, network drop or a redeploy: never leave the visitor stuck on "Sending…".
      setState('idle');
      setError(`Something went wrong and your message may not have been sent. Please try again${email ? ` or email ${email}` : ''}.`);
      return;
    }
    if (!r.ok) {
      setState('idle');
      setError(r.error);
      setFieldErrors(r.fieldErrors ?? {});
      return;
    }
    const gtag = (window as unknown as { gtag?: Gtag }).gtag;
    if (gtag && adsId && adsLabel) gtag('event', 'conversion', { send_to: `${adsId}/${adsLabel}` });
    if (gtag && ga4Id) gtag('event', 'generate_lead', { form: 'contact' });
    // With Tag Manager the GA4/Ads IDs are left empty (Integrations screen advice), so tell GTM directly.
    if (gtmId) {
      const w = window as unknown as { dataLayer?: unknown[] };
      (w.dataLayer ??= []).push({ event: 'generate_lead', form: 'contact' });
    }
    form.reset();
    setState('sent');
  }

  if (state === 'sent')
    return (
      <div className="thankyou-card" role="status">
        <div className="ty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3>Message Sent!</h3>
        <p>Thanks for reaching out. We&apos;ve received your message and will get back to you within 24 hours.</p>
        <button type="button" className="ty-back" onClick={() => setState('idle')}>
          ← Send Another Message
        </button>
        {email && (
          <p className="ty-meta">
            Or reach us directly at <a href={`mailto:${email}`}>{email}</a>
          </p>
        )}
      </div>
    );

  const err = (k: string) =>
    fieldErrors[k] ? (
      <span id={`lead-${k}-err`} className="fg-error">
        {fieldErrors[k]}
      </span>
    ) : null;
  const a11y = (k: string) => ({ 'aria-invalid': fieldErrors[k] ? true : undefined, 'aria-describedby': fieldErrors[k] ? `lead-${k}-err` : undefined });

  return (
    <form className="contact-form" onSubmit={submit} noValidate aria-label="Contact form">
      <div className="form-row">
        <div className="fg">
          <label htmlFor="lead-firstName">First Name</label>
          <input id="lead-firstName" type="text" name="firstName" placeholder="john" autoComplete="given-name" required maxLength={80} {...a11y('firstName')} />
          {err('firstName')}
        </div>
        <div className="fg">
          <label htmlFor="lead-lastName">Last Name</label>
          <input id="lead-lastName" type="text" name="lastName" placeholder="doe" autoComplete="family-name" required maxLength={80} {...a11y('lastName')} />
          {err('lastName')}
        </div>
      </div>
      <div className="fg">
        <label htmlFor="lead-email">Email Address</label>
        <input id="lead-email" type="email" name="email" placeholder="john@yourcompany.com" autoComplete="email" required maxLength={254} {...a11y('email')} />
        {err('email')}
      </div>
      <div className="fg">
        <label htmlFor="lead-phone">Phone</label>
        <input id="lead-phone" type="tel" name="phone" placeholder="+1 0000 0000" autoComplete="tel" required pattern="^[0-9+\-\s()]{7,20}$" {...a11y('phone')} />
        {err('phone')}
      </div>
      <div className="fg">
        <label htmlFor="lead-businessName">Business Name</label>
        <input id="lead-businessName" type="text" name="businessName" placeholder="Your Company Ltd." autoComplete="organization" maxLength={120} />
      </div>
      <div className="fg">
        <label htmlFor="lead-service">Service Needed</label>
        <select id="lead-service" name="service" defaultValue="">
          <option value="">Select a service…</option>
          {SERVICES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="fg">
        <label htmlFor="lead-message">Tell us about your project</label>
        <textarea id="lead-message" name="message" placeholder="What are you trying to achieve? What's your timeline? Any other context…" required maxLength={5000} {...a11y('message')} />
        {err('message')}
      </div>
      {/* Honeypot: hidden from people and assistive tech; bots that fill it are dropped silently. */}
      <div className="fg-hp" aria-hidden="true">
        <label htmlFor="lead-website">Website</label>
        <input id="lead-website" type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="consent-box">
        <input type="checkbox" id="smsConsent" name="smsConsent" value="yes" {...a11y('smsConsent')} />
        <label htmlFor="smsConsent">
          (Optional) I agree to receive SMS messages from Embtel Solutions about my inquiry, booked consultations (including automated confirmations and reminders), and
          client updates. Consent is not a condition of purchase. Message frequency varies. Message and data rates may apply. Reply <strong>STOP</strong> to opt out,{' '}
          <strong>HELP</strong> for help. View our <Link href="/privacy-policy">Privacy Policy</Link>.
        </label>
      </div>
      {err('smsConsent')}
      {error && (
        <p role="alert" className="fg-error">
          {error}
        </p>
      )}
      <button type="submit" className="form-submit" disabled={state === 'busy'}>
        {state === 'busy' ? 'Sending…' : 'Send Message →'}
      </button>
    </form>
  );
}
