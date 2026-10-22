import { timingSafeEqual } from 'node:crypto';
import { connection } from 'next/server';
import { publishDuePosts } from '@/lib/admin/posts';

// Vercel Cron (vercel.json) calls this every 5 minutes with `Authorization: Bearer $CRON_SECRET`.
function authorized(header: string | null, secret: string): boolean {
  const a = Buffer.from(header ?? '');
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  await connection();
  // Read at call time so the route works without the full env being valid (and stays off when unset).
  const secret = process.env.CRON_SECRET ?? '';
  if (secret.length < 32) return Response.json({ error: 'Scheduled publishing is not configured.' }, { status: 503 });
  if (!authorized(req.headers.get('authorization'), secret)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const published = await publishDuePosts();
  return Response.json({ published });
}
