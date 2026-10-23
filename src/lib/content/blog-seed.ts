import { z } from 'zod';
import { SlugSchema } from './blocks';

// Reviewable JSON shapes for blog content in content/blog/ (category/tag referenced by slug).
export const SeedCategorySchema = z.object({ name: z.string().min(1), slug: SlugSchema, description: z.string().default('') });
export const SeedTagSchema = z.object({ name: z.string().min(1), slug: SlugSchema, serviceSlug: z.string().default('') });
export const SeedPostSchema = z.object({
  slug: SlugSchema,
  title: z.string().min(1).max(300),
  shortDescription: z.string().min(1).max(300),
  content: z.string().min(1),
  featuredImage: z.string(),
  imageAltText: z.string(),
  authorName: z.string(),
  publishedAt: z.string().datetime(),
  readingTime: z.number().int().positive(),
  status: z.enum(['draft', 'published']),
  category: SlugSchema.nullable(),
  tags: z.array(SlugSchema),
  seo: z.object({ metaTitle: z.string(), metaDescription: z.string() }),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })),
  keyTakeaways: z.array(z.string()),
  sources: z.array(z.object({ title: z.string(), url: z.string().regex(/^https:\/\//) })),
});

export type SeedCategory = z.infer<typeof SeedCategorySchema>;
export type SeedTag = z.infer<typeof SeedTagSchema>;
export type SeedPost = z.infer<typeof SeedPostSchema>;
export type SeedBlog = { posts: SeedPost[]; categories: SeedCategory[]; tags: SeedTag[] };
