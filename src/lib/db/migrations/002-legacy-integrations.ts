import type mongoose from 'mongoose';

export const MIGRATION_002 = '002-legacy-integrations';

// The legacy admin stored a GA4 ID and a Search Console verification code at the top of the settings document.
// The verification code is copied into the new integrations (keeps the property verified). The GA4 ID is only
// reported: the live site never loaded GA4, so switching it on is the owner's decision (Integrations screen).
// Only empty fields are filled, only valid formats; legacy fields stay in place (additive only).
export async function runMigration002(db: mongoose.Connection): Promise<{ copied: number; legacyGa4Id?: string }> {
  const settings = db.collection('settings');
  const doc = await settings.findOne({ key: 'site' });
  if (!doc) return { copied: 0 };
  const current = (doc.integrations ?? {}) as Record<string, unknown>;
  const set: Record<string, string> = {};
  if (!current.gscVerification && typeof doc.googleSearchConsoleVerification === 'string' && /^[A-Za-z0-9_-]{10,100}$/.test(doc.googleSearchConsoleVerification)) {
    set['integrations.gscVerification'] = doc.googleSearchConsoleVerification;
  }
  if (Object.keys(set).length) await settings.updateOne({ _id: doc._id }, { $set: set });
  const ga4 = !current.ga4Id && typeof doc.googleAnalyticsId === 'string' && /^G-[A-Z0-9]{4,20}$/.test(doc.googleAnalyticsId) ? doc.googleAnalyticsId : undefined;
  return { copied: Object.keys(set).length, ...(ga4 && { legacyGa4Id: ga4 }) };
}
