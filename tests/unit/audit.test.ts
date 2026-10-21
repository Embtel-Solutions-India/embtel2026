import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const rnd = (n = 24) => crypto.randomBytes(n).toString('hex');
Object.assign(process.env, {
  SESSION_SECRET: rnd(32),
  SITE_URL: 'https://example.com',
  MONGODB_URI: 'mongodb://placeholder',
  ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64'),
  AWS_S3_BUCKET: 'b',
  AWS_REGION: 'r',
  AWS_ACCESS_KEY_ID: rnd(8),
  AWS_SECRET_ACCESS_KEY: rnd(8),
});

import { audit } from '@/lib/audit';
import { connectDB } from '@/lib/db/connect';
import { AuditLog } from '@/lib/db/models/AuditLog';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
beforeAll(async () => {
  mongo = await startMemoryMongo();
  await connectDB(mongo.uri);
}, 300_000);
afterAll(async () => {
  await mongo?.stop();
});

const actorId = () => String(new Types.ObjectId());

describe('audit', () => {
  it('saves an entry with a timestamp', async () => {
    const a = actorId();
    await audit({ actorId: a, action: 'blog.publish', target: { type: 'blog', id: 'p1' } });
    const doc = await AuditLog.findOne({ actorId: a }).lean();
    expect(doc?.action).toBe('blog.publish');
    expect(doc?.target).toEqual({ type: 'blog', id: 'p1' });
    expect(doc?.meta).toEqual({});
    expect(doc?.createdAt).toBeInstanceOf(Date);
  });

  it('scrubs sensitive keys', async () => {
    const a = actorId();
    await audit({ actorId: a, action: 'x', target: { type: 't' }, meta: { apiToken: 'x', title: 'Hi' } });
    expect((await AuditLog.findOne({ actorId: a }).lean())?.meta).toEqual({ title: 'Hi' });
  });

  it('scrubs recursively without mutating the input', async () => {
    const a = actorId();
    const meta = { a: { apiKey: 'x', ok: 1 }, list: [{ token: 'y', n: 2 }] };
    await audit({ actorId: a, action: 'x', target: { type: 't' }, meta });
    expect((await AuditLog.findOne({ actorId: a }).lean())?.meta).toEqual({ a: { ok: 1 }, list: [{ n: 2 }] });
    expect(meta).toEqual({ a: { apiKey: 'x', ok: 1 }, list: [{ token: 'y', n: 2 }] });
  });

  it('handles cyclic meta', async () => {
    const a = actorId();
    const meta: Record<string, unknown> = { title: 'Hi' };
    meta.self = meta;
    await audit({ actorId: a, action: 'x', target: { type: 't' }, meta });
    expect((await AuditLog.findOne({ actorId: a }).lean())?.meta).toEqual({ title: 'Hi', self: '[Circular]' });
  });

  it('swallows write failures and logs only the message', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const create = vi.spyOn(AuditLog, 'create').mockRejectedValueOnce(new Error('boom') as never);
    await expect(
      audit({ actorId: actorId(), action: 'x', target: { type: 't' }, meta: { title: 'Hi' } }),
    ).resolves.toBeUndefined();
    expect(err).toHaveBeenCalledWith('[audit] write failed:', 'boom');
    create.mockRestore();
    err.mockRestore();
  });
});
