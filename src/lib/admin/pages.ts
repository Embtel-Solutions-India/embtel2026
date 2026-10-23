import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { audit } from '@/lib/audit';
import { BlockSchema, type Block } from '@/lib/content/blocks';
import { LinkSchema } from '@/lib/content/links';
import { connectDB } from '@/lib/db/connect';
import { PageModel } from '@/lib/db/models/Page';
import type { UserDoc } from '@/lib/db/models/User';
import { pingIndexNowPaths } from '@/lib/seo/indexnow';
import { UserFacingError, userCan } from './action';
import { ImageUrlSchema, ObjectIdSchema } from './post-schema';
import { refreshContent } from './revalidate';

// Pages are edited through plain fields (owner decision: no block editor). Only the title, SEO, the first
// hero's texts/buttons and FAQ items are editable; every other block value is kept exactly as imported.
const pagePath = (slug: string) => (slug === 'home' ? '/' : `/${slug}`);
const STALE = 'This page was changed by someone else. Reload to see the latest version.';
const HeroFields = z.object({
  badge: z.string().trim().max(200).default(''),
  heading: z.string().trim().min(1, 'The heading is required').max(2000),
  lead: z.string().trim().max(5000).default(''),
  buttons: z.array(LinkSchema).max(4).default([]),
});
const FaqFields = z.object({ index: z.number().int().min(0), items: z.array(z.object({ q: z.string().trim().min(1).max(500), a: z.string().trim().min(1).max(5000) })).min(1).max(30) });

export const PageFieldsSchema = z.object({
  id: ObjectIdSchema,
  expectedUpdatedAt: z.string(),
  title: z.string().trim().min(1).max(200),
  status: z.enum(['draft', 'published']).optional(),
  locked: z.boolean().optional(),
  seo: z.object({ metaTitle: z.string().trim().max(200).default(''), metaDescription: z.string().trim().max(400).default(''), ogImage: ImageUrlSchema.default(''), noindex: z.boolean().default(false) }).optional(),
  hero: HeroFields.optional(),
  faqs: z.array(FaqFields).max(10).optional(),
});
export type PageFieldsInput = z.input<typeof PageFieldsSchema>;

export type PageFields = {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: 'draft' | 'published';
  locked: boolean;
  seo: { metaTitle: string; metaDescription: string; ogImage: string; noindex: boolean };
  hero: z.infer<typeof HeroFields> | null;
  faqs: { index: number; title: string; items: { q: string; a: string }[] }[];
  updatedAt: string;
};

type Raw = Record<string, unknown>;
const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : '');

export async function listPagesAdmin(): Promise<{ id: string; slug: string; title: string; type: string; status: string; locked: boolean; updatedAt: string }[]> {
  await connectDB();
  const docs = await PageModel.find({}, { slug: 1, title: 1, type: 1, status: 1, locked: 1, updatedAt: 1 }).sort({ slug: 1 }).lean<Raw[]>();
  return docs.map((d) => ({ id: String(d._id), slug: String(d.slug), title: String(d.title), type: String(d.type), status: String(d.status), locked: Boolean(d.locked), updatedAt: iso(d.updatedAt) }));
}

export async function getPageFields(id: string): Promise<PageFields | null> {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const d = await PageModel.findById(id).lean<Raw>();
  if (!d) return null;
  const blocks = (d.blocks as Block[]) ?? [];
  const hero = blocks.find((b) => b.type === 'hero') as Extract<Block, { type: 'hero' }> | undefined;
  const seo = (d.seo as Raw) ?? {};
  return {
    id: String(d._id),
    slug: String(d.slug),
    title: String(d.title),
    type: String(d.type),
    status: d.status === 'published' ? 'published' : 'draft',
    locked: Boolean(d.locked),
    seo: { metaTitle: String(seo.metaTitle ?? ''), metaDescription: String(seo.metaDescription ?? ''), ogImage: String(seo.ogImage ?? ''), noindex: Boolean(seo.noindex) },
    hero: hero ? { badge: hero.badge ?? '', heading: hero.heading, lead: hero.lead ?? '', buttons: (hero.buttons ?? []).map((b) => ({ label: b.label, href: b.href })) } : null,
    faqs: blocks.flatMap((b, index) => (b.type === 'faq' ? [{ index, title: b.header?.title ?? 'FAQ', items: b.items.map((i) => ({ q: i.q, a: i.a })) }] : [])),
    updatedAt: iso(d.updatedAt),
  };
}

