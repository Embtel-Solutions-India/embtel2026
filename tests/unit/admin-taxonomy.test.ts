import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

let current: { _id: string; role: string; name: string } | null = null;
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {} }));
vi.mock('@/lib/admin/revalidate', () => ({ refreshContent: () => {} }));
vi.mock('@/lib/auth/session', () => ({ getCurrentUser: async () => current }));

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const db = () => mongoose.connection.db!;
const svc = () => import('@/lib/admin/taxonomy');
const actorId = new mongoose.Types.ObjectId().toHexString();
const actor = { _id: actorId, role: 'admin', name: 'A' } as never;

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
  await db().collection('pages').insertMany([
    { slug: 'web-development', title: 'Web Development', status: 'published', type: 'service', blocks: [] },
    { slug: 'about', title: 'About', status: 'published', type: 'standard', blocks: [] },
    { slug: 'secret-landing', title: 'Secret', status: 'draft', type: 'landing', blocks: [] },
  ]);
});
afterAll(async () => mongo?.stop());

describe('categories', () => {
  it('creates with a slug, renames, and reports name conflicts in words', async () => {
    const { saveCategory } = await svc();
    const a = await saveCategory({ name: 'Automation', description: 'Automate' }, actor);
    expect(a.slug).toBe('automation');
    await saveCategory({ id: a.id, name: 'Business Automation', slug: 'automation', description: '' }, actor);
    expect((await db().collection('categories').findOne({ slug: 'automation' }))?.name).toBe('Business Automation');
    await expect(saveCategory({ name: 'business automation' }, actor)).rejects.toThrow(/already exists/);
    await expect(saveCategory({ name: 'Other', slug: 'automation' }, actor)).rejects.toThrow(/already/);
  });

  it('refuses to delete a category used by posts, deletes an unused one, and clears trashed references', async () => {
    const { saveCategory, deleteCategory } = await svc();
    const used = await saveCategory({ name: 'Used' }, actor);
    const unused = await saveCategory({ name: 'Unused' }, actor);
    const catId = new mongoose.Types.ObjectId(used.id);
    await db().collection('blogs').insertMany([
      { slug: 'live', title: 'L', category: catId, isDeleted: false, tags: [] },
      { slug: 'binned', title: 'B', category: new mongoose.Types.ObjectId(unused.id), isDeleted: true, tags: [] },
    ]);
    await expect(deleteCategory(used.id, actor)).rejects.toThrow(/Used by 1 post/);
    await deleteCategory(unused.id, actor);
    expect(await db().collection('categories').findOne({ slug: 'unused' })).toBeNull();
    expect((await db().collection('blogs').findOne({ slug: 'binned' }))?.category).toBeUndefined();
  });

  it('lists categories with live post counts', async () => {
    const { listTaxonomyAdmin } = await svc();
    const rows = await listTaxonomyAdmin('category');
    expect(rows.find((r) => r.slug === 'used')?.posts).toBe(1);
  });
});

describe('tags', () => {
  it('serviceSlug must be a published service or landing page', async () => {
    const { saveTag, serviceOptions } = await svc();
    const t = await saveTag({ name: 'Performance', serviceSlug: 'web-development' }, actor);
    expect((await db().collection('tags').findOne({ slug: t.slug }))?.serviceSlug).toBe('web-development');
    await expect(saveTag({ name: 'Bad', serviceSlug: 'about' }, actor)).rejects.toThrow(/service/i);
    await expect(saveTag({ name: 'Bad2', serviceSlug: 'secret-landing' }, actor)).rejects.toThrow(/service/i);
    expect((await serviceOptions()).map((o) => o.slug)).toEqual(['web-development']);
  });

  it('removes a deleted tag from trashed posts', async () => {
    const { saveTag, deleteTag } = await svc();
    const t = await saveTag({ name: 'Old Tag' }, actor);
    const id = new mongoose.Types.ObjectId(t.id);
    await db().collection('blogs').insertOne({ slug: 'old-binned', title: 'O', tags: [id], isDeleted: true });
    await deleteTag(t.id, actor);
    expect((await db().collection('blogs').findOne({ slug: 'old-binned' }))?.tags).toEqual([]);
  });
});

describe('permissions', () => {
  it('marketing can create but not delete', async () => {
    const { saveCategoryAction, deleteCategoryAction } = await import('@/app/admin/(panel)/categories/actions');
    current = { _id: new mongoose.Types.ObjectId().toHexString(), role: 'marketing', name: 'M' };
    expect(await saveCategoryAction({ name: 'Marketing Made' })).toMatchObject({ ok: true });
    const made = await db().collection('categories').findOne({ slug: 'marketing-made' });
    expect(await deleteCategoryAction({ id: String(made!._id) })).toMatchObject({ ok: false, error: 'You do not have permission to do that.' });
    expect(await db().collection('categories').findOne({ slug: 'marketing-made' })).not.toBeNull();
  });
});
