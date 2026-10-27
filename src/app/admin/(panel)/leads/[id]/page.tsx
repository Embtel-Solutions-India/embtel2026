import { notFound } from 'next/navigation';
import { LeadActions } from '@/components/admin/LeadActions';
import { userCan } from '@/lib/admin/action';
import { getLead } from '@/lib/admin/leads';
import { requirePagePermission } from '@/lib/auth/session';

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission('leads.view');
  const lead = await getLead((await params).id);
  if (!lead) notFound();
  const rows: [string, React.ReactNode][] = [
    ['Received', new Date(lead.createdAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/New_York' }) + ' ET'],
    ['Email', <a key="e" href={`mailto:${lead.email}`}>{lead.email}</a>],
    ['Phone', <a key="p" href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`}>{lead.phone}</a>],
    ['Business', lead.businessName || '—'],
    ['Service', lead.service || '—'],
    ['SMS consent', lead.smsConsent ? `Yes${lead.smsConsentNote ? ` — ${lead.smsConsentNote}` : ''}` : 'No'],
    ['Page', lead.sourcePage || '—'],
    ['Campaign', Object.keys(lead.utm).length ? Object.entries(lead.utm).map(([k, v]) => `${k}: ${v}`).join(' · ') : '—'],
    ['Google Ads click (gclid)', lead.gclid || '—'],
    ['Formspree', lead.forwardStatus + (lead.forwardError ? ` — ${lead.forwardError}` : '')],
  ];
  return (
    <>
      <h1>{lead.name}</h1>
      <div className="adm-stack">
        <section className="adm-card" aria-label="Message">
          <h2>Message</h2>
          <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{lead.message}</p>
        </section>
        <section className="adm-card" aria-label="Details">
          <dl className="adm-stack" style={{ gap: 10 }}>
            {rows.map(([k, v]) => (
              <div key={k} className="adm-row" style={{ alignItems: 'baseline' }}>
                <dt className="adm-hint" style={{ minWidth: 190 }}>
                  {k}
                </dt>
                <dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <LeadActions id={lead.id} canRetry={lead.forwardStatus !== 'sent'} canDelete={userCan(user, 'leads.delete')} />
      </div>
    </>
  );
}
