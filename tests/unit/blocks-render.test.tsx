// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import type { Block } from '@/lib/content/blocks';
import { DEFAULT_SETTINGS } from '@/lib/content/settings';
import { EXAMPLES } from '../helpers/block-examples';

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
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {} }));

afterEach(cleanup);

const byType = <T extends Block['type']>(t: T) => EXAMPLES.find((b) => b.type === t) as Extract<Block, { type: T }>;
const renderBlocks = (blocks: Block[]) => render(<BlockRenderer blocks={blocks} settings={DEFAULT_SETTINGS} />);

describe('BlockRenderer', () => {
  it('renders exactly one h1, from the first hero', () => {
    const { container } = renderBlocks([
      byType('hero'),
      { ...byType('cardGrid'), header: { title: 'Why *us*' } },
      { ...byType('hero'), heading: 'Second hero' },
      byType('faq'),
      byType('cta'),
    ]);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('h1')?.textContent).toBe('Law Industry');
    expect([...container.querySelectorAll('h2')].map((h) => h.textContent)).toContain('Second hero');
  });

  it('FAQ accordion uses native details/summary', () => {
    const { container } = renderBlocks([byType('faq')]);
    expect(container.querySelector('details > summary')?.textContent).toContain('How long?');
  });

  it('static FAQ renders question headings', () => {
    const { container } = renderBlocks([{ ...byType('faq'), variant: 'static' }]);
    expect(container.querySelector('details')).toBeNull();
    expect(container.querySelector('h3')?.textContent).toBe('How long?');
  });

  it('counter HTML already contains the final value', () => {
    const { container } = renderBlocks([byType('stats')]);
    expect(container.textContent).toContain('50');
  });

  it('marquee duplicate copy is hidden from assistive tech', () => {
    const { container } = renderBlocks([byType('marquee')]);
    const groups = container.querySelectorAll('ul');
    expect(groups).toHaveLength(2);
    expect(groups[1].getAttribute('aria-hidden')).toBe('true');
  });

  it('linked cards render one link per card', () => {
    const grid: Block = {
      type: 'cardGrid',
      variant: 'service',
      columns: 3,
      items: [{ title: 'Web', body: 'Sites', href: '/web-development', linkLabel: 'Learn more' }],
    };
    const { container } = renderBlocks([grid]);
    expect(container.querySelectorAll('a')).toHaveLength(1);
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/web-development');
  });

  it('renders every common block type without throwing', () => {
    const common = ['hero', 'marquee', 'stats', 'cardGrid', 'steps', 'pills', 'faq', 'cta'] as const;
    for (const t of common) expect(() => renderBlocks([byType(t)])).not.toThrow();
  });

  it('rejects unknown block types at compile time', () => {
    // @ts-expect-error — 'pricing' is not a block type
    const bad: Block = { type: 'pricing' };
    expect(bad).toBeTruthy();
  });
});

describe('specialised blocks', () => {
  it('comparison table is a real table with column headers and text alternatives', () => {
    const { container } = renderBlocks([byType('comparisonTable')]);
    expect(container.querySelectorAll('table th[scope="col"]').length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('tbody th[scope="row"]')?.textContent).toBe('Speed');
    expect(container.textContent).toContain('Yes');
    expect(container.textContent).toContain('No');
  });

  it('rich text renders sanitised HTML with a table of contents', () => {
    const { container } = renderBlocks([
      { type: 'richText', toc: true, html: '<h2>Data We Collect</h2><p>x</p><script>alert(1)</script>' },
    ]);
    expect(container.querySelector('script')).toBeNull();
    const toc = container.querySelector('nav[aria-label="On this page"]');
    expect(toc?.querySelector('a')?.getAttribute('href')).toBe('#data-we-collect');
    expect(container.querySelector('h2#data-we-collect')).not.toBeNull();
  });

  it('testimonials render the widget only when an app id is configured', () => {
    const block = byType('testimonials');
    expect(renderBlocks([block]).container.querySelector('[class^="elfsight-app-"]')).toBeNull();
    cleanup();
    const settings = { ...DEFAULT_SETTINGS, integrations: { ...DEFAULT_SETTINGS.integrations, elfsightReviewsAppId: '0804c920-a003-45d4-8ceb-8f4b7a45f7e4' } };
    const { container } = render(<BlockRenderer blocks={[block]} settings={settings} />);
    expect(container.querySelector('.elfsight-app-0804c920-a003-45d4-8ceb-8f4b7a45f7e4')).not.toBeNull();
  });

  it('contact info renders the lead form with the SMS consent', () => {
    const { container } = renderBlocks([byType('contactInfo')]);
    expect(container.querySelector('form[aria-label="Contact form"]')).not.toBeNull();
    // Optional, unchecked opt-in (A2P 10DLC): never required to submit.
    expect(container.querySelector('#smsConsent:not([required]):not([checked])')).not.toBeNull();
    expect(container.querySelector('label[for="smsConsent"]')?.textContent).toContain('Reply STOP to opt out');
    expect(container.querySelector('a[href="mailto:info@embtelsolutions.com"]')).not.toBeNull();
  });

  it('work grid shows the emoji fallback when there is no logo', () => {
    const grid = { ...byType('workGrid'), items: [{ ...byType('workGrid').items[0], fallbackEmoji: '🛂' }] };
    const { container } = renderBlocks([grid]);
    expect(container.textContent).toContain('🛂');
  });

  it('renders every specialised block type without throwing', () => {
    const special = ['beforeAfter', 'comparisonTable', 'testimonials', 'contactInfo', 'workGrid', 'timeline', 'split', 'phases', 'roi', 'richText'] as const;
    for (const t of special) {
      const { container } = renderBlocks([byType(t)]);
      // Each block sits in a wrapper div; the wrapper must not be empty.
      expect(container.firstElementChild?.childElementCount, t).toBeGreaterThan(0);
      cleanup();
    }
  });
});
