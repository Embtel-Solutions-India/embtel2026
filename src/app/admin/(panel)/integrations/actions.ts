'use server';

import { adminAction } from '@/lib/admin/action';
import { refreshContent } from '@/lib/admin/revalidate';
import { audit } from '@/lib/audit';
import { settingsFieldSchema } from '@/lib/content/settings';
import { connectDB } from '@/lib/db/connect';
import { Settings } from '@/lib/db/models/Settings';

// Admin-only (integrations.write). The schema format-checks every id (they end up in inline scripts).
const save = adminAction('integrations.write', settingsFieldSchema('integrations'), async (value, user) => {
  await connectDB();
  await Settings.updateOne({ key: 'site' }, { $set: { integrations: value } }, { upsert: true });
  await audit({ actorId: String(user._id), action: 'settings.update', target: { type: 'settings', id: 'integrations' } });
  refreshContent({ settings: true });
});

export async function saveIntegrationsAction(input: unknown) {
  return save(input);
}
