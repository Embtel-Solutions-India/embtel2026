import Image from 'next/image';
import Link from 'next/link';
import type { PostCard, PublicPost } from '@/lib/content/posts';
import { sanitizeRichHtml } from '@/lib/content/sanitize';
import { AuthorBox } from './AuthorBox';
import { formatDate } from './PostCard';
import { ShareLinks } from './ShareLinks';

type Props = { post: PublicPost; canonical: string; related: PostCard[]; relatedServices: { title: string; href: string }[] };

// Optional AEO/GEO sections (takeaways, FAQs, sources) render only when present — no empty headings.
export function PostArticle({ post, canonical, related, relatedServices }: Props) {
  const { html, headings } = sanitizeRichHtml(post.content, { images: true });
  const byline = post.author.slug ? <Link href={`/authors/${post.author.slug}`}>{post.author.name}</Link> : post.author.name;
  return (
    <article className="bd-wrap">
      <nav aria-label="Breadcrumb">
        <ol className="breadcrumb">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link href="/blog">Blog</Link>
          </li>
          {post.category && (
            <>
              <li aria-hidden="true">›</li>
              <li>
                <Link href={`/blog/category/${post.category.slug}`}>{post.category.name}</Link>
              </li>
            </>
          )}
        </ol>
      </nav>
      {post.category && (
        <Link className="bd-cat" href={`/blog/category/${post.category.slug}`}>
          {post.category.name}
        </Link>
      )}
      <h1 className="bd-title">{post.title}</h1>
      <p className="bd-meta">
        <span>By {byline}</span>
        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        {post.lastReviewedAt && (
          <span>
            Updated <time dateTime={post.lastReviewedAt}>{formatDate(post.lastReviewedAt)}</time>
          </span>
        )}
        <span>{post.readingTime} min read</span>
      </p>
      {post.featuredImage && (
        <Image className="bd-img" src={post.featuredImage} alt={post.imageAltText || post.title} width={1640} height={840} sizes="(max-width: 960px) 100vw, 820px" priority />
      )}

      {post.keyTakeaways.length > 0 && (
        <aside className="bd-takeaways" aria-labelledby="post-takeaways">
          <h2 id="post-takeaways">Key takeaways</h2>
          <ul>
            {post.keyTakeaways.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </aside>
      )}

      {headings.length >= 3 && (
        <nav aria-label="On this page" className="legal-toc">
          <p>On this page</p>
          <ol>
            {headings.map((h) => (
              <li key={h.id}>
                <a href={`#${h.id}`}>{h.text}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Sanitised by sanitizeRichHtml (allow-listed tags; https/internal images only). */}
      <div className="bd-content" dangerouslySetInnerHTML={{ __html: html }} />

      {post.faqs.length > 0 && (
        <section className="bd-faq" aria-labelledby="post-faq">
          <h2 id="post-faq">Frequently asked questions</h2>
          <div className="faq-wrap">
            {post.faqs.map((f, i) => (
              <details key={i} className="faq-item">
                <summary>{f.q}</summary>
                <p className="faq-a">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {post.sources.length > 0 && (
        <section className="bd-sources" aria-labelledby="post-sources">
          <h2 id="post-sources">Sources</h2>
          <ol>
            {post.sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} rel="noopener" target="_blank">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}

      {post.tags.length > 0 && (
        <ul className="bd-tags" aria-label="Tags">
          {post.tags.map((t) => (
            <li key={t.slug}>
              <Link className="bd-tag" href={`/blog/tag/${t.slug}`}>
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ShareLinks url={canonical} title={post.title} />
      {post.author.slug && <AuthorBox author={post.author} />}

      {relatedServices.length > 0 && (
        <section className="bd-related" aria-labelledby="post-related-services">
          <h2 id="post-related-services">Related services</h2>
          <ul className="bd-services">
            {relatedServices.map((s) => (
              <li key={s.href}>
                <Link className="bd-service" href={s.href}>
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section className="bd-related" aria-labelledby="post-related-articles">
          <h2 id="post-related-articles">Related articles</h2>
          <ul className="bd-related-grid">
            {related.map((r) => (
              <li key={r.slug} className="bd-rc">
                <Link href={`/blog/${r.slug}`}>
                  {r.featuredImage && <Image src={r.featuredImage} alt="" width={400} height={200} sizes="(max-width: 960px) 100vw, 260px" />}
                  <span className="bd-rc-body">{r.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
