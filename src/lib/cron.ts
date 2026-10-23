import { timingSafeEqual } from 'node:crypto';

// Vercel Cron calls with `Authorization: Bearer $CRON_SECRET`. Read at call time; off (503) without a 32+ char secret.
export function cronAuth(req: Request): Response | null {
  const secret = process.env.CRON_SECRET ?? '';
  if (secret.length < 32) return Response.json({ error: 'Scheduled jobs are not configured.' }, { status: 503 });
  const a = Buffer.from(req.headers.get('authorization') ?? '');
  const b = Buffer.from(`Bearer ${secret}`);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}
