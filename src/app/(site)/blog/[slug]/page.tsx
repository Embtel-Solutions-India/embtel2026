import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { PostArticle } from '@/components/blog/PostArticle';
import { listPublishedPages } from '@/lib/content/pages';
import { getPublishedPost, getRelatedPosts } from '@/lib/content/posts';
import { canonicalUrl, pagePath } from '@/lib/seo/metadata';

type Props = { params: Promise<{ slug: string }> };

async function load(params: Props['params']) {
  await connection();
  const post = await getPublishedPost((await params).slug);
  if (!post) notFound();
  return post;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await load(params);
  return { title: { absolute: `${post.title} — Embtel Solutions` }, description: post.shortDescription };
}

export default async function PostPage({ params }: Props) {
  const post = await load(params);
  const [related, pages] = await Promise.all([getRelatedPosts(post, 3), listPublishedPages()]);
  // Tag → service page links (spec 6.4), only to published pages, max 3.
  const serviceSlugs = [...new Set(post.tags.map((t) => t.serviceSlug).filter(Boolean))];
  const relatedServices = serviceSlugs
    .map((s) => pages.find((p) => p.slug === s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 3)
    .map((p) => ({ title: p.title, href: pagePath(p.slug) }));
  return <PostArticle post={post} canonical={canonicalUrl(`/blog/${post.slug}`)} related={related} relatedServices={relatedServices} />;
}
