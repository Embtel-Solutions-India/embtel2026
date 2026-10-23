import { connection } from 'next/server';
import { publishDuePosts } from '@/lib/admin/posts';
import { cronAuth } from '@/lib/cron';

// Vercel Cron (vercel.json): every 5 minutes.
export async function GET(req: Request) {
  await connection();
  const denied = cronAuth(req);
  if (denied) return denied;
  return Response.json({ published: await publishDuePosts() });
}
