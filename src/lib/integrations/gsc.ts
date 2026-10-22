import { importPKCS8, SignJWT } from 'jose';
import { z } from 'zod';
import { connectDB } from '@/lib/db/connect';
import { GscCache, type GscRow } from '@/lib/db/models/GscCache';

// Google Search Console via a service account (spec 6.4). Credentials only from env, read at call time:
// GSC_SERVICE_ACCOUNT_JSON (the downloaded key file, a secret) and GSC_SITE_URL (the property).
const ServiceAccount = z.object({ client_email: z.string().email(), private_key: z.string().includes('PRIVATE KEY') });
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ROW_LIMIT = 5000;
const DAY = 86_400_000;

function credentials() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  const site = process.env.GSC_SITE_URL;
  if (!raw || !site) return null;
  try {
    const sa = ServiceAccount.parse(JSON.parse(raw));
    return { ...sa, site };
  } catch {
    console.error('[gsc] GSC_SERVICE_ACCOUNT_JSON is not a valid service-account key'); // never log the value
    return null;
  }
}

let token: { value: string; exp: number; email: string } | null = null;

async function accessToken(c: NonNullable<ReturnType<typeof credentials>>): Promise<string> {
  if (token && token.email === c.client_email && Date.now() < token.exp - 60_000) return token.value;
  const key = await importPKCS8(c.private_key, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(c.client_email)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString(),
  });
  if (!res.ok) throw new Error(`Search Console sign-in failed (HTTP ${res.status}). Check the service account key.`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: j.access_token, exp: Date.now() + j.expires_in * 1000, email: c.client_email };
  return token.value;
}

async function query(c: NonNullable<ReturnType<typeof credentials>>, startDate: string, endDate: string): Promise<GscRow[]> {
  const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(c.site)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken(c)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate, endDate, dimensions: ['query', 'page'], rowLimit: ROW_LIMIT, dataState: 'final' }),
  });
  if (res.status === 403) throw new Error('Search Console refused access. Add the service account as a user on the property.');
  if (!res.ok) throw new Error(`Search Console query failed (HTTP ${res.status}).`);
  const j = (await res.json()) as { rows?: { keys: string[]; clicks: number; impressions: number; position: number }[] };
  return (j.rows ?? []).map((r) => ({ query: r.keys[0], page: r.keys[1], clicks: r.clicks, impressions: r.impressions, position: r.position }));
}

const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);

// Last 28 days (Search Console data lags ~3 days) vs the 28 days before. Replaces the cached snapshot.
export async function syncGsc(now = new Date()): Promise<{ current: number; previous: number } | null> {
  const c = credentials();
  if (!c) return null;
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 3 * DAY;
  const currentRange = { start: ymd(end - 27 * DAY), end: ymd(end) };
  const previousRange = { start: ymd(end - 55 * DAY), end: ymd(end - 28 * DAY) };
  const current = await query(c, currentRange.start, currentRange.end);
  const previous = await query(c, previousRange.start, previousRange.end);
  await connectDB();
  await GscCache.updateOne({ key: 'latest' }, { $set: { site: c.site, currentRange, previousRange, current, previous, syncedAt: new Date() } }, { upsert: true });
  return { current: current.length, previous: previous.length };
}

export type QueryStat = { query: string; clicks: number; impressions: number; position: number; change: number };
export type PageStat = { path: string; clicks: number; previousClicks: number; change: number };
export type Insights = { syncedAt: string; range: { start: string; end: string }; topQueries: QueryStat[]; rising: QueryStat[]; strikingDistance: QueryStat[]; losingPages: PageStat[] };

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname.replace(/\/+$/, '') || '/';
  } catch {
    return url;
  }
};

function byQuery(rows: GscRow[]) {
  const m = new Map<string, { clicks: number; impressions: number; posWeighted: number }>();
  for (const r of rows) {
    const a = m.get(r.query) ?? { clicks: 0, impressions: 0, posWeighted: 0 };
    a.clicks += r.clicks;
    a.impressions += r.impressions;
    a.posWeighted += r.position * r.impressions;
    m.set(r.query, a);
  }
  return m;
}

// The seam for other keyword providers (Semrush, Keyword Planner) later; the admin UI only uses this shape.
export type KeywordSource = {
  name: string;
  configured(): boolean;
  insights(): Promise<Insights | null>;
  queriesForPage(path: string): Promise<QueryStat[]>;
};

async function snapshot() {
  await connectDB();
  return (await GscCache.findOne({ key: 'latest' }).lean()) as { current: GscRow[]; previous: GscRow[]; syncedAt: Date; currentRange: { start: string; end: string } } | null;
}

export const gscSource: KeywordSource = {
  name: 'Google Search Console',
  configured: () => credentials() !== null,
  async insights() {
    if (!credentials()) return null;
    const s = await snapshot();
    if (!s) return null;
    const cur = byQuery(s.current);
    const prev = byQuery(s.previous);
    const stats: QueryStat[] = [...cur].map(([query, a]) => ({
      query,
      clicks: a.clicks,
      impressions: a.impressions,
      position: a.impressions ? Math.round((a.posWeighted / a.impressions) * 10) / 10 : 0,
      change: a.clicks - (prev.get(query)?.clicks ?? 0),
    }));
    const pageClicks = (rows: GscRow[]) => rows.reduce((m, r) => m.set(pathOf(r.page), (m.get(pathOf(r.page)) ?? 0) + r.clicks), new Map<string, number>());
    const cp = pageClicks(s.current);
    const pp = pageClicks(s.previous);
    const losingPages = [...pp]
      .map(([path, previousClicks]) => ({ path, clicks: cp.get(path) ?? 0, previousClicks, change: (cp.get(path) ?? 0) - previousClicks }))
      .filter((p) => p.change < 0)
      .sort((a, b) => a.change - b.change)
      .slice(0, 20);
    return {
      syncedAt: s.syncedAt.toISOString(),
      range: s.currentRange,
      topQueries: [...stats].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 25),
      rising: stats.filter((q) => q.change > 0).sort((a, b) => b.change - a.change).slice(0, 25),
      strikingDistance: stats.filter((q) => q.position >= 8 && q.position <= 20).sort((a, b) => b.impressions - a.impressions).slice(0, 25),
      losingPages,
    };
  },
  async queriesForPage(path) {
    if (!credentials()) return [];
    const s = await snapshot();
    if (!s) return [];
    return s.current
      .filter((r) => pathOf(r.page) === path)
      .map((r) => ({ query: r.query, clicks: r.clicks, impressions: r.impressions, position: Math.round(r.position * 10) / 10, change: 0 }))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 20);
  },
};
