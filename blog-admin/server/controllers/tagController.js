const Tag = require('../models/Tag');
const Blog = require('../models/Blog');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { uniqueSlug } = require('../utils/slugify');

const getTags = catchAsync(async (req, res) => {
  const tags = await Tag.find({}).sort({ name: 1 });
  res.status(200).json({ status: 'success', data: { tags } });
});

const createTag = catchAsync(async (req, res, next) => {
  if (!req.body.name) return next(new ApiError(400, 'Tag name is required.'));
  const slug = await uniqueSlug(Tag, req.body.slug || req.body.name);
  const tag = await Tag.create({ name: req.body.name, slug });
  res.status(201).json({ status: 'success', data: { tag } });
});

const updateTag = catchAsync(async (req, res, next) => {
  const tag = await Tag.findById(req.params.id);
  if (!tag) return next(new ApiError(404, 'Tag not found.'));
  if (req.body.name && req.body.name !== tag.name) {
    tag.slug = await uniqueSlug(Tag, req.body.slug || req.body.name, tag._id);
    tag.name = req.body.name;
  }
  await tag.save();
  res.status(200).json({ status: 'success', data: { tag } });
});

const deleteTag = catchAsync(async (req, res, next) => {
  await Blog.updateMany({ tags: req.params.id }, { $pull: { tags: req.params.id } });
  const tag = await Tag.findByIdAndDelete(req.params.id);
  if (!tag) return next(new ApiError(404, 'Tag not found.'));
  res.status(200).json({ status: 'success', message: 'Tag deleted.' });
});

module.exports = { getTags, createTag, updateTag, deleteTag };
