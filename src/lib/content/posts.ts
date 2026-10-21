import { cacheLife, cacheTag } from 'next/cache';
import { Types, type PipelineStage } from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import { Blog } from '@/lib/db/models/Blog';
import { Category } from '@/lib/db/models/Category';
import { Tag } from '@/lib/db/models/Tag';
import { User } from '@/lib/db/models/User';

export const POSTS_TAG = 'posts';
export const TAXONOMY_TAG = 'taxonomy';
export const postTag = (slug: string) => `post:${slug}`;

const ORG_NAME = 'Embtel Solutions';
const PER_PAGE = 9;
const SAFE_IMAGE = /^(\/(?!\/)|https:\/\/)/;

export type PostCard = {
  slug: string;
  title: string;
  shortDescription: string;
  featuredImage: string | null;
  imageAltText: string;
  category: { name: string; slug: string } | null;
  readingTime: number;
  publishedAt: string;
};
export type PostAuthor = { name: string; slug: string | null; jobTitle: string; bio: string; avatar: string; sameAs: string[]; expertise: string[] };
export type PublicPost = PostCard & {
  id: string;
  content: string;
  tags: { name: string; slug: string; serviceSlug: string }[];
  author: PostAuthor;
  faqs: { q: string; a: string }[];
  keyTakeaways: string[];
  sources: { title: string; url: string }[];
  focusKeyword: string;
  secondaryKeywords: string[];
  seo: { metaTitle?: string; metaDescription?: string; canonicalUrl?: string; ogImage?: string; keywords: string[]; noindex: boolean };
  updatedAt: string;
  lastReviewedAt: string | null;
};
export type PostPage = { items: PostCard[]; page: number; pages: number; total: number };
export type ListOptions = { page?: number; perPage?: number; category?: string; tag?: string; authorSlug?: string; q?: string };
type Term = { name: string; slug: string; description?: string };

// A post is public only when published, already due, and not soft-deleted.
export const PUBLIC_FILTER = (now = new Date()) => ({ status: 'published', publishedAt: { $lte: now }, isDeleted: { $ne: true } });

const AUTHOR_FIELDS = 'name slug bio jobTitle avatar sameAs expertise';
const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : new Date(0).toISOString());
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const opt = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
type Raw = Record<string, unknown>;

function toCard(d: Raw): PostCard {
  const c = d.category as Raw | null | undefined;
  const img = str(d.featuredImage);
  return {
    slug: str(d.slug),
    title: str(d.title),
    shortDescription: str(d.shortDescription),
    featuredImage: SAFE_IMAGE.test(img) ? img : null,
    imageAltText: str(d.imageAltText),
    category: c && c.slug ? { name: str(c.name), slug: str(c.slug) } : null,
    readingTime: typeof d.readingTime === 'number' ? d.readingTime : 1,
    publishedAt: iso(d.publishedAt),
  };
}

