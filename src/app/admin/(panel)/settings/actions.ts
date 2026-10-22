'use server';

import { z } from 'zod';
import { adminAction, NO_PERMISSION, UserFacingError, userCan } from '@/lib/admin/action';
import { refreshContent } from '@/lib/admin/revalidate';
import { audit } from '@/lib/audit';
import { settingsFieldSchema, type SettingsField } from '@/lib/content/settings';
import { connectDB } from '@/lib/db/connect';
import { Settings } from '@/lib/db/models/Settings';

// Sections editable here. Integrations have their own screen (Phase 5).
const SECTIONS = ['organization', 'logo', 'defaultOgImage', 'social', 'whatsapp', 'headerNav', 'headerCta', 'footer'] as const satisfies readonly SettingsField[];
const NAV_SECTIONS: readonly string[] = ['headerNav', 'headerCta', 'footer'];

const InputSchema = z.object({ section: z.enum(SECTIONS), value: z.unknown() });

const save = adminAction('settings.write', InputSchema, async ({ section, value }, user) => {
  if (NAV_SECTIONS.includes(section) && !userCan(user, 'nav.write')) throw new UserFacingError(NO_PERMISSION);
  const parsed = settingsFieldSchema(section).safeParse(value);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    throw new UserFacingError(`Check “${[section, ...i.path].join('.')}”: ${i.message}`);
  }
  await connectDB();
  await Settings.updateOne({ key: 'site' }, { $set: { [section]: parsed.data } }, { upsert: true });
  await audit({ actorId: String(user._id), action: 'settings.update', target: { type: 'settings', id: section } });
  refreshContent({ settings: true });
});

export async function saveSettingsAction(input: unknown) {
  return save(input);
}
