import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import { getPublishedPost } from '@/lib/content/posts';
import { renderOgImage } from '@/lib/seo/og';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const post = await getPublishedPost((await params).slug).catch(() => null);
  // Unknown slugs redirect to the default card instead of rendering a fresh image per request.
  if (!post) return NextResponse.redirect(new URL('/opengraph-image', req.url), 307);
  return renderOgImage({ title: post.title, eyebrow: post.category?.name ?? 'Blog' });
}
