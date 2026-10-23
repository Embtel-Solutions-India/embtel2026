// Shared helpers for turning legacy embtel-final HTML into page blocks.
import * as cheerio from 'cheerio';
import type { Cheerio, CheerioAPI } from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { Block } from '../../src/lib/content/blocks';

export type $El = Cheerio<AnyNode>;
export type Handler = { match: (el: $El) => boolean; parse: (el: $El, $: CheerioAPI) => Block | Block[] };

export const load = (html: string) => cheerio.load(html);

export const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

// Text with <em>/<mark> turned into *emphasis* markup; <br> becomes a space.
export function inline(el: $El, $: CheerioAPI): string {
  const c = el.clone();
  c.find('br').replaceWith(' ');
  c.find('em, mark').each((_, n) => {
    $(n).replaceWith(`*${clean($(n).text())}*`);
  });
  return clean(c.text()).replace(/\*\s*\*/g, '');
}

export const text = (el: $El) => clean(el.text());
export const opt = (s: string) => (s ? s : undefined);

export function header(section: $El, $: CheerioAPI) {
  const hdr = section.find('.hdr').first();
  if (!hdr.length) return undefined;
  const eyebrow = opt(text(hdr.find('.stag').first()));
  const titleEl = hdr.find('.sh').first();
  const title = titleEl.length ? opt(inline(titleEl, $)) : undefined;
  const subtitle = opt(text(hdr.find('.sl').first()));
  return { eyebrow, title, subtitle, align: hdr.hasClass('center') ? ('center' as const) : undefined };
}

export function buttons(container: $El, $: CheerioAPI) {
  return container
    .find('a.btn-p, a.btn-g')
    .toArray()
    .map((a) => ({
      label: text($(a)),
      href: $(a).attr('href') ?? '#',
      variant: $(a).hasClass('btn-g') ? ('ghost' as const) : ('primary' as const),
    }));
}

// "35<em>+</em>" → { value: '35', suffix: '+' }
export function stat(el: $El) {
  const suffix = opt(text(el.find('em')));
  const v = el.clone();
  v.find('em').remove();
  return { value: text(v), ...(suffix && { suffix }) };
}

export function emoji(el: $El) {
  const v = text(el);
  return v ? { kind: 'emoji' as const, value: v } : null;
}

export const stripQuotes = (s: string) => s.replace(/^["“'‘]+|["”'’]+$/g, '');

// Walks the page's top-level sections in order; every section must match exactly one handler.
export function parseSections($: CheerioAPI, handlers: Handler[], slug: string): Block[] {
  const blocks: Block[] = [];
  $('body')
    .children()
    .each((_, node) => {
      const el = $(node);
      if (['site-header', 'site-footer'].includes(el.attr('id') ?? '') || node.type !== 'tag' || ['script', 'style'].includes(node.name)) return;
      const handler = handlers.find((h) => h.match(el));
      if (!handler) throw new Error(`[import] ${slug}: no handler for <${node.name} class="${el.attr('class') ?? ''}">`);
      const out = handler.parse(el, $);
      blocks.push(...(Array.isArray(out) ? out : [out]));
    });
  return blocks;
}

// Shell fields from <head>.
export function pageMeta($: CheerioAPI) {
  const title = clean($('title').text()).replace(/\s+[—|]\s+Embtel Solutions$/, '');
  const description = opt(clean($('meta[name="description"]').attr('content') ?? ''));
  const accent = /--ac:\s*(#[0-9a-fA-F]{6})/.exec($('style').text())?.[1] ?? '#1A6BFF';
  return { title, description, accent: accent.toUpperCase() };
}
