import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const leads = () => mongoose.connection.db!.collection('leads');
const valid = (over: Record<string, unknown> = {}) => ({
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '+1 (510) 555-0100',
  businessName: 'Doe Dental',
  service: 'Business Automation',
  message: 'We need appointment reminders.',
  smsConsent: true,
  website: '', // honeypot
  ...over,
});
const meta = (ip = '203.0.113.1') => ({ ip, sourcePage: '/contact', utm: { source: 'google', medium: 'cpc', campaign: 'dental' }, gclid: 'abc123' });

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
  await mongoose.connection.db!.collection('settings').insertOne({ key: 'site', integrations: { formspreeFormId: 'mzdwzgjr' } });
});
afterAll(async () => mongo?.stop());
beforeEach(() => vi.stubGlobal('fetch', vi.fn(async () => new Response('{"ok":true}', { status: 200 }))));
afterEach(() => vi.unstubAllGlobals());

describe('submitLead', () => {
  it('saves the lead with source/UTM/gclid and forwards it to Formspree', async () => {
    const { submitLead } = await import('@/lib/leads/submit');
    expect(await submitLead(valid(), meta())).toEqual({ ok: true });
    const l = await leads().findOne({ email: 'jane@example.com' });
    expect(l).toMatchObject({ firstName: 'Jane', service: 'Business Automation', smsConsent: true, sourcePage: '/contact', gclid: 'abc123', forwardStatus: 'sent', utm: { source: 'google', campaign: 'dental' } });
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://formspree.io/f/mzdwzgjr');
    expect(JSON.parse(init.body)).toMatchObject({ email: 'jane@example.com', smsConsent: 'yes' });
    expect(l).not.toHaveProperty('ip');
  });

  it('requires SMS consent and valid fields', async () => {
    const { submitLead } = await import('@/lib/leads/submit');
    const r = await submitLead(valid({ smsConsent: false, email: 'nope', phone: 'call me' }), meta('203.0.113.2'));
    expect(r.ok).toBe(false);
    expect(r.ok === false && Object.keys(r.fieldErrors ?? {})).toEqual(expect.arrayContaining(['smsConsent', 'email', 'phone']));
  });

  it('a filled honeypot looks accepted but saves and sends nothing', async () => {
    const { submitLead } = await import('@/lib/leads/submit');
    expect(await submitLead(valid({ email: 'bot@example.com', website: 'http://spam' }), meta('203.0.113.3'))).toEqual({ ok: true });
    expect(await leads().findOne({ email: 'bot@example.com' })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps the lead when Formspree fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 500 })));
    const { submitLead } = await import('@/lib/leads/submit');
    expect(await submitLead(valid({ email: 'kept@example.com' }), meta('203.0.113.4'))).toEqual({ ok: true });
    expect(await leads().findOne({ email: 'kept@example.com' })).toMatchObject({ forwardStatus: 'failed', forwardError: 'Formspree HTTP 500' });
  });

  it('validation errors do not use up the rate limit', async () => {
    const { submitLead } = await import('@/lib/leads/submit');
    for (let i = 0; i < 6; i++) expect((await submitLead(valid({ email: 'typo' }), meta('203.0.113.20'))).ok).toBe(false);
    expect(await submitLead(valid({ email: 'fixed@example.com' }), meta('203.0.113.20'))).toEqual({ ok: true });
  });

  it('rate-limits per IP', async () => {
    const { submitLead } = await import('@/lib/leads/submit');
    let last: unknown;
    for (let i = 0; i < 6; i++) last = await submitLead(valid({ email: `r${i}@example.com` }), meta('203.0.113.9'));
    expect(last).toMatchObject({ ok: false, error: expect.stringMatching(/Too many/) });
  });
});
