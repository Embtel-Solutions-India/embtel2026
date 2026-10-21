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
