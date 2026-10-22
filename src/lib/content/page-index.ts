import { connectDB } from '@/lib/db/connect';
import { Blog } from '@/lib/db/models/Blog';
import { Category } from '@/lib/db/models/Category';
import { PageModel } from '@/lib/db/models/Page';
import { Tag } from '@/lib/db/models/Tag';
import { User } from '@/lib/db/models/User';
import { PUBLIC_FILTER } from './visibility';

// Index of every public CMS path for the proxy, so unknown URLs get a real HTTP 404 before rendering
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
  const [pages, posts, cats, tags, authors] = await Promise.all([
    PageModel.distinct('slug', { status: 'published' }).exec() as Promise<string[]>,
    Blog.distinct('slug', visible).exec() as Promise<string[]>,
    Blog.distinct('category', visible),
    Blog.distinct('tags', visible),
    Blog.distinct('author', visible),
  ]);
  const paths = new Set<string>([
    ...pages.filter((s) => s !== 'home').map((s) => `/${s}`), // home lives at `/`
    ...posts.map((s) => `/blog/${s}`),
    ...(await slugsOf(Category, cats)).map((s) => `/blog/category/${s}`),
    ...(await slugsOf(Tag, tags)).map((s) => `/blog/tag/${s}`),
    ...(await slugsOf(User, authors, { active: { $ne: false } })).map((s) => `/authors/${s}`),
  ]);
  cache = { paths, at: Date.now() };
  return cache;
}

export async function isKnownPath(pathname: string): Promise<boolean> {
  let c = cache && Date.now() - cache.at <= TTL_MS ? cache : await refresh();
  if (!c.paths.has(pathname) && Date.now() - c.at > MISS_REFRESH_MS) c = await refresh();
  return c.paths.has(pathname);
}
