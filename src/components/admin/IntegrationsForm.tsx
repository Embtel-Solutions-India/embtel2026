'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveIntegrationsAction } from '@/app/admin/(panel)/integrations/actions';
import type { SiteSettings } from '@/lib/content/settings';
import { Field } from './Field';

type Integrations = SiteSettings['integrations'];
type Key = keyof Integrations;

const GROUPS: { title: string; fields: { key: Key; label: string; hint: string; placeholder: string }[] }[] = [
  {
    title: 'Google Ads',
    fields: [
      { key: 'googleAdsId', label: 'Conversion ID', hint: 'Loads the Google Ads tag on every page.', placeholder: 'AW-123456789' },
      { key: 'googleAdsConversionLabel', label: 'Lead conversion label', hint: 'Fires a conversion when the contact form is sent (the part after the slash).', placeholder: 'AbCdEfGh123' },
    ],
  },
  { title: 'Google Analytics 4', fields: [{ key: 'ga4Id', label: 'Measurement ID', hint: 'Page views plus a generate_lead event on form sends.', placeholder: 'G-XXXXXXXXXX' }] },
  { title: 'Google Tag Manager', fields: [{ key: 'gtmId', label: 'Container ID', hint: 'If you use GTM, set up GA4/Ads inside GTM and leave the IDs above empty, or visits are counted twice.', placeholder: 'GTM-XXXXXXX' }] },
  { title: 'Search Console', fields: [{ key: 'gscVerification', label: 'Verification code', hint: 'The content value of the google-site-verification meta tag.', placeholder: 'abc123…' }] },
  { title: 'Formspree (contact form)', fields: [{ key: 'formspreeFormId', label: 'Form ID', hint: 'From formspree.io/f/<id>. Leads are always saved in the admin as well.', placeholder: 'mzdwzgjr' }] },
  {
    title: 'Tawk.to chat',
    fields: [
      { key: 'tawkPropertyId', label: 'Property ID', hint: 'From the Tawk.to widget code: embed.tawk.to/<property>/<widget>.', placeholder: '24 characters' },
      { key: 'tawkWidgetId', label: 'Widget ID', hint: 'Loads after the page is idle, so it never slows the first view.', placeholder: '1abcdefgh' },
    ],
  },
  { title: 'Elfsight reviews', fields: [{ key: 'elfsightReviewsAppId', label: 'Reviews app ID', hint: 'Shown on pages with a reviews section.', placeholder: '00000000-0000-0000-0000-000000000000' }] },
];

export function IntegrationsForm({ initial, gscApi }: { initial: Integrations; gscApi: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setError('');
    setErrors({});
    const r = await saveIntegrationsAction(Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x).trim()])));
    if (!r.ok) {
      setError(r.error);
      setErrors(r.fieldErrors ?? {});
      return;
    }
    setMsg('Saved. Changes reach the public site immediately.');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="adm-stack" aria-label="Integrations">
      {v.gtmId && (v.ga4Id || v.googleAdsId) && (
        <p className="adm-card adm-error" role="note">
          Google Tag Manager is on together with GA4/Ads IDs: unless those tags are removed from GTM, page views and conversions will be counted twice.
        </p>
      )}
      {GROUPS.map((g) => (
        <section key={g.title} className="adm-card adm-stack" aria-label={g.title}>
          <div className="adm-row" style={{ justifyContent: 'space-between' }}>
            <h2>{g.title}</h2>
            <span className="adm-badge" data-status={g.fields.some((f) => v[f.key]) ? 'published' : undefined}>
              {g.fields.some((f) => v[f.key]) ? 'On' : 'Off'}
            </span>
          </div>
          <div className="adm-grid">
            {g.fields.map((f) => (
              <Field key={f.key} label={f.label} hint={f.hint} error={errors[f.key] ? 'Check the format of this ID' : undefined}>
                <input value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} placeholder={f.placeholder} spellCheck={false} />
              </Field>
            ))}
          </div>
          {g.title === 'Search Console' && (
            <p className="adm-hint">
              Search data for the SEO screen: {gscApi ? 'service account connected.' : 'not connected — set GSC_SERVICE_ACCOUNT_JSON and GSC_SITE_URL in Vercel and add the service account to the property.'}
            </p>
          )}
        </section>
      ))}
      <div className="adm-row">
        <button type="submit" className="adm-btn adm-btn-primary">
          Save integrations
        </button>
        <span role="status" className="adm-ok">
          {msg}
        </span>
      </div>
      {error && (
        <p role="alert" className="adm-error">
          {error}
        </p>
      )}
    </form>
  );
}
