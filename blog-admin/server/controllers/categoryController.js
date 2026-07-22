const Category = require('../models/Category');
const Blog = require('../models/Blog');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { uniqueSlug } = require('../utils/slugify');

const getCategories = catchAsync(async (req, res) => {
  const categories = await Category.find({}).sort({ name: 1 });
  const counts = await Blog.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));

  const data = categories.map((c) => ({ ...c.toObject(), blogCount: countMap[String(c._id)] || 0 }));
  res.status(200).json({ status: 'success', data: { categories: data } });
});

const getCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category) return next(new ApiError(404, 'Category not found.'));
  res.status(200).json({ status: 'success', data: { category } });
});

const createCategory = catchAsync(async (req, res, next) => {
  if (!req.body.name) return next(new ApiError(400, 'Category name is required.'));
  const slug = await uniqueSlug(Category, req.body.slug || req.body.name);
  const category = await Category.create({
    name: req.body.name,
    slug,
    description: req.body.description,
    image: req.body.image,
    seo: { metaTitle: req.body.metaTitle, metaDescription: req.body.metaDescription },
  });
  res.status(201).json({ status: 'success', data: { category } });
});

const updateCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category) return next(new ApiError(404, 'Category not found.'));

  if (req.body.name && req.body.name !== category.name) {
    category.slug = await uniqueSlug(Category, req.body.slug || req.body.name, category._id);
    category.name = req.body.name;
  }
  if (req.body.description !== undefined) category.description = req.body.description;
  if (req.body.image !== undefined) category.image = req.body.image;
  if (req.body.metaTitle !== undefined) category.seo.metaTitle = req.body.metaTitle;
  if (req.body.metaDescription !== undefined) category.seo.metaDescription = req.body.metaDescription;

  await category.save();
  res.status(200).json({ status: 'success', data: { category } });
});

const deleteCategory = catchAsync(async (req, res, next) => {
  const inUse = await Blog.countDocuments({ category: req.params.id });
  if (inUse > 0) {
    return next(new ApiError(409, `Cannot delete: ${inUse} blog(s) use this category.`));
  }
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) return next(new ApiError(404, 'Category not found.'));
  res.status(200).json({ status: 'success', message: 'Category deleted.' });
});

module.exports = { getCategories, getCategory, createCategory, updateCategory, deleteCategory };
