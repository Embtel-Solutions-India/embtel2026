import { cacheLife, cacheTag } from 'next/cache';
import { connectDB } from '@/lib/db/connect';
import { PageModel } from '@/lib/db/models/Page';
import { BlockSchema, PageSchema, SlugSchema, type Block, type Page } from './blocks';

export const PAGES_TAG = 'pages';
export const pageTag = (slug: string) => `page:${slug}`;

export type PublishedPage = Omit<Page, 'blocks' | 'publishedAt'> & {
  id: string;
  blocks: Block[];
  updatedAt: string;
};
export type PageSummary = { slug: string; title: string; type: Page['type']; noindex: boolean; updatedAt: string };

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : new Date(0).toISOString());

// Uncached loaders (tests call these). Invalid blocks are dropped one by one so a single bad block
// can't take a page down; an invalid page shell (slug, accent, …) is never rendered.
export async function loadPublishedPage(slug: string): Promise<PublishedPage | null> {
  if (!SlugSchema.safeParse(slug).success) return null;
  await connectDB();
  const doc = (await PageModel.findOne({ slug, status: 'published' }).lean()) as Record<string, unknown> | null;
  if (!doc) return null;

  const rawBlocks = Array.isArray(doc.blocks) ? doc.blocks : [];
  const blocks: Block[] = [];
  rawBlocks.forEach((raw, i) => {
    const parsed = BlockSchema.safeParse(raw);
    if (parsed.success) blocks.push(parsed.data);
    else console.error(`[page] skipped invalid block ${slug}#${i}`);
  });

  const shell = PageSchema.omit({ blocks: true, publishedAt: true }).safeParse({ ...doc, seo: doc.seo ?? { noindex: false } });
  if (!shell.success) {
    console.error(`[page] invalid page shell ${slug}`);
    return null;
  }
  return { ...shell.data, id: String(doc._id), blocks, updatedAt: iso(doc.updatedAt) };
}

export async function loadPublishedPages(): Promise<PageSummary[]> {
  await connectDB();
  const docs = (await PageModel.find({ status: 'published' }, { slug: 1, title: 1, type: 1, seo: 1, updatedAt: 1 })
    .sort({ slug: 1 })
    .lean()) as Record<string, unknown>[];
  return docs
    .filter((d) => SlugSchema.safeParse(d.slug).success)
    .map((d) => ({
      slug: d.slug as string,
      title: d.title as string,
      type: d.type as Page['type'],
      noindex: Boolean((d.seo as { noindex?: boolean } | undefined)?.noindex),
      updatedAt: iso(d.updatedAt),
    }));
}

export async function getPublishedPage(slug: string): Promise<PublishedPage | null> {
  'use cache';
  cacheTag(pageTag(slug), PAGES_TAG);
  cacheLife('max');
  return loadPublishedPage(slug);
}

export async function listPublishedPages(): Promise<PageSummary[]> {
  'use cache';
  cacheTag(PAGES_TAG);
  cacheLife('max');
  return loadPublishedPages();
}
