import Link from 'next/link';
import { ProfileForms } from '@/components/admin/ProfileForms';
import { requirePagePermission } from '@/lib/auth/session';
import { loadAuthorSlugs } from '@/lib/content/posts';

export default async function ProfilePage() {
  const user = await requirePagePermission('profile.self');
  const slug = user.slug ?? '';
  const hasPage = Boolean(slug) && (await loadAuthorSlugs()).includes(slug);
  return (
    <>
      <div className="adm-row" style={{ justifyContent: 'space-between' }}>
        <h1>Your profile</h1>
        {hasPage && (
          <Link href={`/authors/${slug}`} className="adm-btn" target="_blank">
            Your public author page
          </Link>
        )}
      </div>
      <p className="adm-hint" style={{ marginBottom: 16 }}>
        {user.email}
      </p>
      <ProfileForms
        initial={{ name: user.name, slug, jobTitle: user.jobTitle ?? '', bio: user.bio ?? '', avatar: user.avatar ?? '', sameAs: [...(user.sameAs ?? [])], expertise: [...(user.expertise ?? [])] }}
      />
    </>
  );
}
