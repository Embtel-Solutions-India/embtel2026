import { notFound } from 'next/navigation';
import { UserEditForm } from '@/components/admin/UserEditForm';
import { getUserDetail } from '@/lib/admin/users';
import { requirePagePermission } from '@/lib/auth/session';

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission('users.manage');
  const user = await getUserDetail((await params).id);
  if (!user) notFound();
  return (
    <>
      <h1>{user.name}</h1>
      <UserEditForm key={user.id} user={user} />
    </>
  );
}
