// Section handlers for the 9 one-off legacy pages. Reuses the templated handlers for shared sections.
import type { CheerioAPI } from 'cheerio';
import type { Block, Page } from '../../src/lib/content/blocks';
import { buttons, clean, emoji, header, inline, load, opt, parseSections, stat, text, type $El, type Handler } from './parse-common';
import { buildPage, TEMPLATE_HANDLERS } from './templates';

export const UNIQUE_PAGES: { slug: string; file: string; type: Page['type'] }[] = [
  { slug: 'home', file: 'index.html', type: 'standard' },
  { slug: 'about', file: 'about.html', type: 'standard' },
  { slug: 'services', file: 'services.html', type: 'standard' },
  { slug: 'industries', file: 'industries.html', type: 'standard' },
  { slug: 'work', file: 'work.html', type: 'standard' },
  { slug: 'process', file: 'process.html', type: 'standard' },
  { slug: 'contact', file: 'contact.html', type: 'standard' },
  { slug: 'privacy-policy', file: 'privacy-policy.html', type: 'legal' },
  { slug: 'terms-of-service', file: 'terms-of-service.html', type: 'legal' },
];

const has = (sel: string): Handler['match'] => (el) => el.is(sel) || el.find(sel).length > 0;

// Google's favicon service has no icon for these client sites (404); the legacy page hid them via onerror.
const NO_FAVICON = ['xpertsportal.com'];

// A section's .hdr used as the page heading (pages whose legacy markup has no <h1>).
function heroFromHeader(el: $El, $: CheerioAPI): Block {
  const h = header(el, $)!;
  return { type: 'hero', variant: 'simple', ...(h.eyebrow && { badge: h.eyebrow }), heading: h.title!, ...(h.subtitle && { lead: h.subtitle }) };
}

// Counter values: data-target (animated), number-in-<em> (about page), or value<em>suffix</em>.
function counterValue(n: $El) {
  const target = n.find('.count[data-target]').attr('data-target');
  if (target) return { value: Number(target).toLocaleString('en-US'), ...(opt(text(n.find('em'))) && { suffix: text(n.find('em')) }) };
  const first = n.contents().first();
  if (first.is('em')) {
    const rest = n.clone();
    rest.find('em').first().remove();
    return { value: text(first), ...(opt(text(rest)) && { suffix: text(rest) }) };
  }
  return stat(n);
}

const counters = (el: $El, $: CheerioAPI, animate: boolean): Block => ({
  type: 'stats',
  header: header(el, $),
  variant: 'counters',
  animate,
  items: el.find('.ctr-wrap').toArray().map((w) => {
    const icon = emoji($(w).find('.ctr-icon'));
    return { ...(icon && { icon }), ...counterValue($(w).find('.ctr-num')), label: text($(w).find('.ctr-label')) };
  }),
});

