import { isValidObjectId, type Types } from 'mongoose';
import { audit } from '@/lib/audit';
import { connectDB } from '@/lib/db/connect';
import { Blog } from '@/lib/db/models/Blog';
import { Category } from '@/lib/db/models/Category';
import { Tag } from '@/lib/db/models/Tag';
import { User } from '@/lib/db/models/User';
import type { UserDoc } from '@/lib/db/models/User';
import { sanitizeRichHtml } from '@/lib/content/sanitize';
import { pingIndexNowPaths } from '@/lib/seo/indexnow';
import { toSlug } from '@/lib/slug';
import { UserFacingError } from './action';
import type { PostInput } from './post-schema';
import { refreshContent } from './revalidate';

export { PostInputSchema, type PostInput } from './post-schema';

const PER_PAGE = 20;
const STALE = 'This post was changed by someone else. Reload to see the latest version.';
const WITH_TRASH = { includeDeleted: true };
type Raw = Record<string, unknown>;
type BlogLike = { status?: string | null; isDeleted?: boolean | null; publishedAt?: Date | null };

const isPublic = (p: BlogLike, now = new Date()) => p.status === 'published' && !p.isDeleted && !!p.publishedAt && p.publishedAt <= now;
const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : null);
const isAdmin = (u: UserDoc) => u.role === 'admin';

export function readingTime(html: string): number {
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 225));
}

async function slugTaken(slug: string, exceptId?: unknown) {
  return Boolean(await Blog.exists({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }).setOptions(WITH_TRASH));
}

async function freeSlug(base: string, exceptId?: unknown) {
  const root = base || 'post';
  let slug = root;
  for (let n = 2; await slugTaken(slug, exceptId); n++) slug = `${root}-${n}`;
  return slug;
}

// Public caches + IndexNow, only when the change is visible (or was) on the public site.
function publicChanged(slug: string, before: boolean, after: boolean) {
  if (!before && !after) return;
  refreshContent({ posts: [slug], taxonomy: true });
  void pingIndexNowPaths([`/blog/${slug}`]);
}

async function load(id: string) {
  if (!isValidObjectId(id)) throw new UserFacingError('This post no longer exists.');
  const doc = await Blog.findById(id).setOptions(WITH_TRASH);
  if (!doc) throw new UserFacingError('This post no longer exists.');
  return doc;
}

export async function savePost(input: PostInput, user: UserDoc): Promise<{ id: string; slug: string; updatedAt: string; status: string; publishedAt: string | null }> {
  await connectDB();
  const now = new Date();
  const existing = input.id ? await load(input.id) : null;
  // updatedAt is the version (also enforced atomically on the write below).
  if (existing && iso(existing.updatedAt) !== input.expectedUpdatedAt) throw new UserFacingError(STALE);

  const keepsAuthor = existing && String(existing.author ?? '') === (input.authorId ?? '');
  if (!isAdmin(user) && input.authorId && input.authorId !== String(user._id) && !keepsAuthor) {
    throw new UserFacingError('You can only credit yourself as the author.');
  }

  let slug: string;
  if (existing) {
    slug = input.slug || existing.slug;
    if (slug !== existing.slug) {
      if (existing.publishedAt) throw new UserFacingError('A published post keeps its address (URL), so its slug can’t be changed.');
      if (await slugTaken(slug, existing._id)) throw new UserFacingError('Another post already uses this slug.');
    }
  } else if (input.slug) {
    if (await slugTaken(input.slug)) throw new UserFacingError('Another post already uses this slug.');
    slug = input.slug;
  } else {
    slug = await freeSlug(toSlug(input.title));
  }

  const before = existing ? isPublic(existing, now) : false;
  const doc = existing ?? new Blog();
  let status = input.status;
  let scheduledAt: Date | undefined;
  if (status === 'scheduled') {
    scheduledAt = new Date(input.scheduledAt!);
    if (scheduledAt <= now) {
      status = 'published';
      scheduledAt = undefined;
    }
  }
  const content = sanitizeRichHtml(input.content, { images: true }).html;
  doc.set({
    title: input.title,
    slug,
    shortDescription: input.shortDescription,
    content,
    readingTime: readingTime(content),
    featuredImage: input.featuredImage,
    imageAltText: input.imageAltText,
    category: input.category ?? undefined,
    tags: input.tags,
    author: input.authorId ?? undefined,
    authorName: input.authorName,
    status,
    scheduledAt,
    pinned: input.pinned,
    faqs: input.faqs,
    keyTakeaways: input.keyTakeaways,
    sources: input.sources,
    focusKeyword: input.focusKeyword,
    secondaryKeywords: input.secondaryKeywords,
    seo: { ...input.seo, schemaJson: existing?.seo?.schemaJson ?? '' },
    lastReviewedAt: input.lastReviewedAt ? new Date(`${input.lastReviewedAt}T00:00:00Z`) : undefined,
  });
  if (status === 'published' && !doc.publishedAt) doc.publishedAt = now;
  // The version check above is only a fast path: the write itself only matches the version the editor
  // loaded, so a save that landed in between (another editor, the legacy admin) is never overwritten.
  if (existing) doc.$where = { updatedAt: existing.updatedAt };
  try {
    await doc.save();
  } catch (e) {
    if (e instanceof Error && e.name === 'DocumentNotFoundError') throw new UserFacingError(STALE);
    throw e;
  }

  await audit({
    actorId: String(user._id),
    action: existing ? 'post.update' : 'post.create',
    target: { type: 'post', id: String(doc._id) },
    meta: { slug, status },
  });
  publicChanged(slug, before, isPublic(doc, now));
  return { id: String(doc._id), slug, updatedAt: iso(doc.updatedAt)!, status, publishedAt: iso(doc.publishedAt) };
}

