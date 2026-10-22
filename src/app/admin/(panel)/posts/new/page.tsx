import { PostForm } from '@/components/admin/PostForm';
import { EMPTY_POST } from '@/lib/admin/post-defaults';
import { loadPostOptions } from '@/lib/admin/posts';
import { requirePagePermission } from '@/lib/auth/session';

export default async function NewPostPage() {
  const user = await requirePagePermission('blog.write');
  const options = await loadPostOptions(user);
  return (
    <>
      <h1>New post</h1>
      <PostForm id={null} initial={{ ...EMPTY_POST, authorId: String(user._id) }} updatedAt={null} publishedAt={null} options={options} />
    </>
  );
}
