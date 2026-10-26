import { describe, expect, it, vi } from 'vitest';

const updateTag = vi.fn();
const revalidateTag = vi.fn();
vi.mock('next/cache', () => ({ updateTag: (t: string) => updateTag(t), revalidateTag: (t: string, p: unknown) => revalidateTag(t, p), cacheTag: () => {}, cacheLife: () => {} }));

import { refreshContent } from '@/lib/admin/revalidate';

describe('refreshContent', () => {
  it('expires the public cache tags for what changed', () => {
    refreshContent({ posts: ['a'], taxonomy: true, settings: true });
    const tags = updateTag.mock.calls.map((c) => c[0]);
    expect(tags).toEqual(expect.arrayContaining(['posts', 'post:a', 'taxonomy', 'settings']));
  });

  it('allPosts expires every post cache', () => {
    updateTag.mockClear();
    refreshContent({ allPosts: true });
    expect(updateTag.mock.calls.map((c) => c[0])).toEqual(['posts']);
  });

  it('outside server actions (cron) expires immediately via revalidateTag', () => {
    updateTag.mockClear();
    refreshContent({ posts: ['b'] }, 'background');
    expect(updateTag).not.toHaveBeenCalled();
    expect(revalidateTag.mock.calls).toEqual(expect.arrayContaining([['posts', { expire: 0 }], ['post:b', { expire: 0 }]]));
  });

  it('does nothing for an empty change', () => {
    updateTag.mockClear();
    refreshContent({});
    expect(updateTag).not.toHaveBeenCalled();
  });
});
