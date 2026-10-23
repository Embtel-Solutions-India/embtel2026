import { connection } from 'next/server';
import { cronAuth } from '@/lib/cron';
import { syncGsc } from '@/lib/integrations/gsc';

// Vercel Cron (vercel.json): daily Search Console snapshot for the SEO insights screen.
export async function GET(req: Request) {
  await connection();
  const denied = cronAuth(req);
  if (denied) return denied;
  try {
    const r = await syncGsc();
    return Response.json(r ? { synced: r } : { skipped: 'Search Console is not configured' });
  } catch (e) {
    console.error('[gsc] sync failed:', e instanceof Error ? e.message : 'unknown error');
    return Response.json({ error: 'Search Console sync failed' }, { status: 502 });
  }
}
