import { describe, expect, it } from 'vitest';
import { checkUrl, inventoryFrom, pathsFromSearchConsoleCsv } from '@/lib/cutover/parity';

const BASE = 'https://preview.example.test';
const html = (canonical: string, robots = 'index, follow') => `<html><head><link rel="canonical" href="${canonical}"/><meta name="robots" content="${robots}"/></head></html>`;

// A tiny fake site: path → [status, location | body]
function site(routes: Record<string, [number, string]>) {
  return async (url: string) => {
    const path = new URL(url).pathname + new URL(url).search;
    const [status, v] = routes[path] ?? [404, '<html></html>'];
    return status >= 300 && status < 400 ? new Response(null, { status, headers: { location: v } }) : new Response(v, { status, headers: { 'content-type': 'text/html' } });
  };
}

describe('checkUrl', () => {
  const fetch = site({
    '/about': [200, html('https://www.embtelsolutions.com/about')],
    '/about.html': [301, '/about'],
    '/twice.html': [301, '/twice'],
    '/twice': [308, '/twice-final'],
    '/twice-final': [200, html('https://www.embtelsolutions.com/twice-final')],
    '/hidden': [200, html('https://www.embtelsolutions.com/hidden', 'noindex, nofollow')],
  });

  it('accepts a 200 and reports its canonical', async () => {
    expect(await checkUrl(BASE, '/about', fetch)).toMatchObject({ ok: true, status: 200, finalPath: '/about', canonical: 'https://www.embtelsolutions.com/about', noindex: false });
  });

  it('accepts exactly one permanent redirect to a 200', async () => {
    expect(await checkUrl(BASE, '/about.html', fetch)).toMatchObject({ ok: true, status: 301, hops: 1, finalPath: '/about' });
  });

  it('flags redirect chains, 404s and (when required) noindex', async () => {
    expect(await checkUrl(BASE, '/twice.html', fetch)).toMatchObject({ ok: false, problem: expect.stringMatching(/2 redirects/) });
    expect(await checkUrl(BASE, '/gone', fetch)).toMatchObject({ ok: false, problem: expect.stringMatching(/404/) });
    expect(await checkUrl(BASE, '/hidden', fetch, { expectIndexable: true })).toMatchObject({ ok: false, problem: expect.stringMatching(/noindex/) });
    expect(await checkUrl(BASE, '/hidden', fetch)).toMatchObject({ ok: true, noindex: true });
  });
});

describe('inventory', () => {
  it('covers each legacy page in clean and .html form, blog posts and legacy blog URLs', () => {
    const inv = inventoryFrom({ legacyPages: ['index', 'about', 'blog', 'blog-details'], postSlugs: ['speed'] });
    expect(inv).toEqual(expect.arrayContaining(['/', '/index.html', '/about', '/about.html', '/blog', '/blog.html', '/blog/speed', '/blog-details?slug=speed', '/blog-details.html?slug=speed', '/da-ai/example-page']));
    expect(inv).not.toContain('/blog-details');
    expect(inventoryFrom({ legacyPages: [], postSlugs: [], legacyImages: ['L.png', 'embtel-logo.svg'] })).toEqual(expect.arrayContaining(['/images/L.png', '/images/embtel-logo.svg']));
    expect(new Set(inv).size).toBe(inv.length);
  });

  it('reads page URLs from a Search Console "Pages" export, keeping only this site', () => {
    const csv = 'Top pages,Clicks,Impressions\nhttps://www.embtelsolutions.com/dental-automation,12,300\n"https://www.embtelsolutions.com/blog-details?slug=speed",1,40\nhttps://other.example/x,1,1\n';
    expect(pathsFromSearchConsoleCsv(csv, 'www.embtelsolutions.com')).toEqual(['/dental-automation', '/blog-details?slug=speed']);
  });
});
