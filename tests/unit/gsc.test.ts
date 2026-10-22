import { generateKeyPairSync } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { decodeJwt } from 'jose';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
// Throwaway key generated per run — never a real credential.
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const SITE = 'https://www.embtelsolutions.com';
const row = (query: string, page: string, clicks: number, impressions: number, position: number) => ({ keys: [query, `${SITE}${page}`], clicks, impressions, ctr: clicks / impressions, position });
const CURRENT = [row('dental automation', '/dental-automation', 40, 900, 4.2), row('dental reminders', '/blog/dental-reminders', 12, 600, 11.5), row('web design fremont', '/web-development', 5, 300, 15), row('speed audit', '/blog/website-speed', 2, 50, 6)];
const PREVIOUS = [row('dental automation', '/dental-automation', 10, 500, 6), row('web design fremont', '/web-development', 20, 400, 9), row('speed audit', '/blog/website-speed', 2, 40, 7)];

function fakeGoogle() {
  const calls: { url: string; body: string; auth?: string }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, body: String(init.body), auth: (init.headers as Record<string, string>)?.Authorization });
    if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'tok-1', expires_in: 3600 });
    const { startDate } = JSON.parse(String(init.body));
    return Response.json({ rows: startDate === '2026-09-22' ? CURRENT : PREVIOUS });
  }));
  return calls;
}

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
});
afterAll(async () => mongo?.stop());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Search Console', () => {
  it('is "not configured" without the service account env', async () => {
    vi.stubEnv('GSC_SERVICE_ACCOUNT_JSON', '');
    const { gscSource } = await import('@/lib/integrations/gsc');
    expect(gscSource.configured()).toBe(false);
    expect(await gscSource.insights()).toBeNull();
  });

  it('syncs the last 28 days vs the 28 before (3-day lag) with a signed service-account token', async () => {
    vi.stubEnv('GSC_SERVICE_ACCOUNT_JSON', JSON.stringify({ client_email: 'reader@proj.iam.gserviceaccount.com', private_key: privateKey }));
    vi.stubEnv('GSC_SITE_URL', 'sc-domain:embtelsolutions.com');
    const calls = fakeGoogle();
    const { syncGsc } = await import('@/lib/integrations/gsc');
    const r = await syncGsc(new Date('2026-10-22T12:00:00Z'));
    expect(r).toEqual({ current: 4, previous: 3 });
    const assertion = new URLSearchParams(calls[0].body).get('assertion')!;
    expect(decodeJwt(assertion)).toMatchObject({ iss: 'reader@proj.iam.gserviceaccount.com', scope: 'https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token' });
    const q = calls.filter((c) => c.url.includes('searchAnalytics'));
    expect(q[0].url).toBe('https://searchconsole.googleapis.com/webmasters/v3/sites/sc-domain%3Aembtelsolutions.com/searchAnalytics/query');
    expect(q.map((c) => JSON.parse(c.body)).map((b) => [b.startDate, b.endDate])).toEqual([['2026-09-22', '2026-10-19'], ['2026-08-25', '2026-09-21']]);
    expect(q.every((c) => c.auth === 'Bearer tok-1')).toBe(true);
  });

  it('derives top, rising, striking-distance, losing pages and per-page queries from the cache', async () => {
    vi.stubEnv('GSC_SERVICE_ACCOUNT_JSON', JSON.stringify({ client_email: 'reader@proj.iam.gserviceaccount.com', private_key: privateKey }));
    vi.stubEnv('GSC_SITE_URL', 'sc-domain:embtelsolutions.com');
    const { gscSource } = await import('@/lib/integrations/gsc');
    const i = (await gscSource.insights())!;
    expect(i.topQueries[0]).toMatchObject({ query: 'dental automation', clicks: 40 });
    expect(i.rising[0]).toMatchObject({ query: 'dental automation', change: 30 });
    expect(i.rising.map((r) => r.query)).toContain('dental reminders'); // new query
    expect(i.strikingDistance.map((r) => r.query)).toEqual(['dental reminders', 'web design fremont']);
    expect(i.losingPages[0]).toMatchObject({ path: '/web-development', change: -15 });
    expect((await gscSource.queriesForPage('/blog/dental-reminders')).map((r) => r.query)).toEqual(['dental reminders']);
  });
});
