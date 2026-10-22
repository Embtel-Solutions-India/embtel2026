import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const sent: { to: string; subject: string; text: string }[] = [];
const send = async (m: { to: string; subject: string; text: string; html: string }) => void sent.push(m);
const SITE = 'https://www.embtelsolutions.com';
const GENERIC = 'If that email belongs to an account, we’ve sent a link to reset the password. It expires in 30 minutes.';

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
  const { User } = await import('@/lib/db/models/User');
  const pw = () => new mongoose.Types.ObjectId().toHexString() + 'Aa';
  await User.create({ name: 'Mia Marketer', email: 'mia@example.com', password: pw(), role: 'marketing' });
  await User.create({ name: 'Gone', email: 'gone@example.com', password: pw(), role: 'marketing', active: false });
  await User.create({ name: 'Rae Limit', email: 'rae@example.com', password: pw(), role: 'marketing' });
});
afterAll(async () => mongo?.stop());
beforeEach(() => (sent.length = 0));

describe('requestPasswordReset', () => {
  it('emails a single-use 30-minute link that sets the password', async () => {
    const { requestPasswordReset } = await import('@/lib/auth/forgot');
    expect(await requestPasswordReset({ email: ' Mia@Example.com ' }, '10.0.0.1', { site: SITE, send })).toEqual({ ok: true, message: GENERIC });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('mia@example.com');
    const link = /https:\/\/www\.embtelsolutions\.com\/admin\/reset-password\/([0-9a-f]{64})/.exec(sent[0].text)?.[1];
    expect(link).toBeTruthy();
    const { resetPasswordWithToken } = await import('@/lib/auth/reset');
    const pw = 'a-brand-new-passphrase';
    expect(await resetPasswordWithToken({ token: link!, password: pw, confirm: pw }, '10.0.0.1')).toEqual({ ok: true });
  });

  it('gives the same answer and sends nothing for unknown or deactivated emails', async () => {
    const { requestPasswordReset } = await import('@/lib/auth/forgot');
    expect(await requestPasswordReset({ email: 'nobody@example.com' }, '10.0.0.2', { site: SITE, send })).toEqual({ ok: true, message: GENERIC });
    expect(await requestPasswordReset({ email: 'gone@example.com' }, '10.0.0.2', { site: SITE, send })).toEqual({ ok: true, message: GENERIC });
    expect(sent).toEqual([]);
  });

  it('refuses a malformed email and rate-limits per address and per email', async () => {
    const { requestPasswordReset } = await import('@/lib/auth/forgot');
    expect(await requestPasswordReset({ email: 'not-an-email' }, '10.0.0.3', { site: SITE, send })).toMatchObject({ ok: false });
    for (let i = 0; i < 3; i++) await requestPasswordReset({ email: 'rae@example.com' }, `10.0.1.${i}`, { site: SITE, send });
    expect(sent).toHaveLength(3);
    expect(await requestPasswordReset({ email: 'rae@example.com' }, '10.0.1.9', { site: SITE, send })).toMatchObject({ ok: false, message: expect.stringMatching(/Too many/) });
    expect(sent).toHaveLength(3);
  });

  it('never writes the token to the audit log', async () => {
    const { requestPasswordReset } = await import('@/lib/auth/forgot');
    await requestPasswordReset({ email: 'mia@example.com' }, '10.0.2.1', { site: SITE, send }).catch(() => {});
    const logs = JSON.stringify(await mongoose.connection.db!.collection('auditlogs').find().toArray());
    for (const m of sent) {
      const token = /reset-password\/([0-9a-f]{64})/.exec(m.text)?.[1] ?? 'none';
      expect(logs).not.toContain(token);
    }
  });
});

describe('sendMail', () => {
  it('reports "not configured" instead of failing when SMTP is unset', async () => {
    const { sendMail } = await import('@/lib/mail');
    const prev = process.env.SMTP_HOST;
    process.env.SMTP_HOST = '';
    expect(await sendMail({ to: 'x@example.com', subject: 's', text: 't', html: '<p>t</p>' })).toEqual({ sent: false, reason: 'not-configured' });
    process.env.SMTP_HOST = prev;
  });
});
