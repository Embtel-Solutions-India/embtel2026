import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { PageSchema } from '@/lib/content/blocks';
import { PAGE_FILES } from '../../content/pages';
import { getPublishedPage, indexPages, listPublishedPages, PAGE_SLUGS } from '@/lib/content/pages';

const files = readdirSync('content/pages').filter((f) => f.endsWith('.json'));

describe('bundled site pages', () => {
  it('content/pages/index.ts lists every page file', () => {
    expect(PAGE_FILES).toHaveLength(files.length);
    const listed = new Set((PAGE_FILES as { slug: string }[]).map((p) => p.slug));
    for (const f of files) expect(listed).toContain(JSON.parse(readFileSync(`content/pages/${f}`, 'utf8')).slug);
  });

  // The loader drops an invalid block (or page) at runtime; here it must fail instead, so it never ships.
  it.each(files)('%s is fully valid', (f) => {
    const r = PageSchema.safeParse(JSON.parse(readFileSync(`content/pages/${f}`, 'utf8')));
    expect(r.success ? [] : r.error.issues.map((i) => i.path.join('.'))).toEqual([]);
  });

  it('serves published pages by slug, including home', async () => {
    expect(PAGE_SLUGS.has('home')).toBe(true);
    const p = await getPublishedPage('law-industry');
    expect(p?.title).toBeTruthy();
    expect(p?.blocks.length).toBeGreaterThan(0);
  });

  it('returns null for a missing, reserved or malformed slug', async () => {
    expect(await getPublishedPage('nope')).toBeNull();
    expect(await getPublishedPage('admin')).toBeNull();
    expect(await getPublishedPage('../etc')).toBeNull();
  });

  it('never serves a draft or an invalid page', () => {
    const home = JSON.parse(readFileSync('content/pages/home.json', 'utf8'));
    const pages = indexPages([home, { ...home, slug: 'secret-draft', status: 'draft' }, { ...home, slug: 'bad-accent', theme: { accent: 'red;x' } }]);
    expect([...pages.keys()]).toEqual(['home']);
  });

  it('lists every published page once', async () => {
    const list = await listPublishedPages();
    expect(list.map((p) => p.slug)).toEqual([...PAGE_SLUGS]);
    expect(new Set(list.map((p) => p.slug)).size).toBe(list.length);
  });
});
