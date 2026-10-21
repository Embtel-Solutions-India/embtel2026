import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { listPublishedPages } from '@/lib/content/pages';
import { canonicalUrl, pagePath } from '@/lib/seo/metadata';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection(); // read the DB per request (cached), never at build time
  const pages = (await listPublishedPages()).filter((p) => !p.noindex);
  pages.sort((a, b) => (a.slug === 'home' ? -1 : b.slug === 'home' ? 1 : a.slug.localeCompare(b.slug)));
  return pages.map((p) => ({ url: canonicalUrl(pagePath(p.slug)), lastModified: p.updatedAt }));
}
