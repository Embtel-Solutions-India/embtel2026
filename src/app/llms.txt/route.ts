import { connection } from 'next/server';
import { getPublishedPage, listPublishedPages, type PageSummary } from '@/lib/content/pages';
import { listPostIndex } from '@/lib/content/posts';
import { getSiteSettings } from '@/lib/content/settings';
import { canonicalUrl, pageDescription, pagePath } from '@/lib/seo/metadata';

// llms.txt (llmstxt.org): a plain-text map of the site for AI answer engines.
const SECTIONS: { title: string; types: PageSummary['type'][] }[] = [
  { title: 'Services', types: ['service', 'landing'] },
  { title: 'Industries', types: ['industry'] },
  { title: 'Company', types: ['standard', 'legal'] },
];

export async function GET() {
  await connection();
  const [settings, summaries, posts] = await Promise.all([getSiteSettings(), listPublishedPages(), listPostIndex()]);
  const pages = summaries.filter((p) => !p.noindex);
  const lines = [`# ${settings.organization.name}`, ''];
  if (settings.organization.description) lines.push(`> ${settings.organization.description}`, '');
  for (const section of SECTIONS) {
    const inSection = pages.filter((p) => section.types.includes(p.type));
    if (!inSection.length) continue;
    lines.push(`## ${section.title}`);
    for (const p of inSection) {
      const page = await getPublishedPage(p.slug);
      const desc = page ? pageDescription(page) : '';
      lines.push(`- [${p.title}](${canonicalUrl(pagePath(p.slug))})${desc ? `: ${desc}` : ''}`);
    }
    lines.push('');
  }
  if (posts.length) {
    lines.push('## Blog');
    for (const p of posts) lines.push(`- [${p.title}](${canonicalUrl(`/blog/${p.slug}`)}): ${p.shortDescription}`);
    lines.push('');
  }
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
