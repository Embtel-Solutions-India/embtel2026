import sanitizeHtml from 'sanitize-html';
import { toSlug } from '@/lib/slug';

const ALLOWED_CLASSES = ['legal-callout', 'legal-gov', 'bullets', 'contact-table', 'inline'];

const decode = (s: string) =>
  s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

// The only HTML content field (richText) goes through this allow-list. Anything not listed is dropped.
export function sanitizeRichHtml(input: string): { html: string; headings: { id: string; text: string }[] } {
  const clean = sanitizeHtml(input, {
    allowedTags: ['h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'blockquote', 'dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'br', 'hr', 'div', 'span'],
    allowedAttributes: { a: ['href', 'rel'], h2: ['id'], h3: ['id'], th: ['scope'], '*': ['class'] },
    allowedClasses: { '*': ALLOWED_CLASSES },
    allowedSchemes: ['https', 'http', 'mailto', 'tel'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tag, attribs) => {
        const out: Record<string, string> = {};
        if (attribs.href) out.href = attribs.href;
        if (/^https?:\/\//.test(attribs.href ?? '')) out.rel = 'noopener';
        return { tagName: tag, attribs: out };
      },
    },
  });

  const headings: { id: string; text: string }[] = [];
  const taken = new Set<string>();
  const html = clean.replace(/<h2(?: id="([^"]*)")?>([\s\S]*?)<\/h2>/g, (_m, existing: string | undefined, inner: string) => {
    const text = decode(inner);
    let id = existing && !taken.has(existing) ? existing : toSlug(text) || 'section';
    for (let n = 2; taken.has(id); n++) id = `${toSlug(text) || 'section'}-${n}`;
    taken.add(id);
    headings.push({ id, text });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  return { html, headings };
}
