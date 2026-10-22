import { expect, test } from '@playwright/test';

// Every URL form the legacy static site served must reach the same content in one 301 hop.
const CASES: [from: string, to: string][] = [
  ['/index.html', '/'],
  ['/about.html', '/about'],
  ['/dental-automation.html', '/dental-automation'],
  ['/privacy-policy.html', '/privacy-policy'],
  ['/blog.html', '/blog'],
  ['/blog-details?slug=website-speed-costing-you-customers', '/blog/website-speed-costing-you-customers'],
  ['/blog-details.html?slug=website-speed-costing-you-customers', '/blog/website-speed-costing-you-customers'],
  ['/blog-details', '/blog'],
  ['/da-ai', '/'],
  ['/da-ai/anything/here', '/'],
];

for (const [from, to] of CASES) {
  test(`${from} → 301 → ${to}`, async ({ request }) => {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status(), from).toBe(301);
    const location = new URL(res.headers()['location'], 'http://x').pathname;
    expect(location).toBe(to);
    expect((await request.get(location, { maxRedirects: 0 })).status()).toBe(200);
  });
}

test('an unknown .html page still ends in a real 404 (no redirect loop)', async ({ request }) => {
  const res = await request.get('/no-such-page.html');
  expect(res.status()).toBe(404);
});
