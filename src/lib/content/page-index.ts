import { connectDB } from '@/lib/db/connect';
import { PageModel } from '@/lib/db/models/Page';

// Published-slug index for the proxy, so unknown slugs get a real HTTP 404 before rendering starts
// (once a dynamic page streams, Next can only send 200 + noindex).
// The proxy runs as its own function, so nothing else can reset this cache: refresh on a 30 s TTL,
// and on a miss re-check at most every 5 s so a newly published page is reachable within seconds.
// ponytail: per-instance cache; a page unpublished in the admin can still pass for ≤30 s (it then 404s via render).
const TTL_MS = 30_000;
const MISS_REFRESH_MS = 5_000;
let cache: { slugs: Set<string>; at: number } | null = null;

async function refresh() {
  await connectDB();
  const slugs = (await PageModel.distinct('slug', { status: 'published' })) as string[];
  cache = { slugs: new Set(slugs), at: Date.now() };
  return cache;
}

export async function isPublishedSlug(slug: string): Promise<boolean> {
  let c = cache && Date.now() - cache.at <= TTL_MS ? cache : await refresh();
  if (!c.slugs.has(slug) && Date.now() - c.at > MISS_REFRESH_MS) c = await refresh();
  return c.slugs.has(slug);
}
