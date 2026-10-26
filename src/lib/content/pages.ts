import { PAGE_FILES } from '../../../content/pages';
import { BlockSchema, PageSchema, SlugSchema, type Block, type Page } from './blocks';

// Site pages live in the repo (content/pages/*.json) and ship with the build; only the blog is in the database.
export type PublishedPage = Omit<Page, 'blocks' | 'publishedAt'> & { blocks: Block[] };
export type PageSummary = { slug: string; title: string; type: Page['type']; noindex: boolean };

// Invalid blocks are dropped one by one so a single bad block can't take a page down; an invalid
// page shell (slug, accent, …) is never rendered. Unit tests fail on either, so neither should ship.
function parsePage(raw: unknown, i: number): PublishedPage | null {
  const doc = raw as Record<string, unknown>;
  const shell = PageSchema.omit({ blocks: true, publishedAt: true }).safeParse({ ...doc, seo: doc.seo ?? { noindex: false } });
  if (!shell.success) {
    console.error(`[page] invalid page shell #${i}`);
    return null;
  }
  const blocks: Block[] = [];
  (Array.isArray(doc.blocks) ? doc.blocks : []).forEach((b, j) => {
    const parsed = BlockSchema.safeParse(b);
    if (parsed.success) blocks.push(parsed.data);
    else console.error(`[page] skipped invalid block ${shell.data.slug}#${j}`);
  });
  return { ...shell.data, blocks };
}

// Published pages only, by slug; drafts and invalid pages are never served.
export function indexPages(files: readonly unknown[]): Map<string, PublishedPage> {
  return new Map(
    files
      .map(parsePage)
      .filter((p): p is PublishedPage => p !== null && p.status === 'published')
      .sort((a, b) => a.slug.localeCompare(b.slug))
      .map((p) => [p.slug, p]),
  );
}

const PAGES = indexPages(PAGE_FILES);

export const PUBLISHED_PAGES: readonly PublishedPage[] = [...PAGES.values()];
export const PAGE_SLUGS: ReadonlySet<string> = new Set(PAGES.keys());

export async function getPublishedPage(slug: string): Promise<PublishedPage | null> {
  return SlugSchema.safeParse(slug).success ? (PAGES.get(slug) ?? null) : null;
}

export async function listPublishedPages(): Promise<PageSummary[]> {
  return PUBLISHED_PAGES.map((p) => ({ slug: p.slug, title: p.title, type: p.type, noindex: p.seo.noindex }));
}
