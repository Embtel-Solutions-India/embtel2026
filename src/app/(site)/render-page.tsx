import type { CSSProperties } from 'react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { getPublishedPage } from '@/lib/content/pages';
import { getSiteSettings } from '@/lib/content/settings';

// Shared by `/` (slug "home") and `/[slug]`. Rendered per request (decision A); reads are cached.
export async function loadPageOr404(slug: string) {
  await connection();
  const [page, settings] = await Promise.all([getPublishedPage(slug), getSiteSettings()]);
  if (!page) notFound();
  return { page, settings };
}

export async function SitePage({ slug }: { slug: string }) {
  const { page, settings } = await loadPageOr404(slug);
  return (
    <div style={{ '--ac': page.theme.accent } as CSSProperties}>
      <BlockRenderer blocks={page.blocks} settings={settings} />
    </div>
  );
}