function toAuthor(d: Raw): PostAuthor {
  const u = d.author as Raw | null | undefined;
  if (u && u.name) {
    return {
      name: str(u.name),
      slug: opt(u.slug) ?? null,
      jobTitle: str(u.jobTitle),
      bio: str(u.bio),
      avatar: SAFE_IMAGE.test(str(u.avatar)) ? str(u.avatar) : '',
      sameAs: Array.isArray(u.sameAs) ? (u.sameAs as string[]).filter((x) => /^https:\/\//.test(x)) : [],
      expertise: Array.isArray(u.expertise) ? (u.expertise as string[]) : [],
    };
  }
  return { name: str(d.authorName) || ORG_NAME, slug: null, jobTitle: '', bio: '', avatar: '', sameAs: [], expertise: [] };
}

function toPost(d: Raw): PublicPost {
  const seo = (d.seo ?? {}) as Raw;
  return {
    ...toCard(d),
    id: String(d._id),
    content: str(d.content),
    tags: ((d.tags as Raw[] | undefined) ?? []).filter((t) => t && t.slug).map((t) => ({ name: str(t.name), slug: str(t.slug), serviceSlug: str(t.serviceSlug) })),
    author: toAuthor(d),
    faqs: ((d.faqs as Raw[] | undefined) ?? []).map((f) => ({ q: str(f.q), a: str(f.a) })),
    keyTakeaways: (d.keyTakeaways as string[] | undefined) ?? [],
    sources: ((d.sources as Raw[] | undefined) ?? []).filter((s) => /^https:\/\//.test(str(s.url))).map((s) => ({ title: str(s.title), url: str(s.url) })),
    focusKeyword: str(d.focusKeyword),
    secondaryKeywords: (d.secondaryKeywords as string[] | undefined) ?? [],
    seo: {
      metaTitle: opt(seo.metaTitle),
      metaDescription: opt(seo.metaDescription),
      canonicalUrl: opt(seo.canonicalUrl),
      ogImage: SAFE_IMAGE.test(str(seo.ogImage)) ? str(seo.ogImage) : undefined,
      keywords: (seo.keywords as string[] | undefined) ?? [],
      noindex: Boolean(seo.noindex),
    },
    updatedAt: iso(d.updatedAt),
    lastReviewedAt: d.lastReviewedAt instanceof Date ? d.lastReviewedAt.toISOString() : null,
  };
}

async function idBySlug(model: typeof Category | typeof Tag | typeof User, slug: string): Promise<Types.ObjectId | null> {
  const doc = (await (model as typeof Category).findOne({ slug }, { _id: 1 }).lean()) as { _id: Types.ObjectId } | null;
  return doc?._id ?? null;
}

// ── uncached loaders (tests call these) ────────────────────────────────────

export async function loadPost(slug: string): Promise<PublicPost | null> {
  await connectDB();
  const d = (await Blog.findOne({ slug, ...PUBLIC_FILTER() })
    .populate('category', 'name slug')
    .populate('tags', 'name slug serviceSlug')
    .populate('author', AUTHOR_FIELDS)
    .lean()) as Raw | null;
  return d ? toPost(d) : null;
}

export async function loadPosts(opts: ListOptions = {}): Promise<PostPage> {
  await connectDB();
  const perPage = opts.perPage ?? PER_PAGE;
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const filter: Raw = PUBLIC_FILTER();
  const empty = { items: [], page, pages: 0, total: 0 };
  if (opts.category) {
    const id = await idBySlug(Category, opts.category);
    if (!id) return empty;
    filter.category = id;
  }
  if (opts.tag) {
    const id = await idBySlug(Tag, opts.tag);
    if (!id) return empty;
    filter.tags = id;
  }
  if (opts.authorSlug) {
    const id = await idBySlug(User, opts.authorSlug);
    if (!id) return empty;
    filter.author = id;
  }
  const q = opts.q?.trim().slice(0, 200);
  if (q) filter.$text = { $search: q }; // operator-free: Mongo treats the string as search terms only

  const [docs, total] = await Promise.all([
    Blog.find(filter).sort({ pinned: -1, publishedAt: -1 }).skip((page - 1) * perPage).limit(perPage).populate('category', 'name slug').lean(),
    Blog.countDocuments(filter),
  ]);
  return { items: (docs as Raw[]).map(toCard), page, pages: Math.ceil(total / perPage), total };
}

export async function loadRelated(post: PublicPost, n = 3): Promise<PostCard[]> {
  await connectDB();
  const self = await Blog.findOne({ slug: post.slug }, { category: 1, tags: 1 }).lean();
  if (!self) return [];
  const tagIds = ((self.tags ?? []) as Types.ObjectId[]).map(String);
  const candidates = (await Blog.find({ ...PUBLIC_FILTER(), slug: { $ne: post.slug } })
    .sort({ publishedAt: -1 })
    .limit(200)
    .populate('category', 'name slug')
    .lean()) as Raw[];
  const score = (d: Raw) => {
    const cat = d.category as Raw | null;
    const same = self.category && cat?._id && String(cat._id) === String(self.category) ? 100 : 0;
    const shared = ((d.tags as Types.ObjectId[] | undefined) ?? []).filter((t) => tagIds.includes(String(t))).length * 10;
    return same + shared;
  };
  // ponytail: scores the 200 newest public posts in memory; move to an aggregation if the blog grows past that.
  return candidates
    .map((d, i) => ({ d, s: score(d), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, n)
    .map(({ d }) => toCard(d));
}

async function publicCount(field: 'category' | 'tags' | 'author', id: Types.ObjectId) {
  return Blog.countDocuments({ ...PUBLIC_FILTER(), [field]: id });
}

export async function loadCategory(slug: string): Promise<Term | null> {
  await connectDB();
  const c = (await Category.findOne({ slug }).lean()) as Raw | null;
  if (!c || !(await publicCount('category', c._id as Types.ObjectId))) return null;
  return { name: str(c.name), slug: str(c.slug), description: opt(c.description) };
}

export async function loadTag(slug: string): Promise<Term | null> {
  await connectDB();
  const t = (await Tag.findOne({ slug }).lean()) as Raw | null;
  if (!t || !(await publicCount('tags', t._id as Types.ObjectId))) return null;
  return { name: str(t.name), slug: str(t.slug) };
}

export async function loadAuthor(slug: string): Promise<PostAuthor | null> {
  await connectDB();
  const u = (await User.findOne({ slug, active: { $ne: false } }, AUTHOR_FIELDS).lean()) as Raw | null;
  if (!u || !(await publicCount('author', u._id as Types.ObjectId))) return null;
  return toAuthor({ author: u });
}

export async function loadTaxonomy(): Promise<{ categories: (Term & { count: number })[]; tags: (Term & { count: number })[] }> {
  await connectDB();
  const count = async (field: '$category' | '$tags', model: typeof Category | typeof Tag) => {
    const pipeline: PipelineStage[] = [{ $match: PUBLIC_FILTER() }];
    if (field === '$tags') pipeline.push({ $unwind: '$tags' });
    pipeline.push({ $group: { _id: field, count: { $sum: 1 } } });
    const counts = (await Blog.aggregate(pipeline)) as { _id: Types.ObjectId | null; count: number }[];
    const terms = (await (model as typeof Category).find({ _id: { $in: counts.map((c) => c._id).filter(Boolean) } }).lean()) as Raw[];
    return terms
      .map((t) => ({ name: str(t.name), slug: str(t.slug), count: counts.find((c) => String(c._id) === String(t._id))?.count ?? 0 }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };
  const [categories, tags] = await Promise.all([count('$category', Category), count('$tags', Tag)]);
  return { categories, tags };
}

// ── cached wrappers (decision A: per-request render, cached reads) ─────────

export async function getPublishedPost(slug: string) {
  'use cache';
  cacheTag(postTag(slug), POSTS_TAG);
  cacheLife('max');
  return loadPost(slug);
}

export async function listPublishedPosts(opts: ListOptions = {}) {
  'use cache';
  cacheTag(POSTS_TAG);
  cacheLife('max');
  return loadPosts(opts);
}

export async function getRelatedPosts(post: PublicPost, n = 3) {
  'use cache';
  cacheTag(POSTS_TAG);
  cacheLife('max');
  return loadRelated(post, n);
}

export async function getCategory(slug: string) {
  'use cache';
  cacheTag(TAXONOMY_TAG, POSTS_TAG);
  cacheLife('max');
  return loadCategory(slug);
}

export async function getTag(slug: string) {
  'use cache';
  cacheTag(TAXONOMY_TAG, POSTS_TAG);
  cacheLife('max');
  return loadTag(slug);
}

export async function getAuthor(slug: string) {
  'use cache';
  cacheTag(POSTS_TAG);
  cacheLife('max');
  return loadAuthor(slug);
}

export async function listTaxonomy() {
  'use cache';
  cacheTag(TAXONOMY_TAG, POSTS_TAG);
  cacheLife('max');
  return loadTaxonomy();
}