const HANDLERS: Handler[] = [
  // ── home ──
  {
    match: (el) => el.hasClass('hero'),
    parse: (el, $) => ({
      type: 'hero',
      variant: 'home',
      badge: opt(text(el.find('.badge span'))),
      heading: inline(el.find('h1'), $),
      lead: opt(text(el.find('.hero-lead'))),
      buttons: buttons(el.find('.hero-btns'), $),
      floatingCards: el.find('.fcard').toArray().map((c) => ({ label: text($(c).find('.fc-label')), sub: opt(text($(c).find('.fc-sub'))), stat: opt(text($(c).find('.fc-stat'))) })),
    }),
  },
  {
    match: (el) => el.hasClass('marquee-section'),
    parse: (el, $) => ({ type: 'marquee', items: [...new Set(el.find('.mitem').toArray().map((m) => text($(m))))] }),
  },
  {
    match: (el) => el.hasClass('statsbar'),
    parse: (el, $) => ({
      type: 'stats',
      variant: 'bar',
      animate: false,
      items: el.find('.stat-n').toArray().map((n) => {
        const v = $(n).clone();
        const label = text(v.find('.stat-l'));
        v.find('.stat-l').remove();
        return { ...stat(v), label };
      }),
    }),
  },
  {
    match: (el) => el.hasClass('counter-section'),
    parse: (el, $) => counters(el, $, el.find('.count[data-target]').length > 0),
  },
  {
    match: has('.sg .sc'),
    parse: (el, $) => ({
      type: 'cardGrid',
      header: header(el, $),
      variant: 'service',
      columns: 3,
      items: el.find('.sg .sc').toArray().map((c) => {
        const href = $(c).is('a') ? $(c).attr('href') : undefined;
        return { title: text($(c).find('h3')), body: text($(c).find('p')), ...(href && { href, linkLabel: clean(text($(c).find('.sc-arr')).replace(/→$/, '')) }) };
      }),
      // e.g. home's "View All Services →" below the cards.
      ...(buttons(el, $)[0] && { button: buttons(el, $)[0] }),
    }),
  },
  {
    match: (el) => el.hasClass('who-section'),
    parse: (el, $) => ({
      type: 'cardGrid',
      header: header(el, $),
      variant: 'industry',
      columns: 3,
      items: el.find('.ind-card').toArray().map((c) => {
        const icon = emoji($(c).find('.ind-icon'));
        return { ...(icon && { icon }), title: text($(c).find('h3')), body: text($(c).find('p')), tags: $(c).find('.ind-tag').toArray().map((t) => text($(t))) };
      }),
    }),
  },
  {
    match: (el) => el.hasClass('ba-section'),
    parse: (el, $) => {
      const side = (s: $El) => ({ title: text(s.find('.ba-title')), steps: s.find('.ba-step').toArray().map((x) => text($(x))) });
      const first = el.find('.ba-row').first();
      return {
        type: 'beforeAfter',
        header: header(el, $),
        labels: { before: text(first.find('.ba-side-label.before')), after: text(first.find('.ba-side-label.after')) },
        rows: el.find('.ba-row').toArray().map((r) => ({
          before: side($(r).find('.ba-before')),
          after: { ...side($(r).find('.ba-after')), ...(opt(text($(r).find('.ba-saving'))) && { saving: text($(r).find('.ba-saving')) }) },
        })),
      };
    },
  },
  {
    match: (el) => el.hasClass('comp-section'),
    parse: (el, $) => {
      const button = buttons(el, $)[0];
      return {
        type: 'comparisonTable',
        header: header(el, $),
        columns: el.find('thead th').toArray().slice(1).map((th) => text($(th))),
        highlight: 0,
        rows: el.find('tbody tr').toArray().map((tr) => {
          const tds = $(tr).find('td').toArray();
          return {
            label: text($(tds[0])),
            cells: tds.slice(1).map((td) => {
              const mark = $(td).find('.check, .cross, .partial').first();
              const status = (['check', 'cross', 'partial'] as const).find((s) => mark.hasClass(s)) ?? 'partial';
              const t = clean(text($(td)).replace(/^[✓✗~]\s*/, ''));
              return { status, ...(t && { text: t }) };
            }),
          };
        }),
        ...(button && { button }),
      };
    },
  },
  {
    match: (el) => el.hasClass('stack-section'),
    parse: (el, $) => ({ type: 'pills', header: header(el, $), items: el.find('.stack-pill').toArray().map((p) => ({ label: text($(p)) })) }),
  },
  {
    match: (el) => el.hasClass('why-section') || el.find('.why-grid .sc').length > 0,
    parse: (el, $) => ({
      type: 'cardGrid',
      header: header(el, $),
      variant: 'why',
      columns: 3,
      items: el.find('.why-card, .why-grid .sc').toArray().map((c) => ({ title: text($(c).find('h3')), body: text($(c).find('p')) })),
    }),
  },
  {
    match: (el) => el.find('[class^="elfsight-app-"]').length > 0,
    parse: (el, $) => ({ type: 'testimonials', header: header(el, $), provider: 'elfsight' }),
  },
  // ── about ──
  {
    match: (el) => el.hasClass('about-hero'),
    parse: (el, $) => ({ type: 'hero', variant: 'simple', badge: opt(text(el.find('.stag'))), heading: inline(el.find('h1'), $), lead: opt(text(el.find('p').first())) }),
  },
  {
    match: has('.story-wrap'),
    parse: (el, $) => {
      const img = el.find('.story-img img');
      return {
        type: 'split',
        image: { src: img.attr('src')!, alt: img.attr('alt') ?? '', width: 800, height: 600 },
        eyebrow: opt(text(el.find('.story-text .stag'))),
        heading: inline(el.find('.story-text .sh'), $),
        paragraphs: el.find('.story-text p').toArray().map((p) => text($(p))),
      };
    },
  },
  {
    match: (el) => el.hasClass('evolution-section'),
    parse: (el, $) => ({
      type: 'timeline',
      header: header(el, $),
      rows: el.find('tbody tr').toArray().map((tr) => ({
        period: text($(tr).find('.evolution-period')),
        era: text($(tr).find('.evolution-era')),
        focus: text($(tr).find('.evolution-focus')),
      })),
    }),
  },
  {
    match: (el) => el.hasClass('phases-section'),
    parse: (el, $) => ({
      type: 'phases',
      header: header(el, $),
      items: el.find('.phase-block').toArray().map((b) => ({
        number: text($(b).find('.phase-number')),
        title: text($(b).find('.phase-title')),
        desc: text($(b).find('.phase-desc')),
        cards: $(b).find('.service-card').toArray().map((c) => ({ name: text($(c).find('.service-name')), desc: text($(c).find('.service-desc')) })),
      })),
    }),
  },
  {
    match: has('.faq-wrap'),
    parse: (el, $) => ({
      type: 'faq',
      header: header(el, $),
      variant: 'accordion',
      items: el.find('.faq-item').toArray().map((f) => ({ q: text($(f).find('.faq-q span')), a: text($(f).find('.faq-a')) })),
    }),
  },
  // ── services / industries ──
  {
    match: (el) => el.hasClass('services-hero'),
    parse: (el, $) => {
      const crumbs = el.find('.breadcrumb').children('a, span').toArray().map((n) => $(n)).filter((c) => text(c) !== '›');
      return {
        type: 'hero',
        variant: 'simple',
        breadcrumb: crumbs.map((c) => (c.is('a') ? { label: text(c), href: c.attr('href')! } : { label: text(c) })),
        heading: inline(el.find('.sh').first(), $),
        lead: opt(text(el.find('.sl').first())),
        buttons: buttons(el, $),
      };
    },
  },
  {
    match: has('.ind-grid'),
    parse: (el, $) => ({
      type: 'cardGrid',
      header: header(el, $),
      variant: 'industryLink',
      columns: 3,
      items: el.find('.ind-grid a.ic').toArray().map((c) => ({
        title: text($(c).find('h3')),
        body: text($(c).find('p')),
        href: $(c).attr('href')!,
        linkLabel: clean(text($(c).find('.ic-link')).replace(/→$/, '')),
      })),
    }),
  },
  // ── work / process: page heading and first content share one section ──
  {
    match: has('.wg'),
    parse: (el, $) => [
      heroFromHeader(el, $),
      {
        type: 'workGrid',
        items: el.find('.wc').toArray().map((c) => {
          const img = $(c).find('.wc-img img');
          const theme = (['c1', 'c2', 'c3', 'c4'] as const).find((t) => $(c).find('.wc-img').hasClass(t)) ?? 'c1';
          return {
            title: text($(c).find('h3')),
            body: text($(c).find('.wc-body > p')),
            url: opt($(c).find('h3 a').attr('href') ?? ''),
            ...(img.length && !NO_FAVICON.some((d) => img.attr('src')!.includes(d)) && { logo: { src: img.attr('src')!, alt: img.attr('alt') ?? '' } }),
            fallbackEmoji: opt(text($(c).find('.wc-img span'))),
            theme,
            tags: $(c).find('.wc-tags .tag').toArray().map((t) => ({ label: text($(t)), tone: (['b', 't', 'o'] as const).find((k) => $(t).hasClass(`tag-${k}`)) ?? 'b' })),
            metrics: $(c).find('.wm').toArray().map((m) => ({ n: text($(m).find('.wm-n')), l: text($(m).find('.wm-l')) })),
          };
        }),
      },
    ],
  },
  {
    match: has('.proc-grid .proc-card'),
    parse: (el, $) => {
      const steps: Block = {
        type: 'steps',
        variant: 'process',
        items: el.find('.proc-card').toArray().map((c) => ({
          num: text($(c).find('.proc-num')),
          ...(opt(text($(c).find('.proc-week'))) && { week: text($(c).find('.proc-week')) }),
          title: text($(c).find('h3')),
          body: text($(c).find('p')),
        })),
      };
      // On /process this section carries the page heading; on /services it is an ordinary section.
      const isPageTop = el.prev().is('#site-header') || el.prevAll('section, div').filter((_, n) => !['site-header'].includes($(n).attr('id') ?? '')).length === 0;
      return isPageTop ? [heroFromHeader(el, $), steps] : { ...steps, header: header(el, $) };
    },
  },
  // ── contact ──
  {
    match: has('.contact-wrap'),
    parse: (el, $) => {
      const info = el.find('.contact-info');
      const items = info.find('.ci-item').toArray().map((it) => {
        const label = text($(it).find('strong'));
        const value = text($(it).find('span'));
        const href = /^email$/i.test(label) ? `mailto:${value}` : /whatsapp/i.test(label) ? `https://wa.me/${value.replace(/\D/g, '')}` : undefined;
        const icon = emoji($(it).find('.ci-ico'));
        return { ...(icon && { icon }), label, value, ...(href && { href }) };
      });
      return [
        { type: 'hero', variant: 'simple', badge: opt(text(info.find('.stag'))), heading: inline(info.find('h2'), $), lead: opt(text(info.children('p').first())) },
        { type: 'contactInfo', items, formSlot: true },
      ];
    },
  },
  // ── legal ──
  {
    match: (el) => el.hasClass('legal-hero'),
    parse: (el, $) => ({
      type: 'hero',
      variant: 'simple',
      badge: opt(text(el.find('.legal-tag'))),
      heading: inline(el.find('h1'), $),
      lead: opt(text(el.find('.legal-hero-in > p').first())),
      meta: opt(text(el.find('.legal-meta'))),
    }),
  },
  {
    match: (el) => el.hasClass('legal-body'),
    parse: (el, $) => {
      const toc = el.find('.legal-toc').length > 0;
      const body = el.clone();
      body.find('.legal-toc').remove();
      return { type: 'richText', toc, html: clean($.html(body.contents()) ?? '') };
    },
  },
];

export function parseUniquePage(html: string, slug: string): Page {
  const page = UNIQUE_PAGES.find((p) => p.slug === slug);
  if (!page) throw new Error(`[import] unknown unique page ${slug}`);
  const $ = load(html);
  // Unique handlers first: some shared classes (e.g. .proc-grid) mean different things here.
  const blocks = parseSections($, [...HANDLERS, ...TEMPLATE_HANDLERS], slug);
  return buildPage(slug, html, blocks, page.type, { locked: false });
}
