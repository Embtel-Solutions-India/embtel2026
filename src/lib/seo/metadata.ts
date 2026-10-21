import type { Metadata } from 'next';
import { env } from '@/lib/env';
import type { PublishedPage } from '@/lib/content/pages';
import type { PublicPost } from '@/lib/content/posts';
import type { SiteSettings } from '@/lib/content/settings';
import { isIndexable } from './indexing';

const SITE_NAME = 'Embtel Solutions';

export function canonicalUrl(path: string): string {
  return path === '/' ? `${env.SITE_URL}/` : `${env.SITE_URL}${path}`;
}

export const pagePath = (slug: string) => (slug === 'home' ? '/' : `/${slug}`);

// Plain text of *emphasis* markup, for titles/descriptions.
export const plainText = (s: string) => s.replace(/\*([^*\n]+)\*/g, '$1');

export function truncate(text: string, max = 160): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:.–-]+$/, '')}…`;
}

export function pageDescription(page: PublishedPage): string {
  if (page.seo.metaDescription) return page.seo.metaDescription;
  const hero = page.blocks.find((b) => b.type === 'hero');
  return hero?.type === 'hero' && hero.lead ? truncate(plainText(hero.lead)) : '';
}

// Listing pages (/blog, category, tag, author). Page n > 1 is its own canonical; search results are noindex.
export function buildListMetadata(opts: { title: string; description: string; path: string; page?: number; noindex?: boolean }): Metadata {
  const page = opts.page ?? 1;
  const url = canonicalUrl(page > 1 ? `${opts.path}?page=${page}` : opts.path);
  const title = `${opts.title}${page > 1 ? ` — Page ${page}` : ''} — ${SITE_NAME}`;
  const index = isIndexable() && !opts.noindex;
  return {
    title: { absolute: title },
    description: opts.description,
    alternates: { canonical: url },
    openGraph: { type: 'website', siteName: SITE_NAME, url, title, description: opts.description, images: [canonicalUrl('/opengraph-image')], locale: 'en_US' },
    twitter: { card: 'summary_large_image', title, description: opts.description },
    robots: { index, follow: index },
  };
}

export function buildPageMetadata(page: PublishedPage, settings: SiteSettings): Metadata {
  const url = canonicalUrl(pagePath(page.slug));
  const title = page.seo.metaTitle ?? (page.title.includes(SITE_NAME) ? page.title : `${page.title} — ${SITE_NAME}`);
  const description = pageDescription(page);
  const image = page.seo.ogImage ?? canonicalUrl(page.slug === 'home' ? '/opengraph-image' : `/${page.slug}/opengraph-image`);
  const index = isIndexable() && !page.seo.noindex;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', siteName: settings.organization.name || SITE_NAME, url, title, description, images: [image], locale: 'en_US' },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    robots: { index, follow: index },
  };
}

// Blog post: article Open Graph, keywords, and a canonical override only when it points at our own host.
export function buildPostMetadata(post: PublicPost, settings: SiteSettings): Metadata {
  const own = canonicalUrl(`/blog/${post.slug}`);
  const override = post.seo.canonicalUrl;
  const url = override && override.startsWith(`${canonicalUrl('/')}`) && /^https:\/\//.test(override) ? override : own;
  const title = post.seo.metaTitle || `${post.title} — ${SITE_NAME}`;
  const description = truncate(post.seo.metaDescription || post.shortDescription);
  const ogImage = post.seo.ogImage ?? post.featuredImage ?? `/blog/${post.slug}/opengraph-image`;
  const image = ogImage.startsWith('/') ? canonicalUrl(ogImage) : ogImage;
  const keywords = [...new Set([post.focusKeyword, ...post.secondaryKeywords, ...post.seo.keywords].filter(Boolean))];
  const index = isIndexable() && !post.seo.noindex;
  return {
    title: { absolute: title },
    description,
    ...(keywords.length > 0 && { keywords }),
    alternates: { canonical: url },
    authors: [{ name: post.author.name, ...(post.author.slug && { url: canonicalUrl(`/authors/${post.author.slug}`) }) }],
    openGraph: {
      type: 'article',
      siteName: settings.organization.name || SITE_NAME,
      url,
      title,
      description,
      images: [image],
      locale: 'en_US',
      publishedTime: post.publishedAt,
      modifiedTime: post.lastReviewedAt ?? post.updatedAt,
      ...(post.category && { section: post.category.name }),
      tags: post.tags.map((t) => t.name),
      authors: [post.author.name],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    robots: { index, follow: index },
  };
}
