import type { PostIndexEntry } from '@/lib/content/posts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

// RSS 2.0 with an atom:link self reference. `site` is the canonical origin without a trailing slash.
export function buildRss(posts: PostIndexEntry[], site: string): string {
  const items = posts
    .slice(0, 20)
    .map((p) => {
      const url = `${site}/blog/${p.slug}`;
      return [
        '    <item>',
        `      <title>${esc(p.title)}</title>`,
        `      <link>${esc(url)}</link>`,
        `      <guid isPermaLink="true">${esc(url)}</guid>`,
        `      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>`,
        `      <description>${esc(p.shortDescription)}</description>`,
        ...(p.category ? [`      <category>${esc(p.category)}</category>`] : []),
        '    </item>',
      ].join('\n');
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Embtel Solutions Blog</title>
    <link>${esc(`${site}/blog`)}</link>
    <description>Practical guides and case studies on web development, automation, and AI — written for growing businesses, not developers.</description>
    <language>en-us</language>
    <atom:link href="${esc(`${site}/feed.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}
