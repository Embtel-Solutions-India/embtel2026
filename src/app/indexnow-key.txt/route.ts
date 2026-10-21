import { indexNowKey } from '@/lib/seo/indexnow';

// IndexNow ownership proof: the key is public by design.
export function GET() {
  const key = indexNowKey();
  return key ? new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }) : new Response('Not found', { status: 404 });
}
