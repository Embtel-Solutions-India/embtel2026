import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PostForm } from '@/components/admin/PostForm';
import { getAdminPost, loadPostOptions, loadScoreContext } from '@/lib/admin/posts';
import { requirePagePermission } from '@/lib/auth/session';
import { gscSource } from '@/lib/integrations/gsc';

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePagePermission('blog.write');
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const post = await getAdminPost(id);
  if (!post) notFound();
  const [options, scoreContext] = await Promise.all([loadPostOptions(user), loadScoreContext(id)]);
  // Keep the current author selectable even when a marketing user edits someone else's post.
  if (post.authorId && !options.authors.some((a) => a.id === post.authorId)) options.authors.push({ id: post.authorId, name: 'Current author', hasBio: false });
  const [ranksFor, insights] = await Promise.all([gscSource.queriesForPage(`/blog/${post.slug}`), gscSource.insights()]);
  const queries = { ranksFor, rising: (insights?.rising ?? []).slice(0, 8) };
  const { updatedAt, publishedAt, isDeleted, ...rest } = post;
  const initial = { ...rest, id: undefined };
  const live = post.status === 'published' && !isDeleted && publishedAt && new Date(publishedAt) <= new Date();
  return (
    <>
      <div className="adm-row" style={{ justifyContent: 'space-between' }}>
        <h1>Edit post</h1>
        {live && (
          <Link href={`/blog/${post.slug}`} className="adm-btn" target="_blank">
            View post
          </Link>
        )}
      </div>
      {isDeleted && <p className="adm-card adm-error">This post is in the trash. Restore it from the post list to publish it again.</p>}
      {/* key: remount with fresh server data after a save that changes the version */}
      <PostForm key={updatedAt} id={id} initial={initial} updatedAt={updatedAt} publishedAt={publishedAt} options={options} saved={sp.saved === '1'} scoreContext={scoreContext} queries={queries} />
    </>
  );
}
