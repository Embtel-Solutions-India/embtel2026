import { describe, expect, it } from 'vitest';
import { BlockSchema, PageSchema } from '@/lib/content/blocks';
import { EXAMPLES } from '../helpers/block-examples';


const page = (over: Record<string, unknown> = {}) => ({
  slug: 'law-industry',
  title: 'Law Industry',
  status: 'published',
  type: 'industry',
  theme: { accent: '#1A6BFF' },
  blocks: [EXAMPLES[0]],
  seo: { noindex: false },
  locked: false,
  ...over,
});

describe('BlockSchema', () => {
  it('covers all 18 block types', () => {
    expect(new Set(EXAMPLES.map((b) => b.type)).size).toBe(18);
  });

  it.each(EXAMPLES.map((b) => [b.type, b] as const))('accepts a minimal %s', (_t, block) => {
    expect(BlockSchema.safeParse(block).success).toBe(true);
  });

  it('rejects a javascript: button href', () => {
    const bad = { type: 'cta', heading: 'x', buttons: [{ label: 'x', href: 'javascript:alert(1)' }] };
    expect(BlockSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an unknown block type', () => {
    expect(BlockSchema.safeParse({ type: 'pricing' }).success).toBe(false);
  });

  it('rejects a hero without a heading', () => {
    expect(BlockSchema.safeParse({ type: 'hero', variant: 'page' }).success).toBe(false);
  });
});

describe('PageSchema', () => {
  it('accepts a valid page', () => {
    expect(PageSchema.safeParse(page()).success).toBe(true);
  });

  it('rejects CSS injection through the accent', () => {
    expect(PageSchema.safeParse(page({ theme: { accent: 'red;background:url(x)' } })).success).toBe(false);
  });

  it('rejects a reserved slug', () => {
    expect(PageSchema.safeParse(page({ slug: 'admin' })).success).toBe(false);
  });

  it('rejects a malformed slug', () => {
    expect(PageSchema.safeParse(page({ slug: 'Law Industry' })).success).toBe(false);
  });
});
