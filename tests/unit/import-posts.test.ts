import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { SeedPostSchema } from '@/lib/content/blog-seed';
import { parseLegacyPosts } from '../../scripts/import-legacy/posts';

const JS = readFileSync('embtel-final/includes/blog-posts.js', 'utf8');
const legacy = (() => {
  const ctx: { STATIC_BLOG_POSTS?: { slug: string; content: string; publishedAt: string }[] } = {};
  vm.runInNewContext(JS, ctx);
  return ctx.STATIC_BLOG_POSTS!;
})();

describe('parseLegacyPosts', () => {
  const out = parseLegacyPosts(JS);

  it('imports the 6 legacy posts with their exact slugs and verbatim content', () => {
    expect(out.posts.map((p) => p.slug)).toEqual(legacy.map((p) => p.slug));
    for (const p of out.posts) {
      const l = legacy.find((x) => x.slug === p.slug)!;
      expect(p.content).toBe(l.content);
      expect(p.publishedAt).toBe(new Date(l.publishedAt).toISOString());
      expect(p.authorName).toBe('Embtel Team');
      expect(p.status).toBe('published');
      expect(SeedPostSchema.safeParse(p).success).toBe(true);
    }
  });

  it('collects 6 categories and 16 unique tags, with service links', () => {
    expect(out.categories).toHaveLength(6);
    expect(out.tags).toHaveLength(16);
    expect(out.tags.find((t) => t.slug === 'performance')?.serviceSlug).toBe('web-development');
    expect(out.tags.find((t) => t.slug === 'smb')?.serviceSlug).toBe('');
    const post = out.posts.find((p) => p.slug === 'website-speed-costing-you-customers')!;
    expect(post.category).toBe('web-development');
    expect(post.tags).toEqual(['web-development', 'performance', 'ux']);
  });
});
