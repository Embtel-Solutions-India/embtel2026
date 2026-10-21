import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { BlogHero } from '@/components/blog/BlogHero';
import { PostList } from '@/components/blog/PostList';
import { parsePage } from '@/lib/content/pagination';
import { getTag, listPublishedPosts } from '@/lib/content/posts';
import { buildListMetadata } from '@/lib/seo/metadata';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string | string[] }> };

async function load({ params, searchParams }: Props) {
  await connection();
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const tag = await getTag(slug);
  if (!tag) notFound();
  const page = parsePage(sp.page) ?? 1;
  return { tag, page, data: await listPublishedPosts({ tag: slug, page }) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { tag, page, data } = await load(props);
  return buildListMetadata({
    title: `Articles tagged ${tag.name}`,
    description: `Embtel Solutions articles tagged ${tag.name}.`,
    path: `/blog/tag/${tag.slug}`,
    page,
    noindex: data.items.length === 0,
  });
}

export default async function TagPage(props: Props) {
  const { tag, data } = await load(props);
  return (
    <>
      <BlogHero eyebrow="Tag" title={tag.name} />
      <PostList data={data} basePath={`/blog/tag/${tag.slug}`} />
    </>
  );
}
