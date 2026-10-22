import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import { isKnownPath } from '@/lib/content/page-index';
import { getPublishedPost } from '@/lib/content/posts';
import { renderOgImage } from '@/lib/seo/og';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  // Check the uncached path index first so random slugs never create cache entries or render images.
  const known = await isKnownPath(`/blog/${slug}`).catch(() => false);
  const post = known ? await getPublishedPost(slug).catch(() => null) : null;
  if (!post) return NextResponse.redirect(new URL('/opengraph-image', req.url), 307);
  return renderOgImage({ title: post.title, eyebrow: post.category?.name ?? 'Blog' });
}
