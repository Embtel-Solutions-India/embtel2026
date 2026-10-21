import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { JsonLd } from '@/components/seo/JsonLd';
import { getPublishedPage } from '@/lib/content/pages';
import { getSiteSettings } from '@/lib/content/settings';
import { pageJsonLd } from '@/lib/seo/jsonld';
import { buildPageMetadata } from '@/lib/seo/metadata';

// Shared by `/` (slug "home") and `/[slug]`. Rendered per request (decision A); reads are cached.
export async function loadPageOr404(slug: string) {
  await connection();
  const [page, settings] = await Promise.all([getPublishedPage(slug), getSiteSettings()]);
  if (!page) notFound();
  return { page, settings };
}

export async function pageMetadata(slug: string): Promise<Metadata> {
  const { page, settings } = await loadPageOr404(slug);
  return buildPageMetadata(page, settings);
}

export async function SitePage({ slug }: { slug: string }) {
  const { page, settings } = await loadPageOr404(slug);
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <div style={{ '--ac': page.theme.accent } as CSSProperties}>
      <JsonLd data={pageJsonLd(page, settings)} nonce={nonce} />
      <BlockRenderer blocks={page.blocks} settings={settings} />
    </div>
  );
}
