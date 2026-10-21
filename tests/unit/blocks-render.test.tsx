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
