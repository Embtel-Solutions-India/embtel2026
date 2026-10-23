import { isValidObjectId, type Model } from 'mongoose';
import { z } from 'zod';
import { audit } from '@/lib/audit';
import { connectDB } from '@/lib/db/connect';
import { Blog } from '@/lib/db/models/Blog';
import { Category } from '@/lib/db/models/Category';
import { PageModel } from '@/lib/db/models/Page';
import { Tag } from '@/lib/db/models/Tag';
import type { UserDoc } from '@/lib/db/models/User';
import { toSlug } from '@/lib/slug';
import { UserFacingError } from './action';
import { ObjectIdSchema, SlugSchema } from './post-schema';
import { refreshContent } from './revalidate';

export const CategoryInputSchema = z.object({
  id: ObjectIdSchema.optional(),
  name: z.string().trim().min(1, 'Name is required').max(80),
  slug: z.union([SlugSchema, z.literal('')]).optional(),
  description: z.string().trim().max(300).default(''),
});
export const TagInputSchema = z.object({
  id: ObjectIdSchema.optional(),
  name: z.string().trim().min(1, 'Name is required').max(50),
  slug: z.union([SlugSchema, z.literal('')]).optional(),
  serviceSlug: z.union([SlugSchema, z.literal('')]).default(''),
});

type Kind = 'category' | 'tag';
type Raw = Record<string, unknown>;
const CASE_INSENSITIVE = { locale: 'en', strength: 2 };
const model = (kind: Kind) => (kind === 'category' ? Category : Tag) as unknown as Model<Raw>;
const field = (kind: Kind) => (kind === 'category' ? 'category' : 'tags');
const label = (kind: Kind) => (kind === 'category' ? 'category' : 'tag');

// Service pages a tag can point at ("related services" on posts).
export async function serviceOptions(): Promise<{ slug: string; title: string }[]> {
  await connectDB();
  const pages = await PageModel.find({ status: 'published', type: { $in: ['service', 'landing'] } }, { slug: 1, title: 1 }).sort({ title: 1 }).lean<Raw[]>();
  return pages.map((p) => ({ slug: String(p.slug), title: String(p.title) }));
}

async function save(kind: Kind, input: { id?: string; name: string; slug?: string } & Raw, extra: Raw, user: UserDoc) {
  await connectDB();
  const M = model(kind);
  const existing = input.id ? await M.findById(input.id) : null;
  if (input.id && !existing) throw new UserFacingError(`This ${label(kind)} no longer exists.`);
  const notSelf = existing ? { _id: { $ne: existing._id } } : {};
  if (await M.exists({ name: input.name, ...notSelf }).collation(CASE_INSENSITIVE)) {
    throw new UserFacingError(`A ${label(kind)} named “${input.name}” already exists.`);
  }
  const slug = input.slug || (existing ? String(existing.get('slug')) : toSlug(input.name)) || label(kind);
  if (await M.exists({ slug, ...notSelf })) throw new UserFacingError(`The slug “${slug}” is already used by another ${label(kind)}.`);
  const doc = existing ?? new M();
  doc.set({ name: input.name, slug, ...extra });
  await doc.save();
  await audit({ actorId: String(user._id), action: `${kind}.${existing ? 'update' : 'create'}`, target: { type: kind, id: String(doc._id) }, meta: { slug } });
  refreshContent({ taxonomy: true, allPosts: true }); // post pages show category/tag names
  return { id: String(doc._id), slug };
}

async function remove(kind: Kind, id: string, user: UserDoc) {
  if (!isValidObjectId(id)) throw new UserFacingError(`This ${label(kind)} no longer exists.`);
  await connectDB();
  const doc = await model(kind).findById(id);
  if (!doc) throw new UserFacingError(`This ${label(kind)} no longer exists.`);
  const used = await Blog.countDocuments({ [field(kind)]: doc._id, isDeleted: { $ne: true } });
  if (used) throw new UserFacingError(`Used by ${used} post${used === 1 ? '' : 's'}. Move them to another ${label(kind)} first.`);
  // Only trashed posts can still point at it; drop those references so a restore doesn't show a ghost.
  if (kind === 'category') await Blog.updateMany({ category: doc._id }, { $unset: { category: 1 } });
  else await Blog.updateMany({ tags: doc._id }, { $pull: { tags: doc._id } });
  await doc.deleteOne();
  await audit({ actorId: String(user._id), action: `${kind}.delete`, target: { type: kind, id }, meta: { slug: doc.get('slug'), name: doc.get('name') } });
  refreshContent({ taxonomy: true, allPosts: true });
}

export function saveCategory(input: z.input<typeof CategoryInputSchema>, user: UserDoc) {
  const v = CategoryInputSchema.parse(input);
  return save('category', v, { description: v.description }, user);
}

export async function saveTag(input: z.input<typeof TagInputSchema>, user: UserDoc) {
  const v = TagInputSchema.parse(input);
  if (v.serviceSlug && !(await serviceOptions()).some((o) => o.slug === v.serviceSlug)) {
    throw new UserFacingError('Related service must be a published service page.');
  }
  return save('tag', v, { serviceSlug: v.serviceSlug }, user);
}

export const deleteCategory = (id: string, user: UserDoc) => remove('category', id, user);
export const deleteTag = (id: string, user: UserDoc) => remove('tag', id, user);

export type TaxonomyRow = { id: string; name: string; slug: string; description: string; serviceSlug: string; posts: number };

export async function listTaxonomyAdmin(kind: Kind): Promise<TaxonomyRow[]> {
  await connectDB();
  const [docs, counts] = await Promise.all([
    model(kind).find({}).sort({ name: 1 }).lean<Raw[]>(),
    Blog.aggregate<{ _id: unknown; n: number }>([
      { $match: { isDeleted: { $ne: true } } },
      ...(kind === 'tag' ? [{ $unwind: '$tags' }] : []),
      { $group: { _id: `$${field(kind)}`, n: { $sum: 1 } } },
    ]),
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));
  return docs.map((d) => ({
    id: String(d._id),
    name: String(d.name),
    slug: String(d.slug),
    description: String(d.description ?? ''),
    serviceSlug: String(d.serviceSlug ?? ''),
    posts: byId.get(String(d._id)) ?? 0,
  }));
}
