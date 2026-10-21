import { connectDB } from '@/lib/db/connect';
import { PageModel } from '@/lib/db/models/Page';

// Published-slug index for the proxy, so unknown slugs get a real HTTP 404 before rendering starts
// (once a dynamic page streams, Next can only send 200 + noindex).
// ponytail: per-instance 30 s TTL — a newly published page can 404 for up to 30 s; Phase 5 publish can call resetPageIndex().
const TTL_MS = 30_000;
let cache: { slugs: Set<string>; at: number } | null = null;

export function resetPageIndex() {
  cache = null;
}

export async function isPublishedSlug(slug: string): Promise<boolean> {
  if (!cache || Date.now() - cache.at > TTL_MS) {
    await connectDB();
    const slugs = (await PageModel.distinct('slug', { status: 'published' })) as string[];
    cache = { slugs: new Set(slugs), at: Date.now() };
  }
  return cache.slugs.has(slug);
}
