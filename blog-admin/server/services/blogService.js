const Blog = require('../models/Blog');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const Comment = require('../models/Comment');

const ALLOWED_SORTS = {
  recent: { createdAt: -1 },
  popular: { views: -1 },
  title_asc: { title: 1 },
  title_desc: { title: -1 },
};

// Builds a Mongo filter + sort from query-string style filters and returns
// paginated results alongside the total count, shared by the JSON API and
// the server-rendered admin blog list page.
async function listBlogs(filters = {}) {
  const {
    search,
    category,
    tag,
    author,
    status,
    featured,
    from,
    to,
    sort = 'recent',
    page = 1,
    limit = 10,
  } = filters;

  const query = {};

  if (search) query.$text = { $search: search };
  if (category) query.category = category;
  if (tag) query.tags = tag;
  if (author) query.author = author;
  if (status) query.status = status;
  if (featured !== undefined && featured !== '') query.featured = featured === 'true' || featured === true;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = [10, 25, 50, 100].includes(parseInt(limit, 10)) ? parseInt(limit, 10) : 10;
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Blog.find(query)
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .populate('author', 'name email')
      .sort(ALLOWED_SORTS[sort] || ALLOWED_SORTS.recent)
      .skip(skip)
      .limit(limitNum),
    Blog.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    },
  };
}

// Aggregates the numbers shown on the dashboard home page.
async function getDashboardStats() {
  const [totalBlogs, published, drafts, scheduled, categories, recentPosts, latestComments] = await Promise.all([
    Blog.countDocuments({}),
    Blog.countDocuments({ status: 'published' }),
    Blog.countDocuments({ status: 'draft' }),
    Blog.countDocuments({ status: 'scheduled' }),
    Category.countDocuments({}),
    Blog.find({}).sort({ createdAt: -1 }).limit(5).populate('author', 'name').populate('category', 'name'),
    Comment.find({}).sort({ createdAt: -1 }).limit(5).populate('blog', 'title slug'),
  ]);

  return {
    totalBlogs,
    published,
    drafts,
    scheduled,
    categories,
    recentPosts,
    latestComments,
    visitors: null, // placeholder — wire up to real analytics later
  };
}

module.exports = { listBlogs, getDashboardStats };
