// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { PostArticle } from '@/components/blog/PostArticle';
import type { PublicPost } from '@/lib/content/posts';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} />,
}));

afterEach(cleanup);

const base: PublicPost = {
  id: '1',
  slug: 'speed',
  title: 'Is Your Website Speed Costing You Customers?',
  shortDescription: 'Short',
  featuredImage: 'https://images.unsplash.com/p.jpg',
  imageAltText: 'A stopwatch',
  category: { name: 'Web Development', slug: 'web-development' },
  readingTime: 5,
  publishedAt: '2026-09-01T09:00:00.000Z',
  content: '<p>Intro</p><h2>One</h2><p>a</p><h2>Two</h2><p>b</p><h2>Three</h2><p>c</p><script>alert(1)</script>',
  tags: [{ name: 'Performance', slug: 'performance', serviceSlug: 'web-development' }],
  author: { name: 'Embtel Team', slug: null, jobTitle: '', bio: '', avatar: '', sameAs: [], expertise: [] },
  faqs: [],
  keyTakeaways: [],
  sources: [],
  focusKeyword: '',
  secondaryKeywords: [],
  seo: { keywords: [], noindex: false },
  updatedAt: '2026-09-02T00:00:00.000Z',
  lastReviewedAt: null,
};

const URL = 'https://www.embtelsolutions.com/blog/speed';

describe('PostArticle', () => {
  it('renders the minimal post with one h1, a TOC, no empty optional sections, and no script', () => {
    const { container } = render(<PostArticle post={base} canonical={URL} related={[]} relatedServices={[]} />);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('nav[aria-label="On this page"]')).not.toBeNull();
    const headings = [...container.querySelectorAll('h2')].map((h) => h.textContent);
    expect(headings).not.toContain('Key takeaways');
    expect(headings).not.toContain('Frequently asked questions');
    expect(headings).not.toContain('Sources');
    expect(headings).not.toContain('Related articles');
    expect(container.textContent).toContain('Embtel Team');
    expect(container.querySelector('a[href^="/authors/"]')).toBeNull();
  });

  it('renders every optional section when present', () => {
    const post: PublicPost = {
      ...base,
      keyTakeaways: ['Speed is revenue'],
      faqs: [{ q: 'How fast is fast?', a: 'Under 2.5 seconds.' }],
      sources: [{ title: 'web.dev LCP', url: 'https://web.dev/articles/lcp' }],
      author: { ...base.author, name: 'Ritu Writer', slug: 'ritu-writer', bio: 'Writes.', jobTitle: 'Lead' },
    };
    const { container } = render(
      <PostArticle
        post={post}
        canonical={URL}
        related={[{ ...base, slug: 'other', title: 'Other post' }]}
        relatedServices={[{ title: 'Web Development', href: '/web-development' }]}
      />,
    );
    expect(container.querySelector('aside')?.textContent).toContain('Speed is revenue');
    expect(container.querySelector('details > summary')?.textContent).toBe('How fast is fast?');
    expect(container.querySelector('a[href="https://web.dev/articles/lcp"]')?.getAttribute('rel')).toBe('noopener');
    expect(container.querySelectorAll('a[href="/authors/ritu-writer"]').length).toBeGreaterThan(0);
    expect(container.querySelector('a[href="/web-development"]')).not.toBeNull();
    expect(container.querySelector('a[href="/blog/other"]')).not.toBeNull();
  });

  it('share links point to the canonical URL', () => {
    const { container } = render(<PostArticle post={base} canonical={URL} related={[]} relatedServices={[]} />);
    const share = [...container.querySelectorAll('[aria-label^="Share on"]')].map((a) => a.getAttribute('href') ?? '');
    expect(share).toHaveLength(3);
    for (const href of share) expect(decodeURIComponent(href)).toContain(URL);
  });

  it('renders no image element when the post has no featured image', () => {
    const { container } = render(<PostArticle post={{ ...base, featuredImage: null }} canonical={URL} related={[]} relatedServices={[]} />);
    expect(container.querySelector('.bd-img')).toBeNull();
  });
});
