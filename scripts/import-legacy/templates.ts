// Section handlers for the templated legacy pages (service, industry, AI-automation landing).
import type { Block, Page } from '../../src/lib/content/blocks';
import { buttons, emoji, header, inline, load, opt, pageMeta, parseSections, stat, stripQuotes, text, type Handler } from './parse-common';

export const SERVICE_SLUGS = ['web-development', 'digital-marketing', 'business-automation', 'ai-integrations', 'analytics-dashboards', 'seo-geo', 'cybersecurity', 'e-commerce'];
export const INDUSTRY_SLUGS = ['accounting-firm-industry', 'cleaning-industry', 'cyber-security-industry', 'healthcare-industry', 'home-services-industry', 'immigration-firm-industry', 'it-industry', 'law-industry', 'retail-industry'];
export const LANDING_SLUGS = ['dental-automation', 'home-services-automation', 'real-estate-automation', 'restaurant-automation'];
export const TEMPLATED_SLUGS = [...SERVICE_SLUGS, ...INDUSTRY_SLUGS, ...LANDING_SLUGS];

const has = (sel: string): Handler['match'] => (el) => el.is(sel) || el.find(sel).length > 0;

export const TEMPLATE_HANDLERS: Handler[] = [
  {
    match: (el) => el.hasClass('svc-hero'),
    parse: (el, $) => {
      const crumbs = el.find('.breadcrumb').children('a, span').toArray().map((n) => $(n)).filter((c) => text(c) !== '›');
      const stats = el.find('.svc-stat').toArray().map((s) => ({ ...stat($(s).find('.svc-stat-n')), label: text($(s).find('.svc-stat-l')) }));
      const btns = buttons(el.find('.svc-btns'), $);
      return {
        type: 'hero',
        variant: 'page',
        ...(crumbs.length && { breadcrumb: crumbs.map((c) => (c.is('a') ? { label: text(c), href: c.attr('href')! } : { label: text(c) })) }),
        heading: inline(el.find('h1').first(), $),
        lead: opt(text(el.find('.svc-lead'))),
        ...(btns.length && { buttons: btns }),
        ...(stats.length && { stats }),
      };
    },
  },
  {
    match: has('.feat-grid'),
    parse: (el, $) => ({
      type: 'cardGrid',
      header: header(el, $),
      variant: 'feature',
      columns: 3,
      items: el.find('.feat-grid .fc').toArray().map((n) => {
        const icon = emoji($(n).find('.fc-ico, .fc-icon'));
        return { ...(icon && { icon }), title: text($(n).find('h3')), body: text($(n).find('p')) };
      }),
    }),
  },
  {
    match: has('.proc-grid .pc'),
    parse: (el, $) => ({
      type: 'steps',
      header: header(el, $),
      variant: 'compact',
      items: el.find('.proc-grid .pc').toArray().map((n) => ({ num: text($(n).find('.pc-num')), title: text($(n).find('h3')), body: text($(n).find('p')) })),
    }),
  },
  {
    match: has('.tech-wrap'),
    parse: (el, $) => ({
      type: 'pills',
      header: header(el, $),
      items: el.find('.tech-wrap .tp').toArray().map((n) => {
        const icon = emoji($(n).find('.tp-i'));
        return { ...(icon && { icon }), label: text($(n).find('span').not('.tp-i')) };
      }),
    }),
  },
  {
    match: has('.rel-grid'),
    parse: (el, $) => ({
      type: 'cardGrid',
      header: header(el, $),
      variant: 'related',
      columns: 3,
      items: el.find('.rel-grid a.rc').toArray().map((n) => ({ title: text($(n).find('h4')), body: text($(n).find('p')), href: $(n).attr('href')! })),
    }),
  },
  {
    match: has('.pain-grid'),
    parse: (el, $) => ({
      type: 'cardGrid',
      header: header(el, $),
      variant: 'pain',
      columns: 4,
      items: el.find('.pain-card').toArray().map((n) => ({ title: stripQuotes(text($(n).find('h3'))), body: text($(n).find('p')) })),
    }),
  },
  {
    match: has('.flow'),
    parse: (el, $) => ({
      type: 'steps',
      header: header(el, $),
      variant: 'flow',
      items: el.find('.flow-step').toArray().map((n) => ({ num: text($(n).find('.step-num')), title: text($(n).find('h3')), body: text($(n).find('p')) })),
    }),
  },
  {
    match: has('.roi-card'),
    parse: (el, $) => ({
      type: 'roi',
      header: header(el, $),
      math: inline(el.find('.roi-math'), $),
      assumptions: opt(text(el.find('.roi-assump'))),
      disclaimer: opt(text(el.find('.roi-disclaimer'))),
    }),
  },
  {
    match: has('.trust-grid'),
    parse: (el, $) => ({
      type: 'cardGrid',
      header: header(el, $),
      variant: 'trust',
      columns: 3,
      items: el.find('.trust-card').toArray().map((n) => ({ title: text($(n).find('h4')), body: text($(n).find('p')) })),
    }),
  },
  {
    match: has('.audit-grid'),
    parse: (el, $) => {
      const button = buttons(el.find('.audit-cta'), $)[0];
      return {
        type: 'cardGrid',
        header: header(el, $),
        variant: 'audit',
        columns: 3,
        items: el.find('.acard').toArray().map((n) => ({ num: text($(n).find('.an')), title: text($(n).find('h3')), body: text($(n).find('p')) })),
        ...(button && { button }),
      };
    },
  },
  {
    match: (el) => el.find('.faq .faq-item h4').length > 0,
    parse: (el, $) => ({
      type: 'faq',
      header: header(el, $),
      variant: 'static',
      items: el.find('.faq-item').toArray().map((n) => ({ q: text($(n).find('h4')), a: text($(n).find('p')) })),
    }),
  },
  {
    match: (el) => el.hasClass('cta-band'),
    parse: (el, $) => ({
      type: 'cta',
      heading: inline(el.find('h2').first(), $),
      body: opt(text(el.children('p').first())),
      buttons: buttons(el.find('.cta-btns'), $),
    }),
  },
];

const typeOf = (slug: string): Page['type'] =>
  SERVICE_SLUGS.includes(slug) ? 'service' : INDUSTRY_SLUGS.includes(slug) ? 'industry' : LANDING_SLUGS.includes(slug) ? 'landing' : 'standard';

// Removes keys whose value is undefined so the JSON output is stable and minimal.
export function compact<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export function buildPage(slug: string, html: string, blocks: Block[], type: Page['type'], extra: Partial<Page> = {}): Page {
  const meta = pageMeta(load(html));
  return compact({
    slug,
    title: meta.title,
    status: 'published',
    type,
    theme: { accent: meta.accent },
    blocks,
    seo: { ...(meta.description && { metaDescription: meta.description }), noindex: false },
    locked: type === 'landing',
    ...extra,
  } as Page);
}

export function parseLegacyPage(html: string, slug: string): Page {
  const $ = load(html);
  return buildPage(slug, html, parseSections($, TEMPLATE_HANDLERS, slug), typeOf(slug));
}