export async function trashPost(id: string, user: UserDoc): Promise<void> {
  await connectDB();
  const doc = await load(id);
  const before = isPublic(doc);
  doc.set({ isDeleted: true, deletedAt: new Date() });
  await doc.save();
  await audit({ actorId: String(user._id), action: 'post.trash', target: { type: 'post', id }, meta: { slug: doc.slug } });
  publicChanged(doc.slug, before, false);
}

export async function restorePost(id: string, user: UserDoc): Promise<void> {
  await connectDB();
  const doc = await load(id);
  doc.set({ isDeleted: false, deletedAt: undefined });
  await doc.save();
  await audit({ actorId: String(user._id), action: 'post.restore', target: { type: 'post', id }, meta: { slug: doc.slug } });
  publicChanged(doc.slug, false, isPublic(doc));
}

export async function duplicatePost(id: string, user: UserDoc): Promise<{ id: string }> {
  await connectDB();
  const src = (await load(id)).toObject() as Raw;
  const title = `${src.title} (copy)`;
  const copy = await Blog.create({
    ...src,
    _id: undefined,
    title,
    slug: await freeSlug(toSlug(title)),
    status: 'draft',
    publishedAt: undefined,
    scheduledAt: undefined,
    isDeleted: false,
    deletedAt: undefined,
    views: 0,
    createdAt: undefined,
    updatedAt: undefined,
  });
  await audit({ actorId: String(user._id), action: 'post.duplicate', target: { type: 'post', id: String(copy._id) }, meta: { from: id } });
  return { id: String(copy._id) };
}

export async function deletePostPermanently(id: string, user: UserDoc): Promise<void> {
  await connectDB();
  const doc = await load(id);
  if (!doc.isDeleted) throw new UserFacingError('Move the post to the trash first.');
  await Blog.deleteOne({ _id: doc._id }).setOptions(WITH_TRASH);
  await audit({ actorId: String(user._id), action: 'post.delete', target: { type: 'post', id }, meta: { slug: doc.slug, title: doc.title } });
}

export type AdminPostRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  author: string;
  category: string;
  publishedAt: string | null;
  scheduledAt: string | null;
  updatedAt: string | null;
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function listAdminPosts(opts: {
  status?: 'published' | 'scheduled' | 'draft' | 'trash';
  q?: string;
  category?: string;
  authorId?: string;
  page?: number;
}): Promise<{ items: AdminPostRow[]; page: number; pages: number; total: number }> {
  await connectDB();
  const filter: Raw = opts.status === 'trash' ? { isDeleted: true } : { isDeleted: { $ne: true }, ...(opts.status && { status: opts.status }) };
  if (opts.q?.trim()) filter.title = { $regex: escapeRegex(opts.q.trim().slice(0, 100)), $options: 'i' };
  if (opts.category && isValidObjectId(opts.category)) filter.category = opts.category;
  if (opts.authorId && isValidObjectId(opts.authorId)) filter.author = opts.authorId;
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const [total, docs] = await Promise.all([
    Blog.countDocuments(filter),
    Blog.find(filter, { title: 1, slug: 1, status: 1, author: 1, authorName: 1, category: 1, publishedAt: 1, scheduledAt: 1, updatedAt: 1 })
      .setOptions(WITH_TRASH)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .populate('author', 'name')
      .populate('category', 'name')
      .lean<Raw[]>(),
  ]);
  return {
    page,
    pages: Math.ceil(total / PER_PAGE),
    total,
    items: docs.map((d) => ({
      id: String(d._id),
      title: String(d.title),
      slug: String(d.slug),
      status: String(d.status ?? 'draft'),
      author: String((d.author as Raw | null)?.name ?? (d.authorName || '—')),
      category: String((d.category as Raw | null)?.name ?? '—'),
      publishedAt: iso(d.publishedAt),
      scheduledAt: iso(d.scheduledAt),
      updatedAt: iso(d.updatedAt),
    })),
  };
}

