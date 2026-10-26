import { connectDB } from '@/lib/db/connect';
import { Blog } from '@/lib/db/models/Blog';
import { Category } from '@/lib/db/models/Category';
import { Tag } from '@/lib/db/models/Tag';
import { User } from '@/lib/db/models/User';
import { PAGE_SLUGS } from './pages';
import { PUBLIC_FILTER } from './visibility';

// Index of every public blog/author path for the proxy (site pages are answered from the build), so unknown URLs get a real HTTP 404 before rendering
// starts (once a dynamic page streams, Next can only send 200 + noindex).
// The proxy runs as its own function, so nothing else can reset this cache: refresh on a 30 s TTL,
// and on a miss re-check at most every 5 s so newly published content is reachable within seconds.
// ponytail: per-instance cache; content unpublished in the admin can still pass for ≤30 s (it then 404s via render).
const TTL_MS = 30_000;
const MISS_REFRESH_MS = 5_000;
let cache: { paths: Set<string>; at: number } | null = null;

async function slugsOf(model: typeof Category | typeof Tag | typeof User, ids: unknown[], extra: Record<string, unknown> = {}) {
  const docs = (await (model as typeof Category).find({ _id: { $in: ids }, slug: { $type: 'string' }, ...extra }, { slug: 1 }).lean()) as { slug: string }[];
  return docs.map((d) => d.slug);
}

async function refresh() {
  await connectDB();
  const visible = PUBLIC_FILTER();
  const [posts, cats, tags, authors] = await Promise.all([
    Blog.distinct('slug', visible).exec() as Promise<string[]>,
    Blog.distinct('category', visible),
    Blog.distinct('tags', visible),
    Blog.distinct('author', visible),
  ]);
  const paths = new Set<string>([
    ...posts.map((s) => `/blog/${s}`),
    ...(await slugsOf(Category, cats)).map((s) => `/blog/category/${s}`),
    ...(await slugsOf(Tag, tags)).map((s) => `/blog/tag/${s}`),
    ...(await slugsOf(User, authors, { active: { $ne: false } })).map((s) => `/authors/${s}`),
  ]);
  cache = { paths, at: Date.now() };
  return cache;
}

// A post published since the index was loaded: one indexed lookup, so it never 404s
// right after publishing (when IndexNow has just told Bing about it).
async function justPublished(pathname: string): Promise<boolean> {
  const post = /^\/blog\/([a-z0-9-]+)$/.exec(pathname)?.[1];
  return post ? Boolean(await Blog.exists({ slug: post, ...PUBLIC_FILTER() })) : false;
}

export async function isKnownPath(pathname: string): Promise<boolean> {
  // Site pages ship in the build: answer them without the database (bot probes, cold starts).
  if (!/^\/(blog|authors)\//.test(pathname)) return pathname !== '/home' && PAGE_SLUGS.has(pathname.slice(1));
  let c = cache && Date.now() - cache.at <= TTL_MS ? cache : await refresh();
  if (c.paths.has(pathname)) return true;
  if (Date.now() - c.at > MISS_REFRESH_MS) c = await refresh();
  else if (await justPublished(pathname)) return true;
  return c.paths.has(pathname);
}
