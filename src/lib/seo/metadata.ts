import type { Metadata } from 'next';
import { env } from '@/lib/env';
import type { PublishedPage } from '@/lib/content/pages';
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

export function buildPageMetadata(page: PublishedPage, settings: SiteSettings): Metadata {
  const url = canonicalUrl(pagePath(page.slug));
  const title = page.seo.metaTitle ?? `${page.title} — ${SITE_NAME}`;
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
