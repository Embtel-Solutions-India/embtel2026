import 'server-only';
import { revalidateTag, updateTag } from 'next/cache';
import { POSTS_TAG, TAXONOMY_TAG, postTag } from '@/lib/content/posts';
import { SETTINGS_TAG } from '@/lib/content/settings';

// Expire the public caches an admin write affects, so the next public request shows it.
// 'action' (server actions): updateTag, so the editor sees their own change immediately.
// 'background' (route handlers such as the cron): updateTag is not allowed there, so revalidateTag with
// expire 0 — never serve the stale copy (e.g. a just-scheduled post's cached "not found" to Bing).
// allPosts: every post page and listing (all post caches carry POSTS_TAG), e.g. after a category rename.
export function refreshContent(change: { posts?: string[]; allPosts?: boolean; taxonomy?: boolean; settings?: boolean }, mode: 'action' | 'background' = 'action'): void {
  const tags = new Set<string>();
  if (change.allPosts) tags.add(POSTS_TAG);
  if (change.posts?.length) {
    tags.add(POSTS_TAG);
    for (const s of change.posts) tags.add(postTag(s));
  }
  if (change.taxonomy) tags.add(TAXONOMY_TAG);
  if (change.settings) tags.add(SETTINGS_TAG);
  for (const t of tags) {
    if (mode === 'action') updateTag(t);
    else revalidateTag(t, { expire: 0 });
  }
}
