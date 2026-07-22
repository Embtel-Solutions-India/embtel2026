const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const sendEmail = require('../utils/email');

const REMEMBER_ME_DAYS = 30;

function signToken(userId, rememberMe) {
  return jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: rememberMe ? `${REMEMBER_ME_DAYS}d` : env.jwtExpiresIn });
}

function sendTokenCookie(user, statusCode, req, res, rememberMe = false) {
  const token = signToken(user._id, rememberMe);
  const days = rememberMe ? REMEMBER_ME_DAYS : env.jwtCookieExpiresDays;

  res.cookie('token', token, {
    expires: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    sameSite: 'lax',
  });

  const isApi = req.originalUrl.startsWith('/api/');
  if (isApi) {
    return res.status(statusCode).json({ status: 'success', token, data: { user: user.toSafeJSON() } });
  }
  return res.status(statusCode).json({ status: 'success', redirect: '/admin/dashboard' });
}

// POST /api/login
const login = catchAsync(async (req, res, next) => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password) return next(new ApiError(400, 'Please provide email and password.'));

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return next(new ApiError(401, 'Incorrect email or password.'));
  }
  if (!user.active) return next(new ApiError(403, 'This account has been deactivated.'));

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenCookie(user, 200, req, res, !!rememberMe);
});

// POST /api/logout
const logout = (req, res) => {
  res.cookie('token', 'loggedout', { expires: new Date(Date.now() + 5 * 1000), httpOnly: true });
  res.status(200).json({ status: 'success', redirect: '/admin/login' });
};

// GET /api/me
const getMe = catchAsync(async (req, res) => {
  res.status(200).json({ status: 'success', data: { user: req.user.toSafeJSON() } });
});

// POST /api/forgot-password
const forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase() });

  // Always respond 200 regardless of whether the email exists, to avoid leaking
  // which addresses are registered.
  if (!user) {
    return res.status(200).json({
      status: 'success',
      message: 'If an account exists for that email, a reset link has been sent.',
    });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${env.appUrl}/admin/reset-password/${resetToken}`;
  try {
    await sendEmail({
      to: user.email,
      subject: 'Password reset request',
      html: `<p>You requested a password reset. Click the link below (valid for ${env.resetTokenExpiresMinutes} minutes):</p>
             <p><a href="${resetUrl}">${resetUrl}</a></p>
             <p>If you did not request this, you can safely ignore this email.</p>`,
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ApiError(500, 'Failed to send the reset email. Please try again later.'));
  }

  res.status(200).json({ status: 'success', message: 'If an account exists for that email, a reset link has been sent.' });
});

// POST /api/reset-password/:token
const resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) return next(new ApiError(400, 'Token is invalid or has expired.'));
  if (!req.body.password || req.body.password.length < 8) {
    return next(new ApiError(400, 'Password must be at least 8 characters.'));
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  sendTokenCookie(user, 200, req, res);
});

module.exports = { login, logout, getMe, forgotPassword, resetPassword };
