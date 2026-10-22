import { z } from 'zod';
import { isAllowedImageUrl } from '@/lib/content/image-hosts';

export const ObjectIdSchema = z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid id');
export const SlugSchema = z.string().max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single dashes');
const text = (max: number) => z.string().trim().max(max);
const httpsUrl = z.string().trim().url().regex(/^https:\/\//, 'Must start with https://');
export const ImageUrlSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || isAllowedImageUrl(v), 'Use an image from the media library (or an allowed image host)');

export const PostInputSchema = z
  .object({
    id: ObjectIdSchema.optional(),
    title: text(200).min(1, 'Title is required'),
    slug: z.union([SlugSchema, z.literal('')]).optional(),
    shortDescription: text(300).min(1, 'Short description is required'),
    content: z.string().min(1, 'Write the post first').max(200_000),
    featuredImage: ImageUrlSchema.default(''),
    imageAltText: text(200).default(''),
    category: ObjectIdSchema.nullable().default(null),
    tags: z.array(ObjectIdSchema).max(20).default([]),
    authorId: ObjectIdSchema.nullable().default(null),
    authorName: text(100).default(''),
    status: z.enum(['draft', 'published', 'scheduled']),
    // From the editor's datetime-local plus the browser's offset, e.g. 2026-11-01T09:00:00-05:00.
    scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
    pinned: z.boolean().default(false),
    faqs: z.array(z.object({ q: text(300).min(1), a: text(2000).min(1) })).max(20).default([]),
    keyTakeaways: z.array(text(300).min(1)).max(10).default([]),
    sources: z.array(z.object({ title: text(200).min(1), url: httpsUrl })).max(20).default([]),
    focusKeyword: text(100).default(''),
    secondaryKeywords: z.array(text(100).min(1)).max(20).default([]),
    seo: z
      .object({
        metaTitle: text(70).default(''),
        metaDescription: text(170).default(''),
        keywords: z.array(text(100).min(1)).max(20).default([]),
        canonicalUrl: z.union([httpsUrl, z.literal('')]).default(''),
        ogImage: ImageUrlSchema.default(''),
        noindex: z.boolean().default(false),
      })
      .default({}),
    lastReviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
    // The updatedAt the editor loaded (ISO); null when creating. Guards against overwriting someone else's save.
    expectedUpdatedAt: z.string().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.status === 'scheduled' && !v.scheduledAt) ctx.addIssue({ code: 'custom', path: ['scheduledAt'], message: 'Pick a date and time' });
  });

export type PostInput = z.infer<typeof PostInputSchema>;
