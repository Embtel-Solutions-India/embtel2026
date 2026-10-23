import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { connection } from 'next/server';
import { BlogHero } from '@/components/blog/BlogHero';
import { PostList } from '@/components/blog/PostList';
import { JsonLd } from '@/components/seo/JsonLd';
import { getSiteSettings } from '@/lib/content/settings';
import { listJsonLd } from '@/lib/seo/jsonld';
import { parsePage } from '@/lib/content/pagination';
import { listPublishedPosts, listTaxonomy, loadPosts } from '@/lib/content/posts';
import { buildListMetadata } from '@/lib/seo/metadata';

type Props = { searchParams: Promise<{ page?: string | string[]; q?: string | string[] }> };

const TITLE = 'Ideas on growth, *automation & tech.*';
const LEAD = 'Practical guides and case studies on web development, automation, and AI — written for growing businesses, not developers.';
const queryOf = (q: string | string[] | undefined) => (typeof q === 'string' ? q.trim().slice(0, 200) : '');

async function load(searchParams: Props['searchParams']) {
  await connection();
  const sp = await searchParams;
  const page = parsePage(sp.page) ?? 1; // invalid values already 404 in the proxy
  const q = queryOf(sp.q);
  // Search results are not cached: arbitrary queries would grow the cache without bound.
  const data = q ? await loadPosts({ page, q }) : await listPublishedPosts({ page });
  return { page, q, data };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page, q, data } = await load(searchParams);
  return buildListMetadata({
    title: q ? `Search: ${q}` : 'Blog',
    description: LEAD,
    path: '/blog',
    page,
    noindex: Boolean(q) || data.items.length === 0,
  });
}

export default async function BlogIndex({ searchParams }: Props) {
  const [{ q, data }, taxonomy, settings, h] = await Promise.all([load(searchParams), listTaxonomy(), getSiteSettings(), headers()]);
  return (
    <>
      <JsonLd data={listJsonLd(settings, [{ name: 'Blog', path: '/blog' }])} nonce={h.get('x-nonce') ?? undefined} />
      <BlogHero eyebrow="Insights & Resources" title={TITLE} lead={LEAD} q={q} categories={taxonomy.categories} />
      <PostList data={data} basePath="/blog" query={q ? { q } : undefined} />
    </>
  );
}
