import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

let current: unknown = null;
const refreshed: unknown[] = [];
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {} }));
vi.mock('@/lib/admin/revalidate', () => ({ refreshContent: (c: unknown) => refreshed.push(c) }));
vi.mock('@/lib/auth/session', () => ({ getCurrentUser: async () => current }));

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const admin = { _id: new mongoose.Types.ObjectId(), role: 'admin' };
const marketing = { _id: new mongoose.Types.ObjectId(), role: 'marketing' };
const nav = [{ label: 'Home', href: '/' }, { label: 'Services', href: '/services', children: [{ label: 'Web', href: '/web-development' }] }];

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
});
afterAll(async () => mongo?.stop());

describe('saveSettingsAction', () => {
  it('is refused for marketing', async () => {
    current = marketing;
    const { saveSettingsAction } = await import('@/app/admin/(panel)/settings/actions');
    expect(await saveSettingsAction({ section: 'headerNav', value: nav })).toMatchObject({ ok: false, error: 'You do not have permission to do that.' });
  });

  it('rejects an unsafe nav link with a field error and saves a valid menu', async () => {
    current = admin;
    const { saveSettingsAction } = await import('@/app/admin/(panel)/settings/actions');
    const bad = await saveSettingsAction({ section: 'headerNav', value: [{ label: 'X', href: 'javascript:alert(1)' }] });
    expect(bad).toMatchObject({ ok: false });
    expect(JSON.stringify(bad)).toMatch(/href/);
    expect(await saveSettingsAction({ section: 'headerNav', value: nav })).toMatchObject({ ok: true });
    const { loadSiteSettings } = await import('@/lib/content/settings');
    expect((await loadSiteSettings()).headerNav).toEqual(nav);
    expect(refreshed).toContainEqual({ settings: true });
  });

  it('saves the organization with an India office and refuses unknown sections', async () => {
    current = admin;
    const { saveSettingsAction } = await import('@/app/admin/(panel)/settings/actions');
    const org = { name: 'Embtel Solutions', address: { street: '1 Main St', city: 'Fremont', region: 'CA', postalCode: '94538' }, offices: [{ label: 'India office', street: '12 MG Road', city: 'Bengaluru', region: 'KA', postalCode: '560001', country: 'IN', phone: '' }] };
    expect(await saveSettingsAction({ section: 'organization', value: org })).toMatchObject({ ok: true });
    const { loadSiteSettings } = await import('@/lib/content/settings');
    expect((await loadSiteSettings()).organization.offices[0].country).toBe('IN');
    expect(await saveSettingsAction({ section: 'integrations', value: {} })).toMatchObject({ ok: false });
  });
});
