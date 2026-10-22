// URL parity for cutover (spec §7 step 6): every legacy/indexed URL must answer 200, or exactly one
// permanent redirect (301/308) to a 200. Read-only GETs; the operator chooses which host to check.

export type ParityResult = {
  path: string;
  ok: boolean;
  status: number;
  hops: number;
  finalPath: string;
  canonical: string;
  noindex: boolean;
  problem: string;
};
type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const attr = (htmlText: string, re: RegExp) => re.exec(htmlText)?.[1] ?? '';

export async function checkUrl(base: string, path: string, fetchImpl: Fetch = fetch, opts: { expectIndexable?: boolean } = {}): Promise<ParityResult> {
  let url = new URL(path, base).toString();
  const first = { status: 0 };
  let hops = 0;
  for (let i = 0; i < 5; i++) {
    let res: Response;
    try {
      res = await fetchImpl(url, { redirect: 'manual', headers: { 'user-agent': 'embtel-parity-check' } });
    } catch {
      return { path, ok: false, status: 0, hops, finalPath: '', canonical: '', noindex: false, problem: 'no response' };
    }
    if (i === 0) first.status = res.status;
    if (res.status >= 300 && res.status < 400) {
      hops++;
      const loc = res.headers.get('location');
      if (!loc) return { path, ok: false, status: first.status, hops, finalPath: '', canonical: '', noindex: false, problem: `${res.status} without a Location` };
      url = new URL(loc, url).toString();
      continue;
    }
    const u = new URL(url);
    const finalPath = u.pathname + u.search;
    const body = /html/.test(res.headers.get('content-type') ?? '') ? await res.text() : '';
    const canonical = attr(body, /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i);
    const robots = `${attr(body, /<meta[^>]+name="robots"[^>]+content="([^"]+)"/i)} ${res.headers.get('x-robots-tag') ?? ''}`;
    const noindex = /noindex/i.test(robots);
    let problem = '';
    if (res.status !== 200) problem = `final status ${res.status}`;
    else if (hops > 1) problem = `${hops} redirects (must be at most 1)`;
    else if (hops === 1 && ![301, 308].includes(first.status)) problem = `redirect is ${first.status}, not permanent`;
    else if (opts.expectIndexable && noindex) problem = 'noindex on the final page';
    return { path, ok: problem === '', status: first.status, hops, finalPath, canonical, noindex, problem };
  }
  return { path, ok: false, status: first.status, hops, finalPath: '', canonical: '', noindex: false, problem: 'redirect loop' };
}

// Every URL form the legacy site answered: pages (clean and .html), the blog, posts, and legacy post links.
export function inventoryFrom({ legacyPages, postSlugs }: { legacyPages: string[]; postSlugs: string[] }): string[] {
  // /da-ai pages (retired section). Bare /da-ai/ takes 2 permanent hops (trailing slash, then 301) — fine for crawlers.
  const out = new Set<string>(['/', '/da-ai/example-page']);
  for (const p of legacyPages) {
    if (p === 'blog-details') continue; // only meaningful with ?slug= (below)
    out.add(p === 'index' ? '/' : `/${p}`);
    out.add(`/${p}.html`);
  }
  for (const s of postSlugs) {
    out.add(`/blog/${s}`);
    out.add(`/blog-details?slug=${s}`);
    out.add(`/blog-details.html?slug=${s}`);
  }
  return [...out];
}

// Search Console → Pages → Export (CSV): first column holds full URLs. Keeps only URLs on `host`.
export function pathsFromSearchConsoleCsv(csv: string, host: string): string[] {
  const out: string[] = [];
  for (const line of csv.split(/\r?\n/).slice(1)) {
    const first = line.startsWith('"') ? line.slice(1, line.indexOf('"', 1)) : line.split(',')[0];
    try {
      const u = new URL(first);
      if (u.host === host) out.push(u.pathname + u.search);
    } catch {
      // header remnants / blank lines
    }
  }
  return [...new Set(out)];
}
