const Blog = require('../models/Blog');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

// All of these render EJS page shells; the pages themselves fetch list/detail
// data from the JSON /api/* endpoints via client/js/admin.js. View-only data
// that a form needs up front (dropdown options, the record being edited) is
// fetched here so the first paint is already correct.

const renderLogin = (req, res) => {
  if (req.cookies?.token) return res.redirect('/admin/dashboard');
  res.render('auth/login', { title: 'Log In', layout: false, redirect: req.query.redirect || '' });
};

const renderForgotPassword = (req, res) => {
  res.render('auth/forgot-password', { title: 'Forgot Password', layout: false });
};

const renderResetPassword = (req, res) => {
  res.render('auth/reset-password', { title: 'Reset Password', layout: false, token: req.params.token });
};

const renderDashboard = (req, res) => {
  res.render('dashboard/index', { title: 'Dashboard' });
};

const renderBlogList = (req, res) => {
  res.render('blogs/list', { title: 'Blogs' });
};

const renderTrash = (req, res) => {
  res.render('blogs/trash', { title: 'Trash' });
};

const renderBlogForm = catchAsync(async (req, res, next) => {
  const [categories, tags, authors] = await Promise.all([
    Category.find({}).sort({ name: 1 }),
    Tag.find({}).sort({ name: 1 }),
    User.find({ active: true }).select('name email'),
  ]);

  let blog = null;
  if (req.params.id) {
    blog = await Blog.findById(req.params.id).populate('category').populate('tags');
    if (!blog) return next(new ApiError(404, 'Blog not found.'));
  }

  res.render('blogs/form', { title: blog ? 'Edit Blog' : 'New Blog', categories, tags, authors, blog });
});

const renderCategories = (req, res) => {
  res.render('categories/list', { title: 'Categories' });
};

const renderTags = (req, res) => {
  res.render('tags/list', { title: 'Tags' });
};

const renderComments = (req, res) => {
  res.render('comments/list', { title: 'Comments' });
};

const renderMedia = (req, res) => {
  res.render('media/index', { title: 'Media Manager' });
};

const renderSettings = (req, res) => {
  res.render('settings/index', { title: 'Settings' });
};

const renderProfile = (req, res) => {
  res.render('dashboard/profile', { title: 'My Profile' });
};

const renderUsers = (req, res) => {
  res.render('dashboard/users', { title: 'Team Members' });
};

module.exports = {
  renderLogin,
  renderForgotPassword,
  renderResetPassword,
  renderDashboard,
  renderBlogList,
  renderTrash,
  renderBlogForm,
  renderCategories,
  renderTags,
  renderComments,
  renderMedia,
  renderSettings,
  renderProfile,
  renderUsers,
};