export type AdminPost = Omit<PostInput, 'expectedUpdatedAt' | 'scheduledAt'> & {
  id: string;
  slug: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  isDeleted: boolean;
};

export async function getAdminPost(id: string): Promise<AdminPost | null> {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const d = await Blog.findById(id).setOptions(WITH_TRASH).lean<Raw>();
  if (!d) return null;
  const seo = (d.seo ?? {}) as Raw;
  const ids = (v: unknown) => ((v as Types.ObjectId[] | undefined) ?? []).map(String);
  const strs = (v: unknown) => ((v as string[] | undefined) ?? []).map(String);
  return {
    id: String(d._id),
    title: String(d.title ?? ''),
    slug: String(d.slug ?? ''),
    shortDescription: String(d.shortDescription ?? ''),
    content: String(d.content ?? ''),
    featuredImage: String(d.featuredImage ?? ''),
    imageAltText: String(d.imageAltText ?? ''),
    category: d.category ? String(d.category) : null,
    tags: ids(d.tags),
    authorId: d.author ? String(d.author) : null,
    authorName: String(d.authorName ?? ''),
    status: (d.status as AdminPost['status']) ?? 'draft',
    scheduledAt: iso(d.scheduledAt),
    publishedAt: iso(d.publishedAt),
    pinned: Boolean(d.pinned),
    faqs: ((d.faqs as Raw[] | undefined) ?? []).map((f) => ({ q: String(f.q), a: String(f.a) })),
    keyTakeaways: strs(d.keyTakeaways),
    sources: ((d.sources as Raw[] | undefined) ?? []).map((s) => ({ title: String(s.title), url: String(s.url) })),
    focusKeyword: String(d.focusKeyword ?? ''),
    secondaryKeywords: strs(d.secondaryKeywords),
    seo: {
      metaTitle: String(seo.metaTitle ?? ''),
      metaDescription: String(seo.metaDescription ?? ''),
      keywords: strs(seo.keywords),
      canonicalUrl: String(seo.canonicalUrl ?? ''),
      ogImage: String(seo.ogImage ?? ''),
      noindex: Boolean(seo.noindex),
    },
    lastReviewedAt: d.lastReviewedAt instanceof Date ? d.lastReviewedAt.toISOString().slice(0, 10) : null,
    updatedAt: iso(d.updatedAt) ?? new Date(0).toISOString(),
    isDeleted: Boolean(d.isDeleted),
  };
}

export type Option = { id: string; name: string };

// Select options for the editor. Marketing users can only credit themselves.
export async function loadPostOptions(user: UserDoc): Promise<{ categories: Option[]; tags: Option[]; authors: Option[] }> {
  await connectDB();
  const opts = (docs: Raw[]) => docs.map((d) => ({ id: String(d._id), name: String(d.name) }));
  const [categories, tags, authors] = await Promise.all([
    Category.find({}, { name: 1 }).sort({ name: 1 }).lean<Raw[]>(),
    Tag.find({}, { name: 1 }).sort({ name: 1 }).lean<Raw[]>(),
    isAdmin(user) ? User.find({ active: { $ne: false } }, { name: 1 }).sort({ name: 1 }).lean<Raw[]>() : Promise.resolve([{ _id: user._id, name: user.name }]),
  ]);
  return { categories: opts(categories), tags: opts(tags), authors: opts(authors) };
}

// Called by the cron route: scheduled posts whose time has come go live (publishedAt = scheduledAt).
export async function publishDuePosts(now = new Date()): Promise<string[]> {
  await connectDB();
  const due = await Blog.find({ status: 'scheduled', scheduledAt: { $lte: now }, isDeleted: { $ne: true } }, { slug: 1, scheduledAt: 1, author: 1 }).lean<Raw[]>();
  const published: string[] = [];
  for (const d of due) {
    // Conditional update: a concurrent run or an edit in between can't publish twice.
    const r = await Blog.updateOne({ _id: d._id, status: 'scheduled' }, { $set: { status: 'published', publishedAt: d.scheduledAt }, $unset: { scheduledAt: 1 } });
    if (!r.modifiedCount) continue;
    published.push(String(d.slug));
    // The save that scheduled the post is already audited; this records who it went live for.
    if (d.author) await audit({ actorId: String(d.author), action: 'post.autopublish', target: { type: 'post', id: String(d._id) }, meta: { slug: d.slug } });
  }
  if (published.length) {
    refreshContent({ posts: published, taxonomy: true }, 'background');
    await pingIndexNowPaths(published.map((s) => `/blog/${s}`));
  }
  return published;
}
