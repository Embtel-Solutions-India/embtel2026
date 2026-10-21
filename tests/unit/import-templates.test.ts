import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PageSchema, type Block, type BlockOf } from '@/lib/content/blocks';
import { parseLegacyPage, TEMPLATED_SLUGS } from '../../scripts/import-legacy/templates';

const load = (slug: string) => parseLegacyPage(readFileSync(`embtel-final/${slug}.html`, 'utf8'), slug);
const of = <T extends Block['type']>(blocks: Block[], t: T) => blocks.filter((b) => b.type === t) as BlockOf<T>[];

describe('templated legacy pages', () => {
  it('covers 9 industry, 8 service and 4 automation pages', () => {
    expect(TEMPLATED_SLUGS).toHaveLength(21);
  });

  it('law-industry: hero with 4 stats, 6 features, 4 steps, 3 related, CTA', () => {
    const p = load('law-industry');
    expect(p.type).toBe('industry');
    expect(p.title).toBe('Law Industry');
    expect(p.blocks.map((b) => b.type)).toEqual(['hero', 'cardGrid', 'steps', 'cardGrid', 'cta']);
    const [hero] = of(p.blocks, 'hero');
    expect(hero.heading).toBe('Digital Solutions for *Law Firms*');
    expect(hero.breadcrumb).toEqual([{ label: 'Home', href: '/' }, { label: 'Industries', href: '/industries' }, { label: 'Law Industry' }]);
    expect(hero.stats).toEqual([
      { value: '35', suffix: '+', label: 'Law Firm Clients' },
      { value: '100', suffix: '%', label: 'Secure & Compliant' },
      { value: '50', suffix: '%', label: 'Time Saved' },
      { value: '24/7', label: 'Client Access' },
    ]);
    const [features, related] = of(p.blocks, 'cardGrid');
    expect(features.variant).toBe('feature');
    expect(features.items).toHaveLength(6);
    expect(features.header).toEqual({ eyebrow: 'What We Build', title: 'Solutions for *Legal Practices*', subtitle: 'Digital tools designed specifically for law firms, attorneys, and legal service providers.', align: 'center' });
    expect(related.variant).toBe('related');
    expect(related.items.map((i) => i.href)).toEqual(['/immigration-firm-industry', '/accounting-firm-industry', '/business-automation']);
    expect(of(p.blocks, 'steps')[0].items).toHaveLength(4);
    expect(of(p.blocks, 'cta')[0].heading).toBe('Ready to modernize your *legal practice?*');
  });

  it('cybersecurity: its own accent, accent-suffix stats, tech pills', () => {
    const p = load('cybersecurity');
    expect(p.type).toBe('service');
    expect(p.theme.accent).toBe('#A855F7');
    expect(of(p.blocks, 'hero')[0].stats?.[0]).toEqual({ value: '24', suffix: '/7', label: 'Monitoring' });
    expect(of(p.blocks, 'pills')).toHaveLength(1);
  });

  it('web-development pills keep their emoji icons', () => {
    const [pills] = of(load('web-development').blocks, 'pills');
    expect(pills.items[0]).toEqual({ icon: { kind: 'emoji', value: '⚛️' }, label: 'React' });
  });

  it('analytics-dashboards keeps the non-numeric first stat (accent suffix as in legacy)', () => {
    expect(of(load('analytics-dashboards').blocks, 'hero')[0].stats?.[0]).toEqual({ value: 'Real', suffix: '-Time', label: 'Live Data Updates' });
  });

  it('dental-automation: locked landing page with the legacy meta description', () => {
    const p = load('dental-automation');
    expect(p.type).toBe('landing');
    expect(p.locked).toBe(true);
    expect(p.title).toBe('Automation for Dental Clinics & Med Spas');
    expect(p.seo.metaDescription).toMatch(/^Automated reminders, AI booking, and smart recall campaigns fill chairs/);
    expect(p.blocks.map((b) => (b.type === 'cardGrid' ? `cardGrid:${b.variant}` : b.type))).toEqual([
      'hero', 'cardGrid:pain', 'steps', 'roi', 'cardGrid:trust', 'cardGrid:audit', 'faq', 'cta',
    ]);
    const [hero] = of(p.blocks, 'hero');
    expect(hero.buttons?.map((b) => b.href)).toContain('tel:+15109627900');
    expect(hero.breadcrumb?.[1]).toEqual({ label: 'AI Automation' });
    const pain = of(p.blocks, 'cardGrid').find((g) => g.variant === 'pain')!;
    expect(pain.items[0].title).toBe('A no-show costs me the slot and the staff time.');
    expect(of(p.blocks, 'roi')[0].math).toMatch(/= \*~\$1,600\/month recovered\*$/);
    expect(of(p.blocks, 'faq')[0]).toMatchObject({ variant: 'static' });
  });

  it('every templated page passes PageSchema', () => {
    for (const slug of TEMPLATED_SLUGS) {
      const p = load(slug);
      const r = PageSchema.safeParse(p);
      expect(r.success, `${slug}: ${r.success ? '' : JSON.stringify(r.error.issues[0])}`).toBe(true);
      expect(p.status).toBe('published');
    }
  });
});
