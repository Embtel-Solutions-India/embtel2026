import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

let current: unknown = null;
vi.mock('@/lib/auth/session', () => ({ getCurrentUser: async () => current }));

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const leads = () => mongoose.connection.db!.collection('leads');
const admin = { _id: new mongoose.Types.ObjectId(), role: 'admin' };
const marketing = { _id: new mongoose.Types.ObjectId(), role: 'marketing' };
const lead = (over: Record<string, unknown>) => ({
  firstName: 'Ann', lastName: 'Lee', email: 'ann@example.com', phone: '5105550100', businessName: '', service: 'Web Development',
  message: 'Hi', smsConsent: true, sourcePage: '/contact', utm: {}, gclid: '', forwardStatus: 'sent', forwardError: '', createdAt: new Date('2026-10-01'), ...over,
});
let failedId = '';

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
  await mongoose.connection.db!.collection('settings').insertOne({ key: 'site', integrations: { formspreeFormId: 'mzdwzgjr' } });
  const r = await leads().insertMany([
    lead({ email: 'formula@example.com', firstName: '=HYPERLINK("http://evil")', message: 'line1\nline2, "quoted"' }),
    lead({ email: 'failed@example.com', forwardStatus: 'failed', forwardError: 'Formspree HTTP 500', createdAt: new Date('2026-10-02') }),
  ]);
  failedId = String(r.insertedIds[1]);
});
afterAll(async () => mongo?.stop());
afterEach(() => vi.unstubAllGlobals());

describe('leads admin', () => {
  it('lists newest first and filters by forward status', async () => {
    const { listLeads } = await import('@/lib/admin/leads');
    expect((await listLeads({})).items.map((l) => l.email)).toEqual(['failed@example.com', 'formula@example.com']);
    expect((await listLeads({ status: 'failed' })).items.map((l) => l.email)).toEqual(['failed@example.com']);
    expect((await listLeads({ q: 'formula' })).items).toHaveLength(1);
  });

  it('CSV export neutralises spreadsheet formulas and quotes fields', async () => {
    const { leadsCsv } = await import('@/lib/admin/leads');
    const csv = await leadsCsv();
    expect(csv.split('\r\n')[0]).toContain('Email');
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(csv).toContain('"line1\nline2, ""quoted"""');
  });

  it('retry re-sends a failed lead to Formspree', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    current = marketing;
    const { retryLeadAction } = await import('@/app/admin/(panel)/leads/actions');
    expect(await retryLeadAction({ id: failedId })).toMatchObject({ ok: true, data: 'sent' });
    expect((await leads().findOne({ email: 'failed@example.com' }))?.forwardStatus).toBe('sent');
  });

  it('only admins delete', async () => {
    const { deleteLeadAction } = await import('@/app/admin/(panel)/leads/actions');
    current = marketing;
    expect(await deleteLeadAction({ id: failedId })).toMatchObject({ ok: false, error: 'You do not have permission to do that.' });
    current = admin;
    expect(await deleteLeadAction({ id: failedId })).toMatchObject({ ok: true });
    expect(await leads().findOne({ email: 'failed@example.com' })).toBeNull();
  });
});
