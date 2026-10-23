import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageFieldsForm } from '@/components/admin/PageFieldsForm';
import { userCan } from '@/lib/admin/action';
import { getPageFields } from '@/lib/admin/pages';
import { requirePagePermission } from '@/lib/auth/session';

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission('page.editContent');
  const page = await getPageFields((await params).id);
  if (!page) notFound();
  const path = page.slug === 'home' ? '/' : `/${page.slug}`;
  return (
    <>
      <div className="adm-page-head">
        <h1>{page.title}</h1>
        {page.status === 'published' && (
          <Link href={path} className="adm-btn" target="_blank">
            View page
          </Link>
        )}
      </div>
      <PageFieldsForm key={page.updatedAt} initial={page} canPublish={userCan(user, 'page.publish')} />
    </>
  );
}
