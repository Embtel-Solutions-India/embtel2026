const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, publicUrlFor } = require('../config/s3');
const Media = require('../models/Media');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const env = require('../config/env');

const COMPRESSIBLE = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const S3_PREFIX = 'media';

// GET /api/media?search=&folder=&page=&limit=
const getMedia = catchAsync(async (req, res) => {
  const { search, folder, page = 1, limit = 30 } = req.query;
  const query = {};
  if (folder) query.folder = folder;
  if (search) query.$text = { $search: search };

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = parseInt(limit, 10) || 30;

  const [items, total, folders] = await Promise.all([
    Media.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    Media.countDocuments(query),
    Media.distinct('folder'),
  ]);

  res.status(200).json({
    status: 'success',
    data: { media: items, folders },
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.max(1, Math.ceil(total / limitNum)) },
  });
});

// POST /api/media/upload (multipart, field name "file"; multer buffers it in memory)
const uploadMedia = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new ApiError(400, 'No file uploaded.'));
  if (!env.s3.bucket) return next(new ApiError(500, 'Media storage is not configured (missing AWS_S3_BUCKET).'));

  const { originalname, mimetype, buffer: originalBuffer } = req.file;
  let buffer = originalBuffer;
  let width;
  let height;

  // Compress raster images before upload to keep S3 storage/bandwidth lean; SVGs pass through untouched.
  if (COMPRESSIBLE.has(mimetype)) {
    try {
      const image = sharp(originalBuffer);
      const metadata = await image.metadata();
      width = metadata.width;
      height = metadata.height;
      buffer = await image.resize({ width: Math.min(metadata.width || 1920, 1920), withoutEnlargement: true }).toBuffer();
    } catch (err) {
      // If sharp fails on a given file, upload the original rather than failing the request.
    }
  }

  const ext = path.extname(originalname).toLowerCase();
  const key = `${S3_PREFIX}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    })
  );

  const media = await Media.create({
    filename: key,
    originalName: originalname,
    url: publicUrlFor(key),
    mimeType: mimetype,
    size: buffer.length,
    folder: req.body.folder || 'general',
    width,
    height,
    uploadedBy: req.user._id,
  });

  res.status(201).json({ status: 'success', data: { media } });
});

// PATCH /api/media/:id/rename
const renameMedia = catchAsync(async (req, res, next) => {
  const media = await Media.findById(req.params.id);
  if (!media) return next(new ApiError(404, 'Media not found.'));
  if (!req.body.originalName) return next(new ApiError(400, 'originalName is required.'));
  media.originalName = req.body.originalName;
  await media.save();
  res.status(200).json({ status: 'success', data: { media } });
});

// DELETE /api/media/:id
const deleteMedia = catchAsync(async (req, res, next) => {
  const media = await Media.findById(req.params.id);
  if (!media) return next(new ApiError(404, 'Media not found.'));

  await s3Client.send(new DeleteObjectCommand({ Bucket: env.s3.bucket, Key: media.filename })).catch(() => {});
  await media.deleteOne();

  res.status(200).json({ status: 'success', message: 'Media deleted.' });
});

module.exports = { getMedia, uploadMedia, renameMedia, deleteMedia };
