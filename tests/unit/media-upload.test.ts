import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { startMemoryMongo } from '../helpers/mongo';

const puts: { key: string; type: string; size: number }[] = [];
const deletes: string[] = [];
vi.mock('@/lib/media/storage', () => ({
  putObject: async (key: string, body: Buffer, type: string) => void puts.push({ key, type, size: body.length }),
  deleteObject: async (key: string) => void deletes.push(key),
  publicUrl: (key: string) => `https://media.example-cdn.test/${key}`,
}));

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const oid = () => new mongoose.Types.ObjectId().toHexString();
const admin = { _id: oid(), role: 'admin' } as never;
const writer = { _id: oid(), role: 'marketing' } as never;
const other = { _id: oid(), role: 'marketing' } as never;
const png = () => sharp({ create: { width: 3000, height: 1500, channels: 3, background: '#1a6bff' } }).png().toBuffer();

beforeAll(async () => {
  mongo = await startMemoryMongo();
  const { connectDB } = await import('@/lib/db/connect');
  await connectDB(mongo.uri);
});
afterAll(async () => mongo?.stop());
beforeEach(() => {
  puts.length = 0;
  deletes.length = 0;
});

describe('processUpload', () => {
  it('re-encodes a real image to WebP (max 2400 px) and records it', async () => {
    const { processUpload } = await import('@/lib/media/upload');
    const row = await processUpload({ name: 'Hero Shot.png', bytes: await png() }, writer);
    expect(puts).toHaveLength(1);
    expect(puts[0].type).toBe('image/webp');
    expect(puts[0].key).toMatch(/^media\/\d{4}\/\d{2}\/[0-9a-f]{16}\.webp$/);
    expect(row).toMatchObject({ name: 'Hero Shot.png', width: 2400, height: 1200, url: `https://media.example-cdn.test/${puts[0].key}` });
  });

  it('refuses files that only pretend to be images', async () => {
    const { processUpload } = await import('@/lib/media/upload');
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>');
    const html = Buffer.from('<!doctype html><script>alert(1)</script>');
    await expect(processUpload({ name: 'x.png', bytes: svg }, writer)).rejects.toThrow(/Only JPEG, PNG, WebP, GIF or AVIF/);
    await expect(processUpload({ name: 'x.png', bytes: html }, writer)).rejects.toThrow(/Only JPEG, PNG, WebP, GIF or AVIF/);
    expect(puts).toEqual([]);
  });

  it('refuses empty and oversized files', async () => {
    const { processUpload } = await import('@/lib/media/upload');
    await expect(processUpload({ name: 'e.png', bytes: Buffer.alloc(0) }, writer)).rejects.toThrow(/empty/i);
    const big = Buffer.concat([await png(), Buffer.alloc(6 * 1024 * 1024)]);
    await expect(processUpload({ name: 'big.png', bytes: big }, writer)).rejects.toThrow(/5 MB/);
    expect(puts).toEqual([]);
  });

  it('refuses a truncated image with the right magic bytes', async () => {
    const { processUpload } = await import('@/lib/media/upload');
    const broken = (await png()).subarray(0, 40);
    await expect(processUpload({ name: 'broken.png', bytes: broken }, writer)).rejects.toThrow(/couldn.t read/i);
  });
});

describe('ownership', () => {
  it('marketing can rename and delete only their own uploads; admin can delete any', async () => {
    const { processUpload, updateMedia, deleteMedia } = await import('@/lib/media/upload');
    const mine = await processUpload({ name: 'mine.png', bytes: await png() }, writer);
    const theirs = await processUpload({ name: 'theirs.png', bytes: await png() }, other);
    await updateMedia({ id: mine.id, name: 'Renamed', alt: 'A blue square' }, writer);
    await expect(updateMedia({ id: theirs.id, name: 'Nope', alt: '' }, writer)).rejects.toThrow(/your own/);
    await expect(deleteMedia(theirs.id, writer)).rejects.toThrow(/your own/);
    deletes.length = 0;
    await deleteMedia(theirs.id, admin);
    expect(deletes).toHaveLength(1);
    expect(deletes[0]).toMatch(/^media\//);
    const { listMedia } = await import('@/lib/media/upload');
    const list = await listMedia({ q: 'renamed' });
    expect(list.items.map((m) => m.alt)).toEqual(['A blue square']);
  });
});
