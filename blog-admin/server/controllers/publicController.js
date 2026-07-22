const Blog = require('../models/Blog');
const Category = require('../models/Category');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

const publishedFilter = { status: 'published' };

// ---------------------------------------------------------------------------
// Public JSON feed — unauthenticated, read-only, published-only. This is what
// external sites (e.g. the embtel-final marketing site) call via fetch() to
// display blog content without touching the admin API or its auth. This app
// has no public-facing blog UI of its own — that lives on the marketing site.
// ---------------------------------------------------------------------------

function toPublicShape(b) {
  return {
    title: b.title,
    slug: b.slug,
    shortDescription: b.shortDescription,
    content: b.content,
    featuredImage: b.featuredImage,
    imageAltText: b.imageAltText,
    imageCaption: b.imageCaption,
    galleryImages: b.galleryImages,
    category: b.category ? { name: b.category.name, slug: b.category.slug } : null,
    tags: (b.tags || []).map((t) => ({ name: t.name, slug: t.slug })),
    author: b.author ? { name: b.author.name } : null,
    readingTime: b.readingTime,
    featured: b.featured,
    publishedAt: b.publishedAt,
    seo: b.seo,
  };
}

// GET /api/public/blogs?search=&category=&tag=&page=&limit=
const getPublicBlogs = catchAsync(async (req, res) => {
  const { search, category, tag, page = 1, limit = 9 } = req.query;
  const query = { ...publishedFilter };

  if (search) query.$text = { $search: search };
  if (category) query.category = category;
  if (tag) query.tags = tag;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 9));

  const [items, total] = await Promise.all([
    Blog.find(query)
      .sort({ pinned: -1, publishedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .populate('author', 'name'),
    Blog.countDocuments(query),
  ]);

  res.status(200).json({
    status: 'success',
    data: { blogs: items.map(toPublicShape) },
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.max(1, Math.ceil(total / limitNum)) },
  });
});

// GET /api/public/blog/:slug
const getPublicBlogBySlug = catchAsync(async (req, res, next) => {
  const blog = await Blog.findOne({ slug: req.params.slug, status: 'published' })
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .populate('author', 'name');

  if (!blog) return next(new ApiError(404, 'Blog not found.'));

  blog.views += 1;
  await blog.save();

  const related = await Blog.find({ status: 'published', category: blog.category, _id: { $ne: blog._id } })
    .limit(3)
    .select('title slug featuredImage shortDescription');

  res.status(200).json({ status: 'success', data: { blog: toPublicShape(blog), related } });
});

// GET /api/public/categories
const getPublicCategories = catchAsync(async (req, res) => {
  const categories = await Category.find({}).sort({ name: 1 }).select('name slug description image');
  res.status(200).json({ status: 'success', data: { categories } });
});

module.exports = { getPublicBlogs, getPublicBlogBySlug, getPublicCategories };
