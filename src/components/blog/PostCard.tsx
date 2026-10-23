import Image from 'next/image';
import Link from 'next/link';
import type { PostCard as PostCardData } from '@/lib/content/posts';

export const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export function PostCard({ post, priority = false, headingLevel = 'h2' }: { post: PostCardData; priority?: boolean; headingLevel?: 'h2' | 'h3' }) {
  const H = headingLevel;
  return (
    <article className="bc">
      {post.featuredImage ? (
        <Image className="bc-img" src={post.featuredImage} alt={post.imageAltText || post.title} width={600} height={380} sizes="(max-width: 960px) 100vw, 33vw" quality={60} priority={priority} />
      ) : (
        <div className="bc-img" aria-hidden="true" />
      )}
      <div className="bc-body">
        {post.category && (
          <Link className="bc-cat" href={`/blog/category/${post.category.slug}`}>
            {post.category.name}
          </Link>
        )}
        <H>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </H>
        <p>{post.shortDescription}</p>
        <p className="bc-meta">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          <span aria-hidden="true">·</span>
          <span>{post.readingTime} min read</span>
        </p>
      </div>
    </article>
  );
}
