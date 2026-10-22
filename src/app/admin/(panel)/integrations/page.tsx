import { IntegrationsForm } from '@/components/admin/IntegrationsForm';
import { requirePagePermission } from '@/lib/auth/session';
import { loadSiteSettings } from '@/lib/content/settings';

export default async function IntegrationsPage() {
  await requirePagePermission('integrations.write');
  const settings = await loadSiteSettings();
  // Only whether the Search Console credentials exist — never their contents.
  const gscApi = Boolean(process.env.GSC_SERVICE_ACCOUNT_JSON && process.env.GSC_SITE_URL);
  return (
    <>
      <h1>Integrations</h1>
      <IntegrationsForm initial={settings.integrations} gscApi={gscApi} />
    </>
  );
}
