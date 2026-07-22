const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

function isApiRequest(req) {
  return req.originalUrl.startsWith('/api/');
}

function respondUnauthenticated(req, res, next, message) {
  if (isApiRequest(req)) {
    return next(new ApiError(401, message));
  }
  res.redirect(`/admin/login?redirect=${encodeURIComponent(req.originalUrl)}`);
}

// Verifies the JWT (from httpOnly cookie or Authorization header), loads the
// current user, and rejects tokens issued before the user's last password change.
const protect = catchAsync(async (req, res, next) => {
  let token;
  if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return respondUnauthenticated(req, res, next, 'You are not logged in. Please log in to continue.');

  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, env.jwtSecret);
  } catch (err) {
    return respondUnauthenticated(req, res, next, 'Invalid or expired session. Please log in again.');
  }

  const currentUser = await User.findById(decoded.id);
  if (!currentUser || !currentUser.active) {
    return respondUnauthenticated(req, res, next, 'This account no longer exists or is deactivated.');
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return respondUnauthenticated(req, res, next, 'Password was changed recently. Please log in again.');
  }

  req.user = currentUser;
  res.locals.currentUser = currentUser;
  next();
});

// Populates req.user / res.locals.currentUser if a valid token is present,
// but never blocks the request. Used on public-facing pages.
const attachUserIfPresent = catchAsync(async (req, res, next) => {
  let token = req.cookies?.token;
  if (!token) return next();

  try {
    const decoded = await promisify(jwt.verify)(token, env.jwtSecret);
    const currentUser = await User.findById(decoded.id);
    if (currentUser && currentUser.active && !currentUser.changedPasswordAfter(decoded.iat)) {
      req.user = currentUser;
      res.locals.currentUser = currentUser;
    }
  } catch (err) {
    // ignore invalid token on public pages
  }
  next();
});

function restrictTo(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      if (isApiRequest(req)) {
        return next(new ApiError(403, 'You do not have permission to perform this action.'));
      }
      return next(new ApiError(403, 'You do not have permission to access this page.'));
    }
    next();
  };
}

module.exports = { protect, attachUserIfPresent, restrictTo };
