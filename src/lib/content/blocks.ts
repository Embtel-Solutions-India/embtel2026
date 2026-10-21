import { z } from 'zod';
import { HrefSchema, LinkSchema } from './links';

// Plain text; the only markup is *emphasis* (see inline.tsx).
const Inline = z.string().min(1).max(2000);
const Text = z.string().max(5000);
const ImageSrc = z.string().regex(/^(\/(?!\/)|https:\/\/)/, 'image src must be internal or https');

const ButtonSchema = LinkSchema.extend({ variant: z.enum(['primary', 'ghost']).optional() });
const IconSchema = z
  .discriminatedUnion('kind', [
    z.object({ kind: z.literal('emoji'), value: z.string().min(1).max(16) }),
    z.object({ kind: z.literal('image'), src: ImageSrc, alt: z.string().max(200) }),
  ])
  .nullable()
  .optional();
const HeaderSchema = z
  .object({
    eyebrow: z.string().max(200).optional(),
    title: Inline.optional(),
    subtitle: Text.optional(),
    align: z.enum(['left', 'center']).optional(),
  })
  .optional();
const Stat = z.object({ icon: IconSchema, value: z.string().min(1).max(40), suffix: z.string().max(10).optional(), label: z.string().max(200) });

export const BlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hero'),
    variant: z.enum(['home', 'page', 'simple']),
    badge: z.string().max(200).optional(),
    breadcrumb: z.array(z.object({ label: z.string().min(1), href: HrefSchema.optional() })).optional(),
    heading: Inline,
    lead: Text.optional(),
    buttons: z.array(ButtonSchema).max(4).optional(),
    stats: z.array(Stat).max(8).optional(),
    floatingCards: z.array(z.object({ label: z.string(), sub: z.string().optional(), stat: z.string().optional() })).max(4).optional(),
    meta: z.string().max(200).optional(),
  }),
  z.object({ type: z.literal('marquee'), items: z.array(z.string().min(1).max(100)).min(1).max(50) }),
  z.object({ type: z.literal('stats'), header: HeaderSchema, variant: z.enum(['bar', 'counters']), animate: z.boolean(), items: z.array(Stat).min(1).max(8) }),
  z.object({
    type: z.literal('cardGrid'),
    header: HeaderSchema,
    variant: z.enum(['service', 'feature', 'why', 'industry', 'industryLink', 'related', 'pain', 'trust', 'audit']),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    items: z
      .array(
        z.object({
          icon: IconSchema,
          num: z.string().max(10).optional(),
          title: Inline,
          body: Text,
          href: HrefSchema.optional(),
          linkLabel: z.string().max(100).optional(),
          tags: z.array(z.string().max(60)).max(10).optional(),
        }),
      )
      .min(1)
      .max(24),
    button: ButtonSchema.optional(),
  }),
  z.object({
    type: z.literal('steps'),
    header: HeaderSchema,
    variant: z.enum(['process', 'compact', 'flow']),
    items: z.array(z.object({ num: z.string().max(10).optional(), week: z.string().max(60).optional(), title: Inline, body: Text })).min(1).max(12),
  }),
  z.object({ type: z.literal('pills'), header: HeaderSchema, items: z.array(z.object({ icon: IconSchema, label: z.string().min(1).max(60) })).min(1).max(40) }),
  z.object({
    type: z.literal('beforeAfter'),
    header: HeaderSchema,
    rows: z
      .array(
        z.object({
          before: z.object({ title: z.string(), steps: z.array(z.string()) }),
          after: z.object({ title: z.string(), steps: z.array(z.string()), saving: z.string().optional() }),
        }),
      )
      .min(1)
      .max(10),
  }),
  z.object({
    type: z.literal('comparisonTable'),
    header: HeaderSchema,
    columns: z.array(z.string().min(1).max(60)).min(2).max(5),
    highlight: z.number().int().min(0),
    rows: z.array(z.object({ label: z.string().min(1), cells: z.array(z.object({ status: z.enum(['check', 'cross', 'partial']), text: z.string().max(200).optional() })) })).min(1).max(30),
    button: ButtonSchema.optional(),
  }),
  z.object({ type: z.literal('faq'), header: HeaderSchema, variant: z.enum(['accordion', 'static']), items: z.array(z.object({ q: z.string().min(1).max(500), a: Text.min(1) })).min(1).max(30) }),
  z.object({ type: z.literal('cta'), heading: Inline, body: Text.optional(), buttons: z.array(ButtonSchema).max(3) }),
  z.object({ type: z.literal('testimonials'), header: HeaderSchema, provider: z.literal('elfsight') }),
  z.object({
    type: z.literal('contactInfo'),
    header: HeaderSchema,
    lead: Text.optional(),
    items: z.array(z.object({ icon: IconSchema, label: z.string().min(1), value: z.string().min(1), href: HrefSchema.optional() })).max(10),
    formSlot: z.boolean(),
  }),
  z.object({
    type: z.literal('workGrid'),
    header: HeaderSchema,
    items: z
      .array(
        z.object({
          title: z.string().min(1),
          body: Text,
          url: z.string().regex(/^https:\/\//).optional(),
          logo: z.object({ src: ImageSrc, alt: z.string() }).optional(),
          fallbackEmoji: z.string().max(16).optional(),
          theme: z.enum(['c1', 'c2', 'c3', 'c4']),
          tags: z.array(z.object({ label: z.string(), tone: z.enum(['b', 't', 'o']) })),
          metrics: z.array(z.object({ n: z.string(), l: z.string() })).max(4),
        }),
      )
      .min(1)
      .max(30),
  }),
  z.object({ type: z.literal('timeline'), header: HeaderSchema, rows: z.array(z.object({ period: z.string(), era: z.string(), focus: z.string() })).min(1).max(20) }),
  z.object({
    type: z.literal('split'),
    image: z.object({ src: ImageSrc, alt: z.string(), width: z.number().int().positive(), height: z.number().int().positive() }),
    eyebrow: z.string().max(200).optional(),
    heading: Inline,
    paragraphs: z.array(Text).min(1).max(10),
  }),
  z.object({
    type: z.literal('phases'),
    header: HeaderSchema,
    items: z.array(z.object({ number: z.string(), title: z.string(), desc: Text, cards: z.array(z.object({ name: z.string(), desc: Text })) })).min(1).max(20),
  }),
  z.object({ type: z.literal('roi'), header: HeaderSchema, math: Inline, assumptions: Text.optional(), disclaimer: Text.optional() }),
  z.object({ type: z.literal('richText'), html: z.string().max(200_000), toc: z.boolean() }),
]);
export type Block = z.infer<typeof BlockSchema>;
export type BlockOf<T extends Block['type']> = Extract<Block, { type: T }>;

export const RESERVED_SLUGS = ['admin', 'api', 'blog', 'authors', '_next', 'sitemap.xml', 'robots.txt', 'llms.txt', 'manifest.webmanifest'];
export const SlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .max(100)
  .refine((s) => !RESERVED_SLUGS.includes(s), 'reserved slug');

export const PageSchema = z.object({
  slug: SlugSchema,
  title: z.string().min(1).max(200),
  status: z.enum(['draft', 'published']),
  type: z.enum(['standard', 'service', 'industry', 'landing', 'legal']),
  theme: z.object({ accent: z.string().regex(/^#[0-9a-fA-F]{6}$/) }),
  blocks: z.array(BlockSchema),
  seo: z.object({
    metaTitle: z.string().max(200).optional(),
    metaDescription: z.string().max(400).optional(),
    ogImage: ImageSrc.optional(),
    noindex: z.boolean(),
  }),
  locked: z.boolean(),
  publishedAt: z.string().optional(),
});
export type Page = z.infer<typeof PageSchema>;
