import { describe, expect, it, vi } from 'vitest';

const getPublishedPost = vi.fn();
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), connection: async () => {} }));
vi.mock('@/lib/content/posts', () => ({ getPublishedPost }));
vi.mock('@/lib/content/page-index', () => ({ isKnownPath: async (p: string) => p === '/blog/real' }));
vi.mock('@/lib/seo/og', () => ({ renderOgImage: async () => new Response('png') }));

describe('post OG route', () => {
  it('never touches the cached post loader for unknown slugs (no cache entries for random URLs)', async () => {
    const { GET } = await import('@/app/(site)/blog/[slug]/opengraph-image/route');
    const res = await GET(new Request('https://www.embtelsolutions.com/blog/random/opengraph-image'), { params: Promise.resolve({ slug: 'random' }) });
    expect(res.status).toBe(307);
    expect(getPublishedPost).not.toHaveBeenCalled();
  });
});
