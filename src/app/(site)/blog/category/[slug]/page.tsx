import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { BlogHero } from '@/components/blog/BlogHero';
import { PostList } from '@/components/blog/PostList';
import { parsePage } from '@/lib/content/pagination';
import { getCategory, listPublishedPosts, listTaxonomy } from '@/lib/content/posts';
import { buildListMetadata } from '@/lib/seo/metadata';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string | string[] }> };

async function load({ params, searchParams }: Props) {
  await connection();
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = await getCategory(slug);
  if (!category) notFound();
  const page = parsePage(sp.page) ?? 1;
  return { category, page, data: await listPublishedPosts({ category: slug, page }) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { category, page, data } = await load(props);
  return buildListMetadata({
    title: `${category.name} Articles`,
    description: category.description || `Articles about ${category.name} from Embtel Solutions.`,
    path: `/blog/category/${category.slug}`,
    page,
    noindex: data.items.length === 0,
  });
}

export default async function CategoryPage(props: Props) {
  const [{ category, data }, taxonomy] = await Promise.all([load(props), listTaxonomy()]);
  return (
    <>
      <BlogHero eyebrow="Category" title={category.name} lead={category.description} categories={taxonomy.categories} activeCategory={category.slug} />
      <PostList data={data} basePath={`/blog/category/${category.slug}`} />
    </>
  );
}
