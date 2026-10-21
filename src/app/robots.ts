import type { MetadataRoute } from 'next';
import { isIndexable } from '@/lib/seo/indexing';
import { canonicalUrl } from '@/lib/seo/metadata';

// Search and AI answer-engine crawlers are welcome; only the admin and API are off limits.
const AI_AND_SEARCH_BOTS = ['GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended', 'Bingbot'];
const PRIVATE = ['/admin', '/api'];

export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      ...AI_AND_SEARCH_BOTS.map((userAgent) => ({ userAgent, allow: '/', disallow: PRIVATE })),
    ],
    sitemap: canonicalUrl('/sitemap.xml'),
  };
}
