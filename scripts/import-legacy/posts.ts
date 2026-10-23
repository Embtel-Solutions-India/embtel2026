// Converts the legacy static blog (embtel-final/includes/blog-posts.js) into seedable JSON.
import vm from 'node:vm';
import type { SeedBlog, SeedCategory, SeedPost, SeedTag } from '../../src/lib/content/blog-seed';
import { toSlug } from '../../src/lib/slug';

type LegacyPost = {
  slug: string;
  title: string;
  shortDescription: string;
  category?: { name: string };
  tags?: { name: string }[];
  author?: { name: string };
  publishedAt: string;
  readingTime: number;
  featuredImage?: string;
  imageAltText?: string;
  seo?: { metaTitle?: string; metaDescription?: string };
  content: string;
};

// Tag → service page, for "related services" on posts (spec 6.4). Admin-editable from Phase 4.
const TAG_SERVICE: Record<string, string> = {
  automation: 'business-automation',
  workflows: 'business-automation',
  productivity: 'business-automation',
  seo: 'seo-geo',
  'web-development': 'web-development',
  performance: 'web-development',
  ux: 'web-development',
  ai: 'ai-integrations',
  integrations: 'ai-integrations',
  'customer-support': 'ai-integrations',
  analytics: 'analytics-dashboards',
  dashboards: 'analytics-dashboards',
  reporting: 'analytics-dashboards',
  cybersecurity: 'cybersecurity',
  security: 'cybersecurity',
};

export function parseLegacyPosts(js: string): SeedBlog {
  // Our own repo file (read-only legacy source), evaluated in an empty context with no globals.
  const ctx: { STATIC_BLOG_POSTS?: LegacyPost[] } = {};
  vm.runInNewContext(js, ctx, { timeout: 1000 });
  const legacy = ctx.STATIC_BLOG_POSTS ?? [];

  const categories = new Map<string, SeedCategory>();
  const tags = new Map<string, SeedTag>();
  const posts: SeedPost[] = legacy.map((p) => {
    const category = p.category?.name ? toSlug(p.category.name) : null;
    if (category && !categories.has(category)) categories.set(category, { name: p.category!.name, slug: category, description: '' });
    const tagSlugs = (p.tags ?? []).map((t) => {
      const slug = toSlug(t.name);
      if (!tags.has(slug)) tags.set(slug, { name: t.name, slug, serviceSlug: TAG_SERVICE[slug] ?? '' });
      return slug;
    });
    return {
      slug: p.slug,
      title: p.title,
      shortDescription: p.shortDescription,
      content: p.content,
      featuredImage: p.featuredImage ?? '',
      imageAltText: p.imageAltText ?? '',
      authorName: p.author?.name ?? '',
      publishedAt: new Date(p.publishedAt).toISOString(),
      readingTime: p.readingTime,
      status: 'published',
      category,
      tags: tagSlugs,
      seo: { metaTitle: p.seo?.metaTitle ?? '', metaDescription: p.seo?.metaDescription ?? '' },
      faqs: [],
      keyTakeaways: [],
      sources: [],
    };
  });
  return { posts, categories: [...categories.values()], tags: [...tags.values()] };
}
