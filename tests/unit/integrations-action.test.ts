import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

let current: unknown = null;
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {} }));
vi.mock('@/lib/admin/revalidate', () => ({ refreshContent: () => {} }));
vi.mock('@/lib/auth/session', () => ({ getCurrentUser: async () => current }));

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
});
afterAll(async () => mongo?.stop());

const values = { googleAdsId: 'AW-18518114785', googleAdsConversionLabel: 'AbC-123_x', ga4Id: 'G-ABC123XYZ', gtmId: '', gscVerification: '', tawkPropertyId: '', tawkWidgetId: '', elfsightReviewsAppId: '', formspreeFormId: 'mzdwzgjr' };

describe('saveIntegrationsAction', () => {
  it('is admin-only', async () => {
    current = { _id: new mongoose.Types.ObjectId(), role: 'marketing' };
    const { saveIntegrationsAction } = await import('@/app/admin/(panel)/integrations/actions');
    expect(await saveIntegrationsAction(values)).toMatchObject({ ok: false, error: 'You do not have permission to do that.' });
  });

  it('saves valid ids and refuses malformed ones', async () => {
    current = { _id: new mongoose.Types.ObjectId(), role: 'admin' };
    const { saveIntegrationsAction } = await import('@/app/admin/(panel)/integrations/actions');
    expect(await saveIntegrationsAction({ ...values, ga4Id: "G-1');alert(1)" })).toMatchObject({ ok: false });
    expect(await saveIntegrationsAction(values)).toMatchObject({ ok: true });
    const { loadSiteSettings } = await import('@/lib/content/settings');
    expect((await loadSiteSettings()).integrations).toMatchObject({ ga4Id: 'G-ABC123XYZ', googleAdsConversionLabel: 'AbC-123_x', formspreeFormId: 'mzdwzgjr' });
  });
});
