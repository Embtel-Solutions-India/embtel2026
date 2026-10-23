import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { listPublishedPages } from '@/lib/content/pages';
import { listAuthorSlugs, listPostIndex, listTaxonomy } from '@/lib/content/posts';
import { canonicalUrl, pagePath } from '@/lib/seo/metadata';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection(); // read the DB per request (cached), never at build time
  const [allPages, posts, taxonomy, authors] = await Promise.all([listPublishedPages(), listPostIndex(), listTaxonomy(), listAuthorSlugs()]);
  const pages = allPages.filter((p) => !p.noindex);
  pages.sort((a, b) => (a.slug === 'home' ? -1 : b.slug === 'home' ? 1 : a.slug.localeCompare(b.slug)));
  const latestPost = posts[0]?.modifiedAt;
  return [
    ...pages.map((p) => ({ url: canonicalUrl(pagePath(p.slug)), lastModified: p.updatedAt })),
    ...(posts.length ? [{ url: canonicalUrl('/blog'), lastModified: latestPost }] : []),
    ...posts.map((p) => ({ url: canonicalUrl(`/blog/${p.slug}`), lastModified: p.modifiedAt })),
    ...taxonomy.categories.map((c) => ({ url: canonicalUrl(`/blog/category/${c.slug}`) })),
    ...taxonomy.tags.map((t) => ({ url: canonicalUrl(`/blog/tag/${t.slug}`) })),
    ...authors.map((a) => ({ url: canonicalUrl(`/authors/${a}`) })),
  ];
}
