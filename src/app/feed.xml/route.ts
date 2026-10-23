import { connection } from 'next/server';
import { env } from '@/lib/env';
import { listPostIndex } from '@/lib/content/posts';
import { buildRss } from '@/lib/seo/rss';

export async function GET() {
  await connection();
  return new Response(buildRss(await listPostIndex(), env.SITE_URL), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
