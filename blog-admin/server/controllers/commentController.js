const Comment = require('../models/Comment');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

// GET /api/comments?status=&search=&page=&limit=
const getComments = catchAsync(async (req, res) => {
  const { status, search, page = 1, limit = 25 } = req.query;
  const query = {};
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { content: new RegExp(search, 'i') },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = parseInt(limit, 10) || 25;

  const [items, total] = await Promise.all([
    Comment.find(query)
      .populate('blog', 'title slug')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Comment.countDocuments(query),
  ]);

  res.status(200).json({
    status: 'success',
    data: { comments: items },
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.max(1, Math.ceil(total / limitNum)) },
  });
});

// POST /api/comments (public — submitted from the blog frontend)
const createComment = catchAsync(async (req, res, next) => {
  const { blog, name, email, content, parent } = req.body;
  if (!blog || !name || !email || !content) {
    return next(new ApiError(400, 'blog, name, email and content are required.'));
  }
  const comment = await Comment.create({
    blog,
    name,
    email,
    content,
    parent: parent || null,
    ipAddress: req.ip,
    status: 'pending',
  });
  res.status(201).json({ status: 'success', data: { comment } });
});

const updateStatus = (status) =>
  catchAsync(async (req, res, next) => {
    const comment = await Comment.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!comment) return next(new ApiError(404, 'Comment not found.'));
    res.status(200).json({ status: 'success', data: { comment } });
  });

const replyToComment = catchAsync(async (req, res, next) => {
  const parentComment = await Comment.findById(req.params.id);
  if (!parentComment) return next(new ApiError(404, 'Comment not found.'));
  if (!req.body.content) return next(new ApiError(400, 'Reply content is required.'));

  const reply = await Comment.create({
    blog: parentComment.blog,
    name: req.user.name,
    email: req.user.email,
    content: req.body.content,
    parent: parentComment._id,
    status: 'approved',
  });
  res.status(201).json({ status: 'success', data: { comment: reply } });
});

const deleteComment = catchAsync(async (req, res, next) => {
  const comment = await Comment.findByIdAndDelete(req.params.id);
  if (!comment) return next(new ApiError(404, 'Comment not found.'));
  res.status(200).json({ status: 'success', message: 'Comment deleted.' });
});

module.exports = {
  getComments,
  createComment,
  approveComment: updateStatus('approved'),
  rejectComment: updateStatus('rejected'),
  markAsSpam: updateStatus('spam'),
  replyToComment,
  deleteComment,
};
