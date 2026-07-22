const Blog = require('../models/Blog');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { uniqueSlug } = require('../utils/slugify');
const estimateReadingTime = require('../utils/readingTime');
const blogService = require('../services/blogService');

function buildBlogPayload(body) {
  return {
    title: body.title,
    shortDescription: body.shortDescription,
    content: body.content,
    featuredImage: body.featuredImage,
    imageAltText: body.imageAltText,
    imageCaption: body.imageCaption,
    galleryImages: body.galleryImages || [],
    category: body.category,
    tags: body.tags || [],
    featured: !!body.featured,
    pinned: !!body.pinned,
    seo: {
      metaTitle: body.metaTitle,
      metaDescription: body.metaDescription,
      keywords: Array.isArray(body.keywords) ? body.keywords : (body.keywords || '').split(',').map((k) => k.trim()).filter(Boolean),
      canonicalUrl: body.canonicalUrl,
      ogImage: body.ogImage,
      schemaJson: body.schemaJson,
    },
  };
}

// GET /api/blogs
const getBlogs = catchAsync(async (req, res) => {
  const result = await blogService.listBlogs(req.query);
  res.status(200).json({ status: 'success', ...result });
});

// GET /api/blog/:id
const getBlog = catchAsync(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id)
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .populate('author', 'name email');
  if (!blog) return next(new ApiError(404, 'Blog not found.'));
  res.status(200).json({ status: 'success', data: { blog } });
});

// POST /api/blog
const createBlog = catchAsync(async (req, res, next) => {
  const payload = buildBlogPayload(req.body);
  if (!payload.title) return next(new ApiError(400, 'Title is required.'));

  payload.slug = req.body.slug ? await uniqueSlug(Blog, req.body.slug) : await uniqueSlug(Blog, payload.title);
  payload.author = req.user._id;
  payload.readingTime = estimateReadingTime(payload.content);

  const action = req.body.action || 'draft'; // draft | publish | schedule
  if (action === 'publish') {
    payload.status = 'published';
    payload.publishedAt = new Date();
  } else if (action === 'schedule') {
    if (!req.body.scheduledAt) return next(new ApiError(400, 'scheduledAt is required to schedule a post.'));
    payload.status = 'scheduled';
    payload.scheduledAt = new Date(req.body.scheduledAt);
  } else {
    payload.status = 'draft';
  }

  const blog = await Blog.create(payload);
  res.status(201).json({ status: 'success', data: { blog } });
});

// PUT /api/blog/:id
const updateBlog = catchAsync(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return next(new ApiError(404, 'Blog not found.'));

  const payload = buildBlogPayload(req.body);
  if (req.body.title && req.body.title !== blog.title) {
    payload.slug = await uniqueSlug(Blog, req.body.slug || req.body.title, blog._id);
  }
  payload.readingTime = estimateReadingTime(payload.content || blog.content);

  const action = req.body.action;
  if (action === 'publish') {
    payload.status = 'published';
    payload.publishedAt = blog.publishedAt || new Date();
  } else if (action === 'unpublish') {
    payload.status = 'draft';
  } else if (action === 'schedule') {
    if (!req.body.scheduledAt) return next(new ApiError(400, 'scheduledAt is required to schedule a post.'));
    payload.status = 'scheduled';
    payload.scheduledAt = new Date(req.body.scheduledAt);
  } else if (action === 'draft') {
    payload.status = 'draft';
  }

  Object.assign(blog, payload);
  await blog.save();

  res.status(200).json({ status: 'success', data: { blog } });
});

// DELETE /api/blog/:id (soft delete)
const deleteBlog = catchAsync(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return next(new ApiError(404, 'Blog not found.'));

  blog.isDeleted = true;
  blog.deletedAt = new Date();
  await blog.save();

  res.status(200).json({ status: 'success', message: 'Blog moved to trash.' });
});

// DELETE /api/blog/:id/permanent
const permanentlyDeleteBlog = catchAsync(async (req, res, next) => {
  const blog = await Blog.findOneAndDelete({ _id: req.params.id }).setOptions({ includeDeleted: true });
  if (!blog) return next(new ApiError(404, 'Blog not found.'));
  res.status(200).json({ status: 'success', message: 'Blog permanently deleted.' });
});

// PATCH /api/blog/:id/restore
const restoreBlog = catchAsync(async (req, res, next) => {
  const blog = await Blog.findOneAndUpdate(
    { _id: req.params.id },
    { isDeleted: false, deletedAt: null },
    { new: true }
  ).setOptions({ includeDeleted: true });
  if (!blog) return next(new ApiError(404, 'Blog not found.'));
  res.status(200).json({ status: 'success', data: { blog } });
});

// GET /api/blogs/trash
const getTrash = catchAsync(async (req, res) => {
  const blogs = await Blog.find({ isDeleted: true })
    .setOptions({ includeDeleted: true })
    .populate('author', 'name')
    .sort({ deletedAt: -1 });
  res.status(200).json({ status: 'success', data: { blogs } });
});

// POST /api/blog/:id/duplicate
const duplicateBlog = catchAsync(async (req, res, next) => {
  const original = await Blog.findById(req.params.id).lean();
  if (!original) return next(new ApiError(404, 'Blog not found.'));

  delete original._id;
  delete original.createdAt;
  delete original.updatedAt;
  original.title = `${original.title} (Copy)`;
  original.slug = await uniqueSlug(Blog, original.title);
  original.status = 'draft';
  original.publishedAt = null;
  original.scheduledAt = null;
  original.views = 0;
  original.author = req.user._id;

  const duplicate = await Blog.create(original);
  res.status(201).json({ status: 'success', data: { blog: duplicate } });
});

// PATCH /api/blog/:id/pin
const togglePin = catchAsync(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return next(new ApiError(404, 'Blog not found.'));
  blog.pinned = !blog.pinned;
  await blog.save();
  res.status(200).json({ status: 'success', data: { blog } });
});

const BULK_ACTIONS = {
  publish: { status: 'published', publishedAt: new Date() },
  unpublish: { status: 'draft' },
  draft: { status: 'draft' },
  trash: { isDeleted: true, deletedAt: new Date() },
  restore: { isDeleted: false, deletedAt: null },
};

// POST /api/blogs/bulk { ids: [...], action: 'publish'|'unpublish'|'draft'|'trash'|'restore'|'delete' }
const bulkAction = catchAsync(async (req, res, next) => {
  const { ids, action } = req.body;
  if (!Array.isArray(ids) || !ids.length) return next(new ApiError(400, 'ids must be a non-empty array.'));

  if (action === 'delete') {
    if (req.user.role !== 'admin') return next(new ApiError(403, 'Only admins can permanently delete blogs.'));
    const result = await Blog.deleteMany({ _id: { $in: ids } }).setOptions({ includeDeleted: true });
    return res.status(200).json({ status: 'success', message: `${result.deletedCount} blog(s) permanently deleted.` });
  }

  const update = BULK_ACTIONS[action];
  if (!update) return next(new ApiError(400, `Unknown bulk action: ${action}`));

  const result = await Blog.updateMany({ _id: { $in: ids } }, update).setOptions({ includeDeleted: true });
  res.status(200).json({ status: 'success', message: `${result.modifiedCount} blog(s) updated.` });
});

module.exports = {
  getBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  permanentlyDeleteBlog,
  restoreBlog,
  getTrash,
  duplicateBlog,
  togglePin,
  bulkAction,
};
