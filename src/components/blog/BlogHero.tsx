import Link from 'next/link';
import { renderInline } from '@/lib/content/inline';
import type { listTaxonomy } from '@/lib/content/posts';

type Taxonomy = Awaited<ReturnType<typeof listTaxonomy>>;

// Hero copy for /blog is the legacy blog.html hero, verbatim.
export function BlogHero({
  eyebrow,
  title,
  lead,
  q = '',
  categories,
  activeCategory,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  q?: string;
  categories?: Taxonomy['categories'];
  activeCategory?: string;
}) {
  return (
    <section className="blog-hero">
      <div className="blog-hero-in">
        <p className="mb-3.5 text-[11.5px] font-bold uppercase tracking-[2px] text-ac">{eyebrow}</p>
        <h1>{renderInline(title)}</h1>
        {lead && <p className="lead">{lead}</p>}
        <form className="blog-search" action="/blog" method="get" role="search">
          <label htmlFor="blog-q" className="sr-only">
            Search articles
          </label>
          <input id="blog-q" type="search" name="q" defaultValue={q} placeholder="Search articles…" maxLength={200} />
          <button type="submit">Search</button>
        </form>
        {categories && categories.length > 0 && (
          <nav aria-label="Categories" className="blog-chips">
            {categories.map((c) => (
              <Link key={c.slug} className="blog-chip" href={`/blog/category/${c.slug}`} aria-current={c.slug === activeCategory ? 'page' : undefined}>
                {c.name}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}
