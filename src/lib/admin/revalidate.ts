import 'server-only';
import { updateTag } from 'next/cache';
import { PAGES_TAG, pageTag } from '@/lib/content/pages';
import { POSTS_TAG, TAXONOMY_TAG, postTag } from '@/lib/content/posts';
import { SETTINGS_TAG } from '@/lib/content/settings';

// Expire the public caches an admin write affects, so the next public request shows it.
// updateTag (not revalidateTag): the editor should see their own change immediately.
export function refreshContent(change: { posts?: string[]; taxonomy?: boolean; pages?: string[]; settings?: boolean }): void {
  const tags = new Set<string>();
  if (change.posts?.length) {
    tags.add(POSTS_TAG);
    for (const s of change.posts) tags.add(postTag(s));
  }
  if (change.taxonomy) tags.add(TAXONOMY_TAG);
  if (change.pages?.length) {
    tags.add(PAGES_TAG);
    for (const s of change.pages) tags.add(pageTag(s));
  }
  if (change.settings) tags.add(SETTINGS_TAG);
  for (const t of tags) updateTag(t);
}
