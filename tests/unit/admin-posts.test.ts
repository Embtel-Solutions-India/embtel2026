import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

const refreshed: unknown[] = [];
const pinged: string[][] = [];
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {} }));
vi.mock('@/lib/admin/revalidate', () => ({ refreshContent: (c: unknown) => refreshed.push(c) }));
vi.mock('@/lib/seo/indexnow', () => ({ pingIndexNowPaths: async (p: string[]) => void pinged.push(p) }));

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
type U = import('@/lib/db/models/User').UserDoc;
let admin: U;
let writer: U;
let other: U;

const svc = () => import('@/lib/admin/posts');
const base = (over: Record<string, unknown> = {}) => ({
  title: 'Website Speed Matters',
  shortDescription: 'Why speed matters',
  content: '<p>Fast sites win.</p>',
  status: 'draft',
  expectedUpdatedAt: null,
  ...over,
});
async function save(over: Record<string, unknown>, user: U = writer) {
  const { PostInputSchema, savePost } = await svc();
  return savePost(PostInputSchema.parse(base(over)), user);
}
const doc = async (id: string) => {
  const { Blog } = await import('@/lib/db/models/Blog');
  return Blog.findById(id).setOptions({ includeDeleted: true }).lean();
};

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
  const { User } = await import('@/lib/db/models/User');
  const pw = () => new mongoose.Types.ObjectId().toHexString();
  admin = await User.create({ name: 'Ada Admin', email: 'ada@example.com', password: pw(), role: 'admin' });
  writer = await User.create({ name: 'Wes Writer', email: 'wes@example.com', password: pw(), role: 'marketing' });
  other = await User.create({ name: 'Ola Other', email: 'ola@example.com', password: pw(), role: 'marketing' });
});

afterAll(async () => mongo?.stop());
beforeEach(() => {
  refreshed.length = 0;
  pinged.length = 0;
});

describe('savePost', () => {
  it('creates a draft with a slug from the title and a reading time; drafts are not public', async () => {
    const { id, slug } = await save({ title: 'Draft One', content: `<p>${'word '.repeat(500)}</p>` });
    expect(slug).toBe('draft-one');
    const d = await doc(id);
    expect(d?.readingTime).toBe(3);
    expect(d?.publishedAt).toBeUndefined();
    const { loadPost } = await import('@/lib/content/posts');
    expect(await loadPost('draft-one')).toBeNull();
    expect(pinged).toEqual([]);
  });

  it('post html is sanitised on save', async () => {
    const { id } = await save({ title: 'Xss', content: '<p onclick="x()">ok</p><script>alert(1)</script><a href="javascript:alert(1)">l</a><img src="x" onerror="y()">' });
    const html = (await doc(id))!.content;
    expect(html).not.toMatch(/script|onclick|onerror|javascript:/);
    expect(html).toContain('ok');
  });

  it('gives a duplicate title a -2 slug', async () => {
    await save({ title: 'Same Title' });
    expect((await save({ title: 'Same Title' })).slug).toBe('same-title-2');
  });

  it('publishing sets publishedAt, makes the post public and refreshes caches + IndexNow', async () => {
    const { id, slug } = await save({ title: 'Go Live', status: 'published' });
    expect((await doc(id))?.publishedAt).toBeInstanceOf(Date);
    const { loadPost } = await import('@/lib/content/posts');
    expect(await loadPost(slug)).not.toBeNull();
    expect(refreshed).toContainEqual(expect.objectContaining({ posts: [slug] }));
    expect(pinged).toEqual([[`/blog/${slug}`]]);
  });

  it('published slug is locked; draft slug is editable', async () => {
    const d = await save({ title: 'Renamable' });
    const cur = await doc(d.id);
    const renamed = await save({ id: d.id, slug: 'renamed', expectedUpdatedAt: cur!.updatedAt!.toISOString() });
    expect(renamed.slug).toBe('renamed');

    const p = await save({ title: 'Locked', status: 'published' });
    const now = await doc(p.id);
    await expect(save({ id: p.id, title: 'Locked', slug: 'other', status: 'published', expectedUpdatedAt: now!.updatedAt!.toISOString() })).rejects.toThrow(/address/i);
  });

  it('scheduled in the future stays hidden; scheduled in the past publishes now', async () => {
    const f = await save({ title: 'Future', status: 'scheduled', scheduledAt: '2099-01-01T09:00:00-05:00' });
    const fd = await doc(f.id);
    expect(fd?.status).toBe('scheduled');
    expect(fd?.scheduledAt?.toISOString()).toBe('2099-01-01T14:00:00.000Z');
    const { loadPost } = await import('@/lib/content/posts');
    expect(await loadPost(f.slug)).toBeNull();

    const p = await save({ title: 'Past', status: 'scheduled', scheduledAt: '2020-01-01T09:00:00Z' });
    const pd = await doc(p.id);
    expect(pd?.status).toBe('published');
    expect(await loadPost(p.slug)).not.toBeNull();
  });

  it('requires scheduledAt with a time zone offset when scheduling', async () => {
    const { PostInputSchema } = await svc();
    expect(PostInputSchema.safeParse(base({ status: 'scheduled' })).success).toBe(false);
    expect(PostInputSchema.safeParse(base({ status: 'scheduled', scheduledAt: '2099-01-01T09:00' })).success).toBe(false);
  });

  it('stale save is rejected', async () => {
    const d = await save({ title: 'Shared' });
    const loaded = (await doc(d.id))!.updatedAt!.toISOString();
    await new Promise((r) => setTimeout(r, 5));
    await save({ id: d.id, title: 'Shared v2', expectedUpdatedAt: loaded });
    await expect(save({ id: d.id, title: 'Shared stale', expectedUpdatedAt: loaded })).rejects.toThrow(/changed by someone else/);
    expect((await doc(d.id))?.title).toBe('Shared v2');
  });

  it('marketing can only credit themselves; admins can credit anyone', async () => {
    await expect(save({ title: 'Ghost', authorId: String(other._id) }, writer)).rejects.toThrow(/yourself/i);
    const own = await save({ title: 'Mine', authorId: String(writer._id) }, writer);
    expect(String((await doc(own.id))?.author)).toBe(String(writer._id));
    const byAdmin = await save({ title: 'Theirs', authorId: String(other._id) }, admin);
    expect(String((await doc(byAdmin.id))?.author)).toBe(String(other._id));
  });

  it('drops images from disallowed hosts', async () => {
    const { PostInputSchema } = await svc();
    expect(PostInputSchema.safeParse(base({ featuredImage: 'https://evil.example/x.png' })).success).toBe(false);
    expect(PostInputSchema.safeParse(base({ featuredImage: 'https://images.unsplash.com/x.png' })).success).toBe(true);
  });
});

