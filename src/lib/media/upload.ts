import crypto from 'node:crypto';
import { isValidObjectId } from 'mongoose';
import sharp, { type OutputInfo } from 'sharp';
import { audit } from '@/lib/audit';
import { connectDB } from '@/lib/db/connect';
import { Media } from '@/lib/db/models/Media';
import type { UserDoc } from '@/lib/db/models/User';
import { UserFacingError } from '@/lib/admin/action';
import { deleteObject, publicUrl, putObject } from './storage';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 2400;
const PER_PAGE = 40;
type Raw = Record<string, unknown>;

// Decide by content, never by file name or browser-supplied type. SVG/HTML and everything else fail here.
export function sniffImage(b: Buffer): 'jpeg' | 'png' | 'gif' | 'webp' | 'avif' | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length >= 6 && /^GIF8[79]a$/.test(b.subarray(0, 6).toString('latin1'))) return 'gif';
  if (b.length >= 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (b.length >= 12 && b.subarray(4, 8).toString('latin1') === 'ftyp' && /^avi[fs]$/.test(b.subarray(8, 12).toString('latin1'))) return 'avif';
  return null;
}

export type MediaRow = { id: string; url: string; name: string; alt: string; width: number; height: number; size: number; uploadedBy: string; createdAt: string };

const toRow = (d: Raw): MediaRow => ({
  id: String(d._id),
  url: String(d.url),
  name: String(d.originalName ?? ''),
  alt: String(d.alt ?? ''),
  width: Number(d.width ?? 0),
  height: Number(d.height ?? 0),
  size: Number(d.size ?? 0),
  uploadedBy: d.uploadedBy ? String(d.uploadedBy) : '',
  createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : '',
});

export async function processUpload(file: { name: string; bytes: Buffer }, user: UserDoc): Promise<MediaRow> {
  if (file.bytes.length === 0) throw new UserFacingError('That file is empty.');
  if (file.bytes.length > MAX_UPLOAD_BYTES) throw new UserFacingError('Images must be 5 MB or smaller.');
  if (!sniffImage(file.bytes)) throw new UserFacingError('Only JPEG, PNG, WebP, GIF or AVIF images are allowed.');

  // Re-encode: strips metadata (EXIF/GPS) and anything smuggled after the image data.
  let out: { data: Buffer; info: OutputInfo };
  try {
    out = await sharp(file.bytes, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new UserFacingError('We couldn’t read that image. Try exporting it again as JPEG or PNG.');
  }

  const now = new Date();
  const key = `media/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomBytes(8).toString('hex')}.webp`;
  await putObject(key, out.data, 'image/webp');
  await connectDB();
  const doc = await Media.create({
    filename: key,
    originalName: file.name.slice(0, 200) || 'image',
    url: publicUrl(key),
    mimeType: 'image/webp',
    size: out.data.length,
    width: out.info.width,
    height: out.info.height,
    uploadedBy: user._id,
  });
  await audit({ actorId: String(user._id), action: 'media.upload', target: { type: 'media', id: String(doc._id) }, meta: { key } });
  return toRow(doc.toObject() as Raw);
}

async function owned(id: string, user: UserDoc) {
  if (!isValidObjectId(id)) throw new UserFacingError('This image no longer exists.');
  await connectDB();
  const doc = await Media.findById(id);
  if (!doc) throw new UserFacingError('This image no longer exists.');
  if (user.role !== 'admin' && String(doc.uploadedBy) !== String(user._id)) throw new UserFacingError('You can only change your own uploads.');
  return doc;
}

export async function updateMedia(input: { id: string; name: string; alt: string }, user: UserDoc): Promise<void> {
  const doc = await owned(input.id, user);
  doc.set({ originalName: input.name, alt: input.alt });
  await doc.save();
  await audit({ actorId: String(user._id), action: 'media.update', target: { type: 'media', id: input.id } });
}

// ponytail: does not check whether posts still reference the image; a deleted image breaks those posts.
export async function deleteMedia(id: string, user: UserDoc): Promise<void> {
  const doc = await owned(id, user);
  await deleteObject(doc.filename);
  await doc.deleteOne();
  await audit({ actorId: String(user._id), action: 'media.delete', target: { type: 'media', id }, meta: { key: doc.filename } });
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function listMedia(opts: { q?: string; page?: number }): Promise<{ items: MediaRow[]; page: number; pages: number }> {
  await connectDB();
  const filter = opts.q?.trim() ? { originalName: { $regex: escapeRegex(opts.q.trim().slice(0, 100)), $options: 'i' } } : {};
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const [total, docs] = await Promise.all([
    Media.countDocuments(filter),
    Media.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PER_PAGE).limit(PER_PAGE).lean<Raw[]>(),
  ]);
  return { items: docs.map(toRow), page, pages: Math.ceil(total / PER_PAGE) };
}
