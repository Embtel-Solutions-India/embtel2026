import { describe, expect, it } from 'vitest';
import { sanitizeRichHtml } from '@/lib/content/sanitize';

describe('richText sanitises', () => {
  it('strips scripts, event handlers, iframes and javascript: links', () => {
    const { html } = sanitizeRichHtml(
      '<p onclick="x()">a</p><script>alert(1)</script><a href="javascript:alert(1)">l</a><iframe src="https://x"></iframe><img src=x onerror=alert(1)>',
    );
    expect(html).not.toMatch(/onclick|onerror|<script|<iframe|<img|javascript:/i);
    expect(html).toContain('<p>a</p>');
    expect(html).toContain('<a>l</a>');
  });

  it('adds slug ids to h2 headings and returns them', () => {
    const { html, headings } = sanitizeRichHtml('<h2>Data We Collect</h2><p>x</p><h2 id="contact">Contact Us</h2>');
    expect(html).toContain('<h2 id="data-we-collect">Data We Collect</h2>');
    expect(headings).toEqual([
      { id: 'data-we-collect', text: 'Data We Collect' },
      { id: 'contact', text: 'Contact Us' },
    ]);
  });

  it('keeps allowed classes only and adds rel=noopener to external links', () => {
    const { html } = sanitizeRichHtml(
      '<ul class="bullets evil"><li>x</li></ul><a href="https://example.com" target="_blank">e</a><a href="/privacy-policy">i</a><a href="mailto:a@b.co">m</a>',
    );
    expect(html).toContain('<ul class="bullets">');
    expect(html).toContain('<a href="https://example.com" rel="noopener">e</a>');
    expect(html).toContain('<a href="/privacy-policy">i</a>');
    expect(html).toContain('<a href="mailto:a@b.co">m</a>');
  });

  it('dedupes generated heading ids', () => {
    const { headings } = sanitizeRichHtml('<h2>Terms</h2><h2>Terms</h2>');
    expect(headings.map((h) => h.id)).toEqual(['terms', 'terms-2']);
  });
});

describe('post html sanitises', () => {
  it('keeps only https/internal images, with alt, lazy loading and async decoding', () => {
    const { html } = sanitizeRichHtml(
      '<img src="http://x/a.png" alt="h"><img src="data:image/png;base64,AAA" alt="d"><img src=x onerror="alert(1)"><img src="https://images.unsplash.com/p.jpg" alt="A"><img src="/images/logo.png" alt="L">',
      { images: true },
    );
    expect(html).not.toMatch(/http:\/\/x|data:|onerror/);
    expect(html).toContain('<img src="https://images.unsplash.com/p.jpg" alt="A" loading="lazy" decoding="async" />');
    expect(html).toContain('<img src="/images/logo.png" alt="L" loading="lazy" decoding="async" />');
    expect((html.match(/<img/g) ?? []).length).toBe(2);
  });

  it('keeps figures, captions and code blocks', () => {
    const { html } = sanitizeRichHtml('<figure><img src="https://a.b/c.png" alt="c"><figcaption>Cap</figcaption></figure><pre><code>x &lt; 1</code></pre>', { images: true });
    expect(html).toContain('<figcaption>Cap</figcaption>');
    expect(html).toContain('<pre><code>x &lt; 1</code></pre>');
  });

  it('richText (no images option) still strips images', () => {
    expect(sanitizeRichHtml('<img src="https://a.b/c.png" alt="c"><p>t</p>').html).toBe('<p>t</p>');
  });
});
