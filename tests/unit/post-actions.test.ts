import { beforeEach, describe, expect, it, vi } from 'vitest';

let current: { _id: string; role: string } | null = null;
const calls: string[] = [];
vi.mock('@/lib/auth/session', () => ({ getCurrentUser: async () => current }));
vi.mock('@/lib/admin/posts', async () => {
  const { PostInputSchema } = await import('@/lib/admin/post-schema');
  const rec = (name: string) => async () => {
    calls.push(name);
    return { id: 'x', slug: 'x', updatedAt: '', status: 'draft' };
  };
  return {
    PostInputSchema,
    savePost: rec('save'),
    trashPost: rec('trash'),
    restorePost: rec('restore'),
    duplicatePost: rec('duplicate'),
    deletePostPermanently: rec('delete'),
  };
});

import { deletePostAction, savePostAction, trashPostAction } from '@/app/admin/(panel)/posts/actions';
import { withOffset } from '@/lib/admin/time';

const ID = '0123456789abcdef01234567';
const input = { title: 'T', shortDescription: 'S', content: '<p>x</p>', status: 'published', expectedUpdatedAt: null };

beforeEach(() => {
  calls.length = 0;
  current = { _id: 'u', role: 'marketing' };
});

describe('post actions', () => {
  it('marketing cannot permanently delete', async () => {
    expect(await deletePostAction({ id: ID })).toMatchObject({ ok: false });
    expect(calls).toEqual([]);
  });

  it('admin can permanently delete', async () => {
    current = { _id: 'a', role: 'admin' };
    expect(await deletePostAction({ id: ID })).toMatchObject({ ok: true });
    expect(calls).toEqual(['delete']);
  });

  it('marketing can publish and trash', async () => {
    expect(await savePostAction(input)).toMatchObject({ ok: true });
    expect(await trashPostAction({ id: ID })).toMatchObject({ ok: true });
    expect(calls).toEqual(['save', 'trash']);
  });

  it('rejects a malformed id before reaching the service', async () => {
    expect(await trashPostAction({ id: '{"$ne":null}' })).toMatchObject({ ok: false });
    expect(calls).toEqual([]);
  });
});

describe('withOffset', () => {
  it('turns a datetime-local value into an ISO string with the browser offset', () => {
    const v = withOffset('2026-11-01T09:00');
    expect(v).toMatch(/^2026-11-01T09:00:00[+-]\d{2}:\d{2}$/);
    expect(new Date(v).getTime()).toBe(new Date('2026-11-01T09:00').getTime());
  });
});
