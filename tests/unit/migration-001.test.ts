import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectDB } from '@/lib/db/connect';
import { runMigration001 } from '@/lib/db/migrations/001-roles-and-authors';
import { toSlug } from '@/lib/slug';
import { startMemoryMongo } from '../helpers/mongo';

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
beforeAll(async () => {
  mongo = await startMemoryMongo();
  await connectDB(mongo.uri);
}, 300_000);
afterAll(async () => {
  await mongo?.stop();
});

describe('toSlug', () => {
  it('lowercases, strips accents and symbols', () => {
    expect(toSlug('  Alex  Kim ')).toBe('alex-kim');
    expect(toSlug("Zoë O'Brien!")).toBe('zoe-obrien');
    expect(toSlug('★★★')).toBe('');
  });
});

describe('migration 001', () => {
  it('maps editor to marketing, adds unique slugs, is idempotent', async () => {
    const users = mongoose.connection.collection('users');
    await users.insertMany([
      { name: 'Alex Kim', email: 'a1@example.com', role: 'editor' },
      { name: 'Alex Kim', email: 'a2@example.com', role: 'admin' },
      { name: '***', email: 'a3@example.com', role: 'admin', slug: 'user' },
      { name: '!!!', email: 'a4@example.com', role: 'admin' },
    ]);

    expect(await runMigration001(mongoose.connection)).toEqual({ rolesUpdated: 1, slugsAdded: 3 });

    const rows = await users.find().sort({ email: 1 }).toArray();
    expect(rows.map((r) => r.role)).toEqual(['marketing', 'admin', 'admin', 'admin']);
    expect(rows.map((r) => r.slug)).toEqual(['alex-kim', 'alex-kim-2', 'user', 'user-2']);

    expect(await runMigration001(mongoose.connection)).toEqual({ rolesUpdated: 0, slugsAdded: 0 });
  });
});
