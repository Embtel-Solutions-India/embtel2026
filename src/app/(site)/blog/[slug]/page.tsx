import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { PostArticle } from '@/components/blog/PostArticle';
import { JsonLd } from '@/components/seo/JsonLd';
import { listPublishedPages } from '@/lib/content/pages';
import { getPublishedPost, getRelatedPosts } from '@/lib/content/posts';
import { getSiteSettings } from '@/lib/content/settings';
import { postJsonLd } from '@/lib/seo/jsonld';
import { buildPostMetadata, canonicalUrl, pagePath } from '@/lib/seo/metadata';

type Props = { params: Promise<{ slug: string }> };

async function load(params: Props['params']) {
  await connection();
  const post = await getPublishedPost((await params).slug);
  if (!post) notFound();
  return post;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [post, settings] = await Promise.all([load(params), getSiteSettings()]);
  return buildPostMetadata(post, settings);
}

export default async function PostPage({ params }: Props) {
  const post = await load(params);
  const [related, pages, settings, nonce] = await Promise.all([getRelatedPosts(post, 3), listPublishedPages(), getSiteSettings(), headers().then((h) => h.get('x-nonce') ?? undefined)]);
  // Tag → service page links (spec 6.4), only to published pages, max 3.
  const serviceSlugs = [...new Set(post.tags.map((t) => t.serviceSlug).filter(Boolean))];
  const relatedServices = serviceSlugs
    .map((s) => pages.find((p) => p.slug === s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 3)
    .map((p) => ({ title: p.title, href: pagePath(p.slug) }));
  return (
    <>
      <JsonLd data={postJsonLd(post, settings)} nonce={nonce} />
      <PostArticle post={post} canonical={canonicalUrl(`/blog/${post.slug}`)} related={related} relatedServices={relatedServices} />
    </>
  );
}
