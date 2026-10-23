import type { PostPage } from '@/lib/content/posts';
import { Pagination } from './Pagination';
import { PostCard } from './PostCard';

export function PostList({ data, basePath, query }: { data: PostPage; basePath: string; query?: Record<string, string> }) {
  return (
    <section className="blog-body" aria-label="Articles">
      <div className="blog-body-in">
        <div className="blog-grid">
          {data.items.length === 0 ? (
            <p className="blog-state">No articles found.</p>
          ) : (
            data.items.map((p, i) => <PostCard key={p.slug} post={p} priority={i === 0 && data.page === 1} />)
          )}
        </div>
        <Pagination basePath={basePath} page={data.page} pages={data.pages} query={query} />
      </div>
    </section>
  );
}