export async function savePageFields(input: PageFieldsInput, user: UserDoc): Promise<{ updatedAt: string }> {
  const v = PageFieldsSchema.parse(input);
  await connectDB();
  const doc = await PageModel.findById(v.id);
  if (!doc) throw new UserFacingError('This page no longer exists.');
  if (iso(doc.get('updatedAt')) !== v.expectedUpdatedAt) throw new UserFacingError(STALE);
  const admin = userCan(user, 'page.editLocked');
  if (doc.get('locked') && !admin) throw new UserFacingError('This page is locked (it is used by ads). Ask an Admin to change it.');
  const wasPublished = doc.get('status') === 'published';
  if ((v.status !== undefined && v.status !== doc.get('status')) || (v.locked !== undefined && v.locked !== Boolean(doc.get('locked')))) {
    if (!userCan(user, 'page.publish')) throw new UserFacingError('Only an Admin can publish, unpublish or lock pages.');
  }

  const blocks = JSON.parse(JSON.stringify(doc.get('blocks') ?? [])) as Block[]; // plain copy (Mongoose arrays don't clone)
  if (v.hero) {
    const i = blocks.findIndex((b) => b.type === 'hero');
    if (i < 0) throw new UserFacingError('This page has no hero section.');
    const h = blocks[i] as Extract<Block, { type: 'hero' }>;
    const prev = h.buttons ?? [];
    blocks[i] = { ...h, badge: v.hero.badge || undefined, heading: v.hero.heading, lead: v.hero.lead || undefined, buttons: v.hero.buttons.map((b, n) => ({ ...prev[n], ...b })) };
  }
  for (const f of v.faqs ?? []) {
    const b = blocks[f.index];
    if (b?.type !== 'faq') throw new UserFacingError('That FAQ section no longer exists. Reload the page.');
    blocks[f.index] = { ...b, items: f.items };
  }
  // Every block must still satisfy the public renderer's schema.
  const checked = z.array(BlockSchema).safeParse(blocks);
  if (!checked.success) throw new UserFacingError(`Check the page fields: ${checked.error.issues[0].message}`);

  doc.set({ title: v.title, blocks: checked.data, updatedBy: user._id });
  if (v.seo) doc.set({ seo: { ...v.seo, metaTitle: v.seo.metaTitle || undefined, metaDescription: v.seo.metaDescription || undefined, ogImage: v.seo.ogImage || undefined } });
  if (v.status !== undefined) {
    doc.set('status', v.status);
    if (v.status === 'published' && !doc.get('publishedAt')) doc.set('publishedAt', new Date());
  }
  if (v.locked !== undefined) doc.set('locked', v.locked);
  doc.$where = { updatedAt: doc.get('updatedAt') };
  try {
    await doc.save();
  } catch (e) {
    if (e instanceof Error && e.name === 'DocumentNotFoundError') throw new UserFacingError(STALE);
    throw e;
  }
  const slug = String(doc.get('slug'));
  await audit({ actorId: String(user._id), action: 'page.update', target: { type: 'page', id: v.id }, meta: { slug, status: doc.get('status') } });
  refreshContent({ pages: [slug] });
  if (wasPublished || doc.get('status') === 'published') void pingIndexNowPaths([pagePath(slug)]);
  return { updatedAt: iso(doc.get('updatedAt')) };
}
