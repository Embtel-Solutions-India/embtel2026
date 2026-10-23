import { SettingsForms } from '@/components/admin/SettingsForms';
import { userCan } from '@/lib/admin/action';
import { requirePagePermission } from '@/lib/auth/session';
import { loadSiteSettings } from '@/lib/content/settings';

export default async function SettingsPage() {
  const user = await requirePagePermission('settings.write');
  const settings = await loadSiteSettings(); // uncached: always edit the stored values
  return (
    <>
      <h1>Site settings</h1>
      <SettingsForms initial={settings} canEditNav={userCan(user, 'nav.write')} />
    </>
  );
}
