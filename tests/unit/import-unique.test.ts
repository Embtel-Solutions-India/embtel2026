import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PageSchema, type Block, type BlockOf } from '@/lib/content/blocks';
import { parseUniquePage, UNIQUE_PAGES } from '../../scripts/import-legacy/unique';

const load = (slug: string) => {
  const file = UNIQUE_PAGES.find((p) => p.slug === slug)!.file;
  return parseUniquePage(readFileSync(`embtel-final/${file}`, 'utf8'), slug);
};
const types = (blocks: Block[]) => blocks.map((b) => (b.type === 'cardGrid' || b.type === 'stats' || b.type === 'steps' || b.type === 'faq' || b.type === 'hero' ? `${b.type}:${b.variant}` : b.type));
const of = <T extends Block['type']>(blocks: Block[], t: T) => blocks.filter((b) => b.type === t) as BlockOf<T>[];

describe('unique legacy pages', () => {
  it('covers the 9 unique pages', () => {
    expect(UNIQUE_PAGES.map((p) => p.slug).sort()).toEqual(
      ['about', 'contact', 'home', 'industries', 'privacy-policy', 'process', 'services', 'terms-of-service', 'work'],
    );
  });

  it('home: 12 blocks in legacy order', () => {
    const p = load('home');
    expect(types(p.blocks)).toEqual([
      'hero:home', 'marquee', 'stats:bar', 'cardGrid:service', 'stats:counters', 'cardGrid:industry',
      'beforeAfter', 'comparisonTable', 'pills', 'cardGrid:why', 'testimonials', 'cta',
    ]);
    const [hero] = of(p.blocks, 'hero');
    expect(hero.heading).toBe('SMB Technology & *Automation Partner*');
    expect(hero.badge).toBe('USA Based');
    expect(hero.floatingCards).toHaveLength(3);
    const table = of(p.blocks, 'comparisonTable')[0];
    expect(table.columns).toEqual(['Embtel Solutions', 'Big Agency', 'Freelancer']);
    expect(table.rows).toHaveLength(8);
    expect(table.rows.every((r) => r.cells.length === 3)).toBe(true);
    expect(table.rows[1]).toEqual({
      label: 'Delivery Speed',
      cells: [{ status: 'check', text: '2–6 weeks' }, { status: 'cross', text: '3–6 months' }, { status: 'partial', text: 'Varies widely' }],
    });
    const counters = of(p.blocks, 'stats').find((s) => s.variant === 'counters')!;
    expect(counters.animate).toBe(true);
    expect(counters.items[0]).toMatchObject({ value: '12,400', suffix: '+', label: 'Hours Saved for Clients' });
    expect(of(p.blocks, 'marquee')[0].items).toEqual([...new Set(of(p.blocks, 'marquee')[0].items)]);
    expect(of(p.blocks, 'beforeAfter')[0].labels).toEqual({ before: 'Before Embtel', after: 'After Embtel' });
  });

  it('about: counters keep the number-first legacy order, 8 phases', () => {
    const p = load('about');
    expect(types(p.blocks)).toEqual(['hero:simple', 'split', 'timeline', 'phases', 'stats:counters', 'faq:accordion', 'cta']);
    expect(of(p.blocks, 'phases')[0].items).toHaveLength(8);
    expect(of(p.blocks, 'stats')[0].items[0]).toMatchObject({ value: '50', suffix: '+', label: 'Happy Clients' });
    expect(of(p.blocks, 'split')[0].image.src).toMatch(/^https:\/\/lh3\.googleusercontent\.com\//);
  });

  it('services: linked service cards and 6 process steps', () => {
    const p = load('services');
    expect(types(p.blocks)).toEqual(['hero:simple', 'cardGrid:service', 'stats:counters', 'steps:process', 'faq:accordion', 'cta']);
    const cards = of(p.blocks, 'cardGrid')[0];
    expect(cards.items).toHaveLength(9);
    expect(cards.items.every((i) => i.href?.startsWith('/'))).toBe(true);
    expect(of(p.blocks, 'steps')[0].items).toHaveLength(6);
  });

  it('industries, work and process', () => {
    expect(types(load('industries').blocks)).toEqual(['hero:page', 'cardGrid:industryLink', 'cta']);
    const work = load('work');
    expect(types(work.blocks)).toEqual(['hero:simple', 'workGrid', 'cta']);
    const item = of(work.blocks, 'workGrid')[0].items[0];
    expect(item).toMatchObject({ url: 'https://uso1visa.com/', fallbackEmoji: '🛂', theme: 'c1' });
    expect(item.logo?.src).toBe('https://www.google.com/s2/favicons?domain=uso1visa.com&sz=128');
    const process = load('process');
    expect(types(process.blocks)).toEqual(['hero:simple', 'steps:process', 'cardGrid:why', 'cta']);
    expect(of(process.blocks, 'steps')[0].items[0].week).toBe('Week 1');
  });

  it('contact: heading promoted to h1, 5 info items and the form slot', () => {
    const p = load('contact');
    expect(types(p.blocks)).toEqual(['hero:simple', 'contactInfo']);
    expect(of(p.blocks, 'hero')[0].heading).toBe("Let's build something *great together.*");
    const info = of(p.blocks, 'contactInfo')[0];
    expect(info.items).toHaveLength(5);
    expect(info.formSlot).toBe(true);
    expect(info.items[0]).toMatchObject({ label: 'Email', href: 'mailto:info@embtelsolutions.com' });
  });

  it('legal pages: rich text without the hand-written TOC', () => {
    const privacy = load('privacy-policy');
    expect(privacy.type).toBe('legal');
    expect(types(privacy.blocks)).toEqual(['hero:simple', 'richText']);
    const rt = of(privacy.blocks, 'richText')[0];
    expect(rt.toc).toBe(true);
    expect(rt.html).not.toContain('legal-toc');
    expect((rt.html.match(/<h2/g) ?? []).length).toBe(15);
    expect(of(privacy.blocks, 'hero')[0].meta).toBe('Effective date: January 1, 2026');
    expect(of(load('terms-of-service').blocks, 'richText')[0].toc).toBe(false);
  });

  it('every unique page passes PageSchema and imports deterministically', () => {
    for (const { slug } of UNIQUE_PAGES) {
      const a = load(slug);
      const r = PageSchema.safeParse(a);
      expect(r.success, `${slug}: ${r.success ? '' : JSON.stringify(r.error.issues[0])}`).toBe(true);
      expect(JSON.stringify(load(slug))).toBe(JSON.stringify(a));
    }
  });
});
