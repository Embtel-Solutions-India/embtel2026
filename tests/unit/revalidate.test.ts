import { describe, expect, it, vi } from 'vitest';

const updateTag = vi.fn();
vi.mock('next/cache', () => ({ updateTag: (t: string) => updateTag(t), cacheTag: () => {}, cacheLife: () => {} }));

import { refreshContent } from '@/lib/admin/revalidate';

describe('refreshContent', () => {
  it('expires the public cache tags for what changed', () => {
    refreshContent({ posts: ['a'], taxonomy: true, pages: ['about'], settings: true });
    const tags = updateTag.mock.calls.map((c) => c[0]);
    expect(tags).toEqual(expect.arrayContaining(['posts', 'post:a', 'taxonomy', 'pages', 'page:about', 'settings']));
  });

  it('does nothing for an empty change', () => {
    updateTag.mockClear();
    refreshContent({});
    expect(updateTag).not.toHaveBeenCalled();
  });
});
