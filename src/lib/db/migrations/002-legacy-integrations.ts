import type mongoose from 'mongoose';

export const MIGRATION_002 = '002-legacy-integrations';

// The legacy admin stored a GA4 ID and a Search Console verification code at the top of the settings
// document. Copy them into the new integrations fields, only where those are still empty and the values
// have the expected format. Legacy fields are left in place (additive only).
export async function runMigration002(db: mongoose.Connection): Promise<{ copied: number }> {
  const settings = db.collection('settings');
  const doc = await settings.findOne({ key: 'site' });
  if (!doc) return { copied: 0 };
  const current = (doc.integrations ?? {}) as Record<string, unknown>;
  const set: Record<string, string> = {};
  if (!current.ga4Id && typeof doc.googleAnalyticsId === 'string' && /^G-[A-Z0-9]{4,20}$/.test(doc.googleAnalyticsId)) set['integrations.ga4Id'] = doc.googleAnalyticsId;
  if (!current.gscVerification && typeof doc.googleSearchConsoleVerification === 'string' && /^[A-Za-z0-9_-]{10,100}$/.test(doc.googleSearchConsoleVerification)) {
    set['integrations.gscVerification'] = doc.googleSearchConsoleVerification;
  }
  if (Object.keys(set).length) await settings.updateOne({ _id: doc._id }, { $set: set });
  return { copied: Object.keys(set).length };
}
