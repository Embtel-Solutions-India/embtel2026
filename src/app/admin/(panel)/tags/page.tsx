import { TaxonomyManager } from '@/components/admin/TaxonomyManager';
import { userCan } from '@/lib/admin/action';
import { listTaxonomyAdmin, serviceOptions } from '@/lib/admin/taxonomy';
import { requirePagePermission } from '@/lib/auth/session';
import { deleteTagAction, saveTagAction } from './actions';

export default async function TagsPage() {
  const user = await requirePagePermission('taxonomy.write');
  const [rows, services] = await Promise.all([listTaxonomyAdmin('tag'), serviceOptions()]);
  return (
    <>
      <h1>Tags</h1>
      <TaxonomyManager kind="tag" rows={rows} services={services} canDelete={userCan(user, 'taxonomy.delete')} save={saveTagAction} remove={deleteTagAction} />
    </>
  );
}
