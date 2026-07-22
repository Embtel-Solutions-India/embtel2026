const path = require('path');
const fs = require('fs/promises');
const sharp = require('sharp');
const Media = require('../models/Media');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'media');
const PUBLIC_PATH = '/uploads/media';
const COMPRESSIBLE = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

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

// POST /api/media/upload (multipart, field name "file"; multer already ran)
const uploadMedia = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new ApiError(400, 'No file uploaded.'));

  const { filename, originalname, mimetype, size, path: filePath } = req.file;
  let width;
  let height;

  // Compress raster images in place to keep the upload dir lean; SVGs pass through untouched.
  if (COMPRESSIBLE.has(mimetype)) {
    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();
      width = metadata.width;
      height = metadata.height;

      const compressed = await image
        .resize({ width: Math.min(metadata.width || 1920, 1920), withoutEnlargement: true })
        .toBuffer();
      await fs.writeFile(filePath, compressed);
    } catch (err) {
      // If sharp fails on a given file, keep the original upload rather than failing the request.
    }
  }

  const media = await Media.create({
    filename,
    originalName: originalname,
    url: `${PUBLIC_PATH}/${filename}`,
    mimeType: mimetype,
    size,
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

  const filePath = path.join(UPLOAD_DIR, media.filename);
  await fs.unlink(filePath).catch(() => {});
  await media.deleteOne();

  res.status(200).json({ status: 'success', message: 'Media deleted.' });
});

module.exports = { getMedia, uploadMedia, renameMedia, deleteMedia };