describe('trash, restore, duplicate, delete', () => {
  it('trash hides a public post, lists it in trash, and restore brings it back', async () => {
    const { trashPost, restorePost, listAdminPosts } = await svc();
    const p = await save({ title: 'Trash Me', status: 'published' });
    await trashPost(p.id, writer);
    const { loadPost } = await import('@/lib/content/posts');
    expect(await loadPost(p.slug)).toBeNull();
    expect((await listAdminPosts({ status: 'trash' })).items.map((r) => r.id)).toContain(p.id);
    expect((await listAdminPosts({})).items.map((r) => r.id)).not.toContain(p.id);
    await restorePost(p.id, writer);
    expect(await loadPost(p.slug)).not.toBeNull();
  });

  it('permanent delete only works on trashed posts', async () => {
    const { trashPost, deletePostPermanently } = await svc();
    const p = await save({ title: 'Delete Me' });
    await expect(deletePostPermanently(p.id, admin)).rejects.toThrow(/trash/i);
    await trashPost(p.id, admin);
    await deletePostPermanently(p.id, admin);
    expect(await doc(p.id)).toBeNull();
  });

  it('duplicate is an unpublished draft with a new slug', async () => {
    const { duplicatePost } = await svc();
    const p = await save({ title: 'Original', status: 'published' });
    const copy = await duplicatePost(p.id, writer);
    const d = await doc(copy.id);
    expect(d?.title).toBe('Original (copy)');
    expect(d?.status).toBe('draft');
    expect(d?.slug).not.toBe(p.slug);
    expect(d?.publishedAt).toBeUndefined();
  });
});

describe('listAdminPosts and getAdminPost', () => {
  it('filters by status and search, and getAdminPost returns trashed posts with updatedAt', async () => {
    const { listAdminPosts, getAdminPost, trashPost } = await svc();
    await save({ title: 'Findable Zebra' });
    const drafts = await listAdminPosts({ status: 'draft', q: 'zebra' });
    expect(drafts.items.map((r) => r.title)).toEqual(['Findable Zebra']);
    const t = await save({ title: 'Trashed Lookup' });
    await trashPost(t.id, writer);
    const got = await getAdminPost(t.id);
    expect(got?.isDeleted).toBe(true);
    expect(typeof got?.updatedAt).toBe('string');
    expect(await getAdminPost('not-an-id')).toBeNull();
  });
});
