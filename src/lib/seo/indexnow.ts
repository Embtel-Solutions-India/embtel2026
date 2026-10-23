import { env } from '@/lib/env';
import { isIndexable } from './indexing';

const KEY = /^[A-Za-z0-9-]{8,128}$/;

// Read at call time (not from the memoised env) so a key added in Vercel takes effect on the next deploy/request.
export function indexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY;
  return key && KEY.test(key) ? key : null;
}

// Site paths (`/blog/x`) → absolute URLs, then pingIndexNow.
export function pingIndexNowPaths(paths: string[]): Promise<{ ok: boolean }> {
  if (!indexNowKey()) return Promise.resolve({ ok: false });
  return pingIndexNow(paths.map((p) => `${env.SITE_URL}${p}`));
}

// Tells Bing/Yandex (and through Bing, Copilot) that URLs changed. Best effort: never throws.
export async function pingIndexNow(urls: string[]): Promise<{ ok: boolean }> {
  const key = indexNowKey();
  if (!key || !isIndexable() || urls.length === 0) return { ok: false };
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(env.SITE_URL).host, key, keyLocation: `${env.SITE_URL}/indexnow-key.txt`, urlList: urls }),
    });
    return { ok: res.ok };
  } catch (e) {
    console.error('[indexnow] ping failed:', e instanceof Error ? e.message : 'unknown error');
    return { ok: false };
  }
}
