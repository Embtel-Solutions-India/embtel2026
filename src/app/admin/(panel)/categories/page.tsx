import { TaxonomyManager } from '@/components/admin/TaxonomyManager';
import { userCan } from '@/lib/admin/action';
import { listTaxonomyAdmin } from '@/lib/admin/taxonomy';
import { requirePagePermission } from '@/lib/auth/session';
import { deleteCategoryAction, saveCategoryAction } from './actions';

export default async function CategoriesPage() {
  const user = await requirePagePermission('taxonomy.write');
  const rows = await listTaxonomyAdmin('category');
  return (
    <>
      <h1>Categories</h1>
      <TaxonomyManager kind="category" rows={rows} services={[]} canDelete={userCan(user, 'taxonomy.delete')} save={saveCategoryAction} remove={deleteCategoryAction} />
    </>
  );
}
