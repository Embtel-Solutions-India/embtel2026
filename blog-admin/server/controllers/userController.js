const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

// GET /api/users (admin only)
const getUsers = catchAsync(async (req, res) => {
  const users = await User.find({});
  res.status(200).json({ status: 'success', data: { users: users.map((u) => u.toSafeJSON()) } });
});

// POST /api/users (admin only)
const createUser = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return next(new ApiError(400, 'name, email and password are required.'));

  const user = await User.create({ name, email, password, role: role === 'admin' ? 'admin' : 'editor' });
  res.status(201).json({ status: 'success', data: { user: user.toSafeJSON() } });
});

// PATCH /api/users/:id (admin only) — update role/active state
const updateUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ApiError(404, 'User not found.'));

  if (req.body.role) user.role = req.body.role === 'admin' ? 'admin' : 'editor';
  if (req.body.active !== undefined) user.active = !!req.body.active;
  if (req.body.name) user.name = req.body.name;

  await user.save({ validateBeforeSave: false });
  res.status(200).json({ status: 'success', data: { user: user.toSafeJSON() } });
});

// PATCH /api/users/me/password — current user changes their own password
const updateMyPassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword || ''))) {
    return next(new ApiError(401, 'Current password is incorrect.'));
  }
  if (!req.body.newPassword || req.body.newPassword.length < 8) {
    return next(new ApiError(400, 'New password must be at least 8 characters.'));
  }
  user.password = req.body.newPassword;
  await user.save();
  res.status(200).json({ status: 'success', message: 'Password updated. Please log in again.' });
});

module.exports = { getUsers, createUser, updateUser, updateMyPassword };
