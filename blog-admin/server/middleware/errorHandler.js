const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function isApiRequest(req) {
  return req.originalUrl.startsWith('/api/');
}

function handleCastError(err) {
  return new ApiError(400, `Invalid ${err.path}: ${err.value}`);
}

function handleDuplicateFieldError(err) {
  const field = Object.keys(err.keyValue || {})[0];
  return new ApiError(409, `Duplicate value for field "${field}": ${JSON.stringify(err.keyValue?.[field])}`);
}

function handleValidationError(err) {
  const errors = Object.values(err.errors).map((e) => e.message);
  return new ApiError(400, `Invalid input data: ${errors.join('. ')}`, errors);
}

function handleJWTError() {
  return new ApiError(401, 'Invalid session token. Please log in again.');
}

function handleJWTExpiredError() {
  return new ApiError(401, 'Your session has expired. Please log in again.');
}

// Centralized error handler: normalizes known Mongoose/JWT errors into ApiError,
// then responds as JSON for /api/* routes or renders an EJS error page otherwise.
module.exports = function errorHandler(err, req, res, next) {
  let error = err;
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  if (error.name === 'CastError') error = handleCastError(error);
  if (error.code === 11000) error = handleDuplicateFieldError(error);
  if (error.name === 'ValidationError') error = handleValidationError(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

  if (!env.isProd) {
    console.error(err);
  }

  if (isApiRequest(req)) {
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
      errors: error.errors || [],
      ...(env.isProd ? {} : { stack: err.stack }),
    });
  }

  return res.status(error.statusCode).render('errors/500', {
    title: 'Something went wrong',
    layout: false,
    statusCode: error.statusCode,
    message: error.isOperational ? error.message : 'An unexpected error occurred.',
  });
};
